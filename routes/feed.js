const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

const ogCache = new Map();

function parseOgTags(html) {
    const head = html.slice(0, 8000);
    const get = (attr, name) => {
        const p1 = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']*?)["']`, 'i');
        const p2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+${attr}=["']${name}["']`, 'i');
        return (head.match(p1) || head.match(p2) || [])[1]?.trim() || '';
    };
    const titleM = head.match(/<title[^>]*>([^<]*)<\/title>/i);
    return {
        title: get('property', 'og:title') || titleM?.[1]?.trim() || '',
        image: get('property', 'og:image') || '',
        description: get('property', 'og:description') || get('name', 'description') || '',
    };
}


function getLoginUserId(req) {
    return req.session?.user?.userId || null;
}

const SEASON_MAP = {
    spring: '봄',
    summer: '여름',
    fall: '가을',
    winter: '겨울',
};

function getSeasonValues(season) {
    if (!season) return [];
    if (SEASON_MAP[season]) return [season, SEASON_MAP[season]];
    return [season];
}

function normalizeUsername(userName) {
    if (!userName) return '@unknown';
    return userName.startsWith('@') ? userName : '@' + userName;
}

function splitGroupConcat(value) {
    if (!value) return [];
    return value.split('||').filter(Boolean);
}


// ──────────────────────────────────────────
// 게시물 목록 조회
// GET /api/feed/posts?page=0&size=9&region=서울&season=spring
// ──────────────────────────────────────────
router.get('/posts', async (req, res) => {
    const { region, season, page = 0, size = 9 } = req.query;
    const limit = Number.parseInt(size, 10) || 9;
    const offset = (Number.parseInt(page, 10) || 0) * limit;
    const viewerId = getLoginUserId(req) || 0;

    const conditions = [];
    const params = [];

    if (region && region !== '전국') {
        conditions.push('r.REGION_NAME = ?');
        params.push(region);
    }

    const seasonValues = getSeasonValues(season);
    if (seasonValues.length === 1) {
        conditions.push('p.SEASON = ?');
        params.push(seasonValues[0]);
    } else if (seasonValues.length === 2) {
        conditions.push('p.SEASON IN (?, ?)');
        params.push(seasonValues[0], seasonValues[1]);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    try {
        const [[{ total }]] = await db.query(
            `
            SELECT COUNT(DISTINCT p.POST_ID) AS total
            FROM POST p
            JOIN REGION r ON p.REGION_ID = r.REGION_ID
            ${where}
            `,
            params
        );

        const [rows] = await db.query(
            `
            SELECT
                p.POST_ID,
                p.MEMBER_ID,
                u.NAME,
                u.PROFILE_IMAGE,
                r.REGION_NAME,
                p.CREATED_DATE,
                p.VIEW_COUNT,
                p.SEASON,
                p.CONTENT,
                p.SCRAP_COUNT,
                p.LIKE_COUNT,
                u.ID AS PROFILE_ID,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS image_urls,
                GROUP_CONCAT(DISTINCT pl.URL ORDER BY pl.LINK_ID SEPARATOR '||') AS link_urls,
                MAX(pl.AFFILIATE) AS has_affiliate,
                EXISTS(SELECT 1 FROM FOLLOW WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = p.MEMBER_ID) AS is_following
            FROM POST p
            JOIN USERS u ON p.MEMBER_ID = u.USER_ID
            JOIN REGION r ON p.REGION_ID = r.REGION_ID
            LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
            LEFT JOIN POST_LINK pl ON p.POST_ID = pl.POST_ID
            ${where}
            GROUP BY
                p.POST_ID,
                p.MEMBER_ID,
                u.NAME,
                u.PROFILE_IMAGE,
                r.REGION_NAME,
                p.CREATED_DATE,
                p.VIEW_COUNT,
                p.SEASON,
                p.CONTENT,
                p.SCRAP_COUNT,
                p.LIKE_COUNT,
                u.ID
            ORDER BY p.CREATED_DATE DESC
            LIMIT ? OFFSET ?
            `,
            [viewerId, ...params, limit, offset]
        );

        const posts = rows.map((row) => {
            const images = splitGroupConcat(row.image_urls);
            const links = splitGroupConcat(row.link_urls);

            return {
                id: row.POST_ID,
                desc: row.CONTENT,
                region: row.REGION_NAME,
                season: row.SEASON,
                viewCount: row.VIEW_COUNT || 0,
                scrapCount: row.SCRAP_COUNT || 0,
                likeCount: row.LIKE_COUNT || 0,
                user: {
                    id: row.MEMBER_ID,
                    username: normalizeUsername(row.NAME),
                    profileId: row.PROFILE_ID,
                    // TODO: 프로필 사진 업로드 기능 추가되면 이 값이 실제 경로로
                    //       내려오는지 확인 (현재는 전부 NULL → 프론트에서 기본 이미지)
                    avatar: row.PROFILE_IMAGE || '',
                },
                images,
                isFollowing: Boolean(row.is_following),
                hasAffiliate: Boolean(row.has_affiliate),
                shops: links.map((url, index) => ({
                    name: '쇼핑 링크',
                    item: `링크 ${index + 1}`,
                    url,
                })),
            };
        });

        res.json({ posts, total });
    } catch (err) {
        console.error('[feed/posts]', err);
        res.status(500).json({ message: '게시물 목록 조회 실패' });
    }
});

// ──────────────────────────────────────────
// 단일 게시물 조회
// GET /api/feed/posts/:postId
// ──────────────────────────────────────────
router.get('/posts/:postId', async (req, res) => {
    const viewerId = getLoginUserId(req) || 0;
    const postId = Number(req.params.postId);

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    try {
        const [[row]] = await db.query(
            `
            SELECT
                p.POST_ID, p.MEMBER_ID, u.NAME, u.PROFILE_IMAGE, r.REGION_NAME,
                p.CREATED_DATE, p.VIEW_COUNT, p.SEASON, p.CONTENT,
                p.SCRAP_COUNT, p.LIKE_COUNT, u.ID AS PROFILE_ID,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS image_urls,
                GROUP_CONCAT(DISTINCT pl.URL ORDER BY pl.LINK_ID SEPARATOR '||') AS link_urls,
                MAX(pl.AFFILIATE) AS has_affiliate,
                EXISTS(SELECT 1 FROM FOLLOW WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = p.MEMBER_ID) AS is_following
            FROM POST p
            JOIN USERS u ON p.MEMBER_ID = u.USER_ID
            JOIN REGION r ON p.REGION_ID = r.REGION_ID
            LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
            LEFT JOIN POST_LINK pl ON p.POST_ID = pl.POST_ID
            WHERE p.POST_ID = ?
            GROUP BY
                p.POST_ID, p.MEMBER_ID, u.NAME, u.PROFILE_IMAGE, r.REGION_NAME,
                p.CREATED_DATE, p.VIEW_COUNT, p.SEASON, p.CONTENT,
                p.SCRAP_COUNT, p.LIKE_COUNT, u.ID
            `,
            [viewerId, postId]
        );

        if (!row) return res.status(404).json({ message: '게시물을 찾을 수 없습니다' });

        const images = splitGroupConcat(row.image_urls);
        const links = splitGroupConcat(row.link_urls);

        res.json({
            post: {
                id: row.POST_ID,
                desc: row.CONTENT,
                region: row.REGION_NAME,
                season: row.SEASON,
                viewCount: row.VIEW_COUNT || 0,
                scrapCount: row.SCRAP_COUNT || 0,
                likeCount: row.LIKE_COUNT || 0,
                user: {
                    id: row.MEMBER_ID,
                    username: normalizeUsername(row.NAME),
                    profileId: row.PROFILE_ID,
                    avatar: row.PROFILE_IMAGE || '',
                },
                images,
                isFollowing: Boolean(row.is_following),
                hasAffiliate: Boolean(row.has_affiliate),
                shops: links.map((url, index) => ({
                    name: '쇼핑 링크',
                    item: `링크 ${index + 1}`,
                    url,
                })),
            },
        });
    } catch (err) {
        console.error('[feed/post single]', err);
        res.status(500).json({ message: '게시물 조회 실패' });
    }
});

// ──────────────────────────────────────────
// 스크랩 토글
// POST /api/feed/posts/:postId/scrap
// ──────────────────────────────────────────
router.post('/posts/:postId/scrap', async (req, res) => {
    const userId = getLoginUserId(req);
    const postId = Number(req.params.postId);

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [[post]] = await connection.query(
            `SELECT POST_ID FROM POST WHERE POST_ID = ?`,
            [postId]
        );

        if (!post) {
            await connection.rollback();
            return res.status(404).json({ message: '게시물을 찾을 수 없습니다' });
        }

        const [[existing]] = await connection.query(
            `SELECT SCRAP_ID FROM SCRAP WHERE MEMBER_ID = ? AND POST_ID = ?`,
            [userId, postId]
        );

        if (existing) {
            await connection.query(
                `DELETE FROM SCRAP WHERE MEMBER_ID = ? AND POST_ID = ?`,
                [userId, postId]
            );
            await connection.query(
                `UPDATE POST SET SCRAP_COUNT = GREATEST(SCRAP_COUNT - 1, 0) WHERE POST_ID = ?`,
                [postId]
            );
        } else {
            await connection.query(
                `INSERT INTO SCRAP (MEMBER_ID, POST_ID, CREATED_DATE) VALUES (?, ?, NOW())`,
                [userId, postId]
            );
            await connection.query(
                `UPDATE POST SET SCRAP_COUNT = SCRAP_COUNT + 1 WHERE POST_ID = ?`,
                [postId]
            );
        }

        const [[row]] = await connection.query(
            `SELECT SCRAP_COUNT AS scrapCount FROM POST WHERE POST_ID = ?`,
            [postId]
        );

        await connection.commit();
        res.json({ scrapped: !existing, scrapCount: row?.scrapCount || 0 });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[feed/scrap]', err);
        res.status(500).json({ message: '스크랩 처리 실패' });
    } finally {
        if (connection) connection.release();
    }
});

// ──────────────────────────────────────────
// 좋아요 기능
// ──────────────────────────────────────────
// ──────────────────────────────────────────
// 좋아요 토글
// POST /api/feed/posts/:postId/like
// ──────────────────────────────────────────
router.post('/posts/:postId/like', async (req, res) => {
    const userId = getLoginUserId(req);
    const postId = Number(req.params.postId);

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [[post]] = await connection.query(
            `SELECT POST_ID FROM POST WHERE POST_ID = ?`,
            [postId]
        );

        if (!post) {
            await connection.rollback();
            return res.status(404).json({ message: '게시물을 찾을 수 없습니다' });
        }

        const [[existing]] = await connection.query(
            `
            SELECT LIKE_ID
            FROM LIKES
            WHERE MEMBER_ID = ? AND POST_ID = ?
            `,
            [userId, postId]
        );

        if (existing) {
            await connection.query(
                `
                DELETE FROM LIKES
                WHERE MEMBER_ID = ? AND POST_ID = ?
                `,
                [userId, postId]
            );

            await connection.query(
                `
                UPDATE POST
                SET LIKE_COUNT = GREATEST(LIKE_COUNT - 1, 0)
                WHERE POST_ID = ?
                `,
                [postId]
            );
        } else {
            await connection.query(
                `
                INSERT INTO LIKES (MEMBER_ID, POST_ID, CREATED_DATE)
                VALUES (?, ?, NOW())
                `,
                [userId, postId]
            );

            await connection.query(
                `
                UPDATE POST
                SET LIKE_COUNT = LIKE_COUNT + 1
                WHERE POST_ID = ?
                `,
                [postId]
            );
        }

        const [[row]] = await connection.query(
            `
            SELECT LIKE_COUNT AS likeCount
            FROM POST
            WHERE POST_ID = ?
            `,
            [postId]
        );

        await connection.commit();

        res.json({
            liked: !existing,
            likeCount: row?.likeCount || 0,
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[feed/like]', err);
        res.status(500).json({ message: '좋아요 처리 실패' });
    } finally {
        if (connection) connection.release();
    }
});

// ──────────────────────────────────────────
// 댓글 목록 조회
// GET /api/feed/posts/:postId/comments
// ──────────────────────────────────────────
router.get('/posts/:postId/comments', async (req, res) => {
    const loginUserId = getLoginUserId(req);
    const postId = Number(req.params.postId);

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    try {
        const [rows] = await db.query(
            `
            SELECT
                c.COMMENT_ID,
                c.POST_ID,
                c.MEMBER_ID,
                u.NAME,
                u.ID AS PROFILE_ID,
                u.PROFILE_IMAGE,
                c.CONTENT,
                c.CREATED_DATE
            FROM COMMENTS c
            JOIN USERS u ON c.MEMBER_ID = u.USER_ID
            WHERE c.POST_ID = ?
            ORDER BY c.CREATED_DATE ASC
            `,
            [postId]
        );

        const comments = rows.map((row) => ({
            id: row.COMMENT_ID,
            postId: row.POST_ID,
            userId: row.MEMBER_ID,
            username: normalizeUsername(row.NAME),
            profileId: row.PROFILE_ID,
            avatar: row.PROFILE_IMAGE || '',
            text: row.CONTENT,
            createdAt: row.CREATED_DATE,
            isOwn: loginUserId && Number(row.MEMBER_ID) === Number(loginUserId),
        }));

        res.json({ comments });
    } catch (err) {
        console.error('[feed/comments GET]', err);
        res.status(500).json({ message: '댓글 조회 실패' });
    }
});

// ──────────────────────────────────────────
// 댓글 작성
// POST /api/feed/posts/:postId/comments
// body: { text }
// ──────────────────────────────────────────
router.post('/posts/:postId/comments', async (req, res) => {
    const userId = getLoginUserId(req);
    const postId = Number(req.params.postId);
    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ message: '댓글 내용을 입력하세요' });
    }

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }



    try {
        const [[post]] = await db.query(
            `SELECT POST_ID FROM POST WHERE POST_ID = ?`,
            [postId]
        );

        if (!post) {
            return res.status(404).json({ message: '게시물을 찾을 수 없습니다' });
        }

        const [result] = await db.query(
            `
            INSERT INTO COMMENTS (POST_ID, MEMBER_ID, CONTENT, CREATED_DATE)
            VALUES (?, ?, ?, NOW())
            `,
            [postId, userId, text.trim()]
        );

        res.status(201).json({
            message: '댓글 작성 성공',
            commentId: result.insertId,
        });
    } catch (err) {
        console.error('[feed/comments POST]', err);
        res.status(500).json({ message: '댓글 작성 실패' });
    }
});

// ──────────────────────────────────────────
// 댓글 수정
// PUT /api/feed/posts/:postId/comments/:commentId
// body: { text }
// ──────────────────────────────────────────
router.put('/posts/:postId/comments/:commentId', async (req, res) => {
    const userId = getLoginUserId(req);
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ message: '댓글 내용을 입력하세요' });
    }

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId || !commentId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    try {
        const [result] = await db.query(
            `
            UPDATE COMMENTS SET CONTENT = ?
            WHERE COMMENT_ID = ? AND POST_ID = ? AND MEMBER_ID = ?
            `,
            [text.trim(), commentId, postId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(403).json({ message: '수정 권한이 없습니다' });
        }

        res.json({ message: '댓글 수정 성공' });
    } catch (err) {
        console.error('[feed/comments PUT]', err);
        res.status(500).json({ message: '댓글 수정 실패' });
    }
});

// ──────────────────────────────────────────
// 댓글 삭제
// DELETE /api/feed/posts/:postId/comments/:commentId
// ──────────────────────────────────────────
router.delete('/posts/:postId/comments/:commentId', async (req, res) => {
    const userId = getLoginUserId(req);
    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId || !commentId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    try {
        const [result] = await db.query(
            `
            DELETE FROM COMMENTS
            WHERE COMMENT_ID = ? AND POST_ID = ? AND MEMBER_ID = ?
            `,
            [commentId, postId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(403).json({ message: '삭제 권한이 없습니다' });
        }

        res.json({ message: '댓글 삭제 성공' });
    } catch (err) {
        console.error('[feed/comments DELETE]', err);
        res.status(500).json({ message: '댓글 삭제 실패' });
    }
});

// ──────────────────────────────────────────
// 신고
// POST /api/feed/posts/:postId/report
// body: { reason, detail }
// ──────────────────────────────────────────
router.post('/posts/:postId/report', async (req, res) => {
    const reporterId = getLoginUserId(req);
    const postId = Number(req.params.postId);
    const { reason, detail } = req.body;

    if (!reporterId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId || isNaN(postId)) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    if (!reason) {
        return res.status(400).json({ message: '신고 사유를 선택하세요' });
    }

    try {
        const [[post]] = await db.query(
            `
            SELECT MEMBER_ID AS reportedId FROM POST WHERE POST_ID = ?
            `,
            [postId]
        );

        if (!post) {
            return res.status(404).json({ message: '게시물을 찾을 수 없습니다' });
        }

        const reportedId = post.reportedId;

        if (Number(reporterId) === Number(reportedId)) {
            return res.status(400).json({ message: '자신의 게시물은 신고할 수 없습니다' });
        }

        const [[dup]] = await db.query(
            `
            SELECT REPORT_ID FROM REPORT WHERE REPORTER_ID = ? AND POST_ID = ?
            `,
            [reporterId, postId]
        );

        if (dup) {
            return res.status(409).json({ message: '이미 신고한 게시물입니다' });
        }

        const fullReason = detail?.trim() ? `${reason} - ${detail.trim()}` : reason;

        const [result] = await db.query(
            `
            INSERT INTO REPORT (REPORTER_ID, REPORTED_ID, POST_ID, REASON, STATUS, CREATED_DATE)
            VALUES (?, ?, ?, ?, 'pending', NOW())
            `,
            [reporterId, reportedId, postId, fullReason]
        );

        res.status(201).json({
            message: '신고 접수 성공',
            reportId: result.insertId,
        });
    } catch (err) {
        console.error('[feed/report]', err);
        res.status(500).json({ message: '신고 처리 실패' });
    }
});

// ──────────────────────────────────────────
// 내 좋아요·스크랩 ID 목록
// GET /api/feed/my-interactions
// ──────────────────────────────────────────
router.get('/my-interactions', async (req, res) => {
    const userId = getLoginUserId(req);
    if (!userId) return res.json({ userId: null, likedIds: [], scrappedIds: [], followingIds: [] });

    try {
        const [[likes], [scraps], [followings]] = await Promise.all([
            db.query('SELECT POST_ID FROM LIKES WHERE MEMBER_ID = ?', [userId]),
            db.query('SELECT POST_ID FROM SCRAP WHERE MEMBER_ID = ?', [userId]),
            db.query('SELECT FOLLOWING_ID FROM FOLLOW WHERE FOLLOWER_ID = ?', [userId]),
        ]);
        res.json({
            userId,
            likedIds: likes.map(r => r.POST_ID),
            scrappedIds: scraps.map(r => r.POST_ID),
            followingIds: followings.map(r => r.FOLLOWING_ID),
        });
    } catch (err) {
        console.error('[feed/my-interactions]', err);
        res.json({ userId: null, likedIds: [], scrappedIds: [], followingIds: [] });
    }
});

// ──────────────────────────────────────────
// 팔로우 토글
// POST /api/feed/users/:targetUserId/follow
// ──────────────────────────────────────────
router.post('/users/:targetUserId/follow', async (req, res) => {
    const userId = getLoginUserId(req);
    const targetUserId = Number(req.params.targetUserId);

    if (!userId) return res.status(401).json({ message: '로그인이 필요합니다' });
    if (!targetUserId || userId === targetUserId) {
        return res.status(400).json({ message: '잘못된 요청입니다' });
    }

    try {
        const [[existing]] = await db.query(
            'SELECT FOLLOW_ID FROM FOLLOW WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = ?',
            [userId, targetUserId]
        );

        if (existing) {
            await db.query(
                'DELETE FROM FOLLOW WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = ?',
                [userId, targetUserId]
            );
            res.json({ followed: false });
        } else {
            await db.query(
                'INSERT INTO FOLLOW (FOLLOWER_ID, FOLLOWING_ID, CREATED_DATE) VALUES (?, ?, NOW())',
                [userId, targetUserId]
            );
            res.json({ followed: true });
        }
    } catch (err) {
        console.error('[feed/follow]', err);
        res.status(500).json({ message: '팔로우 처리 실패' });
    }
});

// ──────────────────────────────────────────
// url 미리보기
// GET /api/feed/og-preview?url=...
// ──────────────────────────────────────────
router.get('/og-preview', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url required' });

    if (ogCache.has(url)) return res.json(ogCache.get(url));

    let domain = url;
    try { domain = new URL(url).hostname; } catch { /* ignore */ }

    try {
        const response = await axios.get(url, {
            timeout: 4000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; codimap/1.0)',
                Accept: 'text/html',
            },
            maxRedirects: 3,
            responseType: 'text',
        });
        const og = parseOgTags(String(response.data));
        const result = { title: og.title || domain, image: og.image, description: og.description, domain };
        ogCache.set(url, result);
        res.json(result);
    } catch {
        res.json({ title: domain, image: '', description: '', domain });
    }
});

module.exports = router;
