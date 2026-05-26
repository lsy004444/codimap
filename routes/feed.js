const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ──────────────────────────────────────────
// 테스트용 MOCK 모드
// true  = DB에 접근하지 않고 아래 mock 데이터로 화면/기능 확인
// false = 실제 MySQL DB 사용
// 테스트 끝나면 반드시 false로 바꾸기
// ──────────────────────────────────────────
const USE_MOCK_FEED = true;

// ──────────────────────────────────────────
// 테스트용 MOCK 데이터
// DB에 INSERT하지 않고 피드 화면, 상세 모달, 댓글, 스크랩, 신고 확인용
// 서버 재시작 시 mock 댓글/스크랩 상태는 초기화됨
// ──────────────────────────────────────────
const mockPosts = [
    {
        id: 1,
        desc: 'DB에 넣지 않고 확인하는 테스트 게시물입니다 🌸',
        region: '서울',
        season: '봄',
        viewCount: 0,
        scrapCount: 3,
        likeCount: 0, // 현재 DB에 좋아요 기능이 없어서 임시 0
        user: {
            id: 1,
            username: '@testuser',
            avatar: '',
        },
        images: [
            'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800',
            'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
        ],
        shops: [
            {
                name: '쇼핑 링크',
                item: '테스트 링크 1',
                url: 'https://www.musinsa.com',
            },
        ],
    },
    {
        id: 2,
        desc: '두 번째 테스트 게시물입니다. 카드 클릭, 이미지, 무한스크롤 확인용이에요.',
        region: '부산',
        season: '여름',
        viewCount: 0,
        scrapCount: 1,
        likeCount: 0, // 현재 DB에 좋아요 기능이 없어서 임시 0
        user: {
            id: 2,
            username: '@sampleuser',
            avatar: '',
        },
        images: [
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
        ],
        shops: [],
    },
    {
        id: 3,
        desc: '가을 필터 확인용 테스트 게시물입니다 🍂',
        region: '서울',
        season: '가을',
        viewCount: 0,
        scrapCount: 0,
        likeCount: 0, // 현재 DB에 좋아요 기능이 없어서 임시 0
        user: {
            id: 3,
            username: '@falluser',
            avatar: '',
        },
        images: [
            'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800',
        ],
        shops: [
            {
                name: '쇼핑 링크',
                item: '테스트 링크 1',
                url: 'https://www.musinsa.com',
            },
            {
                name: '쇼핑 링크',
                item: '테스트 링크 2',
                url: 'https://www.zigzag.kr',
            },
        ],
    },
];

let mockComments = {
    1: [
        {
            id: 1,
            postId: 1,
            userId: 1,
            username: '@testuser',
            avatar: '',
            text: '테스트 댓글입니다!',
            createdAt: new Date().toISOString(),
        },
    ],
    2: [
        {
            id: 2,
            postId: 2,
            userId: 2,
            username: '@sampleuser',
            avatar: '',
            text: '두 번째 게시물 댓글 확인용입니다.',
            createdAt: new Date().toISOString(),
        },
    ],
    3: [],
};

const mockScrappedByUser = new Map(); // userId -> Set<postId>

function getLoginUserId(req) {
    return req.session?.user_id || req.session?.userId || null;
}

const SEASON_MAP = {
    spring: '봄',
    summer: '여름',
    fall: '가을',
    winter: '겨울',
};

function convertSeason(season) {
    return SEASON_MAP[season] || season;
}

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

function filterMockPosts(query) {
    const page = Number(query.page || 0);
    const size = Number(query.size || 9);
    const start = page * size;
    const end = start + size;

    const region = query.region;
    const season = query.season ? convertSeason(query.season) : null;

    let filtered = [...mockPosts];

    if (region && region !== '전국') {
        filtered = filtered.filter((post) => post.region === region);
    }

    if (season) {
        filtered = filtered.filter((post) => post.season === season);
    }

    return {
        posts: filtered.slice(start, end),
        total: filtered.length,
    };
}

// ──────────────────────────────────────────
// 게시물 목록 조회
// GET /api/feed/posts?page=0&size=9&region=서울&season=spring
// ──────────────────────────────────────────
router.get('/posts', async (req, res) => {
    // ── 테스트용 MOCK 응답: DB에 접근하지 않음 ──
    if (USE_MOCK_FEED) {
        const { posts, total } = filterMockPosts(req.query);
        return res.json({ posts, total });
    }

    const { region, season, page = 0, size = 9 } = req.query;
    const limit = Number.parseInt(size, 10) || 9;
    const offset = (Number.parseInt(page, 10) || 0) * limit;

    const conditions = [];
    const params = [];

    if (region && region !== '전국') {
        conditions.push('r.region_name = ?');
        params.push(region);
    }

    const seasonValues = getSeasonValues(season);
    if (seasonValues.length === 1) {
        conditions.push('p.season = ?');
        params.push(seasonValues[0]);
    } else if (seasonValues.length === 2) {
        conditions.push('p.season IN (?, ?)');
        params.push(seasonValues[0], seasonValues[1]);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    try {
        const [[{ total }]] = await db.query(
            `
            SELECT COUNT(DISTINCT p.post_id) AS total
            FROM post p
            JOIN region r ON p.region_id = r.region_id
            ${where}
            `,
            params
        );

        const [rows] = await db.query(
            `
            SELECT
                p.post_id,
                p.user_id,
                u.user_name,
                r.region_name,
                p.created_date,
                p.view_count,
                p.season,
                p.content,
                p.scrap_count,
                GROUP_CONCAT(DISTINCT i.url ORDER BY i.image_id SEPARATOR '||') AS image_urls,
                GROUP_CONCAT(DISTINCT pl.url ORDER BY pl.link_id SEPARATOR '||') AS link_urls
            FROM post p
            JOIN \`user\` u ON p.user_id = u.user_id
            JOIN region r ON p.region_id = r.region_id
            LEFT JOIN image i ON p.post_id = i.post_id
            LEFT JOIN post_link pl ON p.post_id = pl.post_id
            ${where}
            GROUP BY
                p.post_id,
                p.user_id,
                u.user_name,
                r.region_name,
                p.created_date,
                p.view_count,
                p.season,
                p.content,
                p.scrap_count
            ORDER BY p.created_date DESC
            LIMIT ? OFFSET ?
            `,
            [...params, limit, offset]
        );

        const posts = rows.map((row) => {
            const images = splitGroupConcat(row.image_urls);
            const links = splitGroupConcat(row.link_urls);

            return {
                id: row.post_id,
                desc: row.content,
                region: row.region_name,
                season: row.season,
                viewCount: row.view_count || 0,
                scrapCount: row.scrap_count || 0,

                // 현재 DB에 좋아요 테이블/컬럼이 없어서 임시 0 처리
                // 다음 회의 후 좋아요 테이블 추가되면 실제 값으로 교체
                likeCount: 0,

                user: {
                    id: row.user_id,
                    username: normalizeUsername(row.user_name),

                    // 현재 user 테이블에 profile_image 컬럼이 없어서 빈 문자열 처리
                    avatar: '',
                },

                images,

                shops: links.map((url, index) => ({
                    // 현재 post_link 테이블에는 url만 있음
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
// 스크랩 토글
// POST /api/feed/posts/:postId/scrap
// ──────────────────────────────────────────
router.post('/posts/:postId/scrap', async (req, res) => {
    const userId = getLoginUserId(req);
    const postId = Number(req.params.postId);

    // ── 테스트용 MOCK 응답: DB에 접근하지 않음 ──
    if (USE_MOCK_FEED) {
        const mockUserId = userId ?? 1;
        const post = mockPosts.find((p) => p.id === postId);

        if (!post) {
            return res.status(404).json({ message: '게시물을 찾을 수 없습니다' });
        }

        if (!mockScrappedByUser.has(mockUserId)) {
            mockScrappedByUser.set(mockUserId, new Set());
        }
        const userScraps = mockScrappedByUser.get(mockUserId);

        if (userScraps.has(postId)) {
            userScraps.delete(postId);
            post.scrapCount = Math.max((post.scrapCount || 0) - 1, 0);
            return res.json({ scrapped: false, scrapCount: post.scrapCount });
        }

        userScraps.add(postId);
        post.scrapCount = (post.scrapCount || 0) + 1;
        return res.json({ scrapped: true, scrapCount: post.scrapCount });
    }

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [[existing]] = await connection.query(
            `SELECT scrap_id FROM scrap WHERE user_id = ? AND post_id = ?`,
            [userId, postId]
        );

        if (existing) {
            await connection.query(
                `DELETE FROM scrap WHERE user_id = ? AND post_id = ?`,
                [userId, postId]
            );
            await connection.query(
                `UPDATE post SET scrap_count = GREATEST(scrap_count - 1, 0) WHERE post_id = ?`,
                [postId]
            );
        } else {
            await connection.query(
                `INSERT INTO scrap (user_id, post_id, created_date) VALUES (?, ?, NOW())`,
                [userId, postId]
            );
            await connection.query(
                `UPDATE post SET scrap_count = scrap_count + 1 WHERE post_id = ?`,
                [postId]
            );
        }

        const [[row]] = await connection.query(
            `SELECT scrap_count AS scrapCount FROM post WHERE post_id = ?`,
            [postId]
        );

        await connection.commit();
        res.json({ scrapped: !existing, scrapCount: row?.scrapCount || 0 });
    } catch (err) {
        await connection.rollback();
        console.error('[feed/scrap]', err);
        res.status(500).json({ message: '스크랩 처리 실패' });
    } finally {
        connection.release();
    }
});

// ──────────────────────────────────────────
// 좋아요 기능
// 현재 DB에 좋아요 테이블/post.like_count 컬럼이 없어서 제외
// 프론트에서도 좋아요 버튼은 숨기거나 클릭 이벤트를 주석 처리하는 것을 추천
// ──────────────────────────────────────────
/*
router.post('/posts/:postId/like', async (req, res) => {
    return res.status(501).json({
        message: '좋아요 기능은 현재 DB 구조에 없어 구현하지 않았습니다',
    });
});
*/

// ──────────────────────────────────────────
// 댓글 목록 조회
// GET /api/feed/posts/:postId/comments
// ──────────────────────────────────────────
router.get('/posts/:postId/comments', async (req, res) => {
    const postId = Number(req.params.postId);

    // ── 테스트용 MOCK 응답: DB에 접근하지 않음 ──
    if (USE_MOCK_FEED) {
        return res.json({
            comments: mockComments[postId] || [],
        });
    }

    if (!postId) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    try {
        const [rows] = await db.query(
            `
            SELECT
                c.comment_id,
                c.post_id,
                c.user_id,
                u.user_name,
                c.content,
                c.created_date
            FROM \`comment\` c
            JOIN \`user\` u ON c.user_id = u.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_date ASC
            `,
            [postId]
        );

        const comments = rows.map((row) => ({
            id: row.comment_id,
            postId: row.post_id,
            userId: row.user_id,
            username: normalizeUsername(row.user_name),

            // 현재 user 테이블에 profile_image 컬럼이 없어서 빈 문자열 처리
            avatar: '',

            text: row.content,
            createdAt: row.created_date,
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

    // ── 테스트용 MOCK 응답: DB에 접근하지 않음 ──
    if (USE_MOCK_FEED) {
        const mockUserId = userId ?? 1;
        const newComment = {
            id: Date.now(),
            postId,
            userId: mockUserId,
            username: '@testuser',
            avatar: '',
            text: text.trim(),
            createdAt: new Date().toISOString(),
        };

        if (!mockComments[postId]) {
            mockComments[postId] = [];
        }

        mockComments[postId].push(newComment);

        return res.status(201).json(newComment);
    }

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    try {
        const [result] = await db.query(
            `
            INSERT INTO \`comment\` (post_id, user_id, content, created_date)
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

    // ── 테스트용 MOCK 응답: DB에 접근하지 않음 ──
    if (USE_MOCK_FEED) {
        const mockUserId = userId ?? 1;
        const comments = mockComments[postId] || [];
        const comment = comments.find((c) => c.id === commentId);

        if (!comment) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다' });
        }

        if (comment.userId !== mockUserId) {
            return res.status(403).json({ message: '수정 권한이 없습니다' });
        }

        comment.text = text.trim();

        return res.json({ message: '댓글 수정 성공' });
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
            UPDATE \`comment\`
            SET content = ?
            WHERE comment_id = ?
              AND post_id = ?
              AND user_id = ?
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

    // ── 테스트용 MOCK 응답: DB에 접근하지 않음 ──
    if (USE_MOCK_FEED) {
        const mockUserId = userId ?? 1;
        const comments = mockComments[postId] || [];
        const commentIndex = comments.findIndex((c) => c.id === commentId);

        if (commentIndex === -1) {
            return res.status(404).json({ message: '댓글을 찾을 수 없습니다' });
        }

        if (comments[commentIndex].userId !== mockUserId) {
            return res.status(403).json({ message: '삭제 권한이 없습니다' });
        }

        comments.splice(commentIndex, 1);

        return res.json({ message: '댓글 삭제 성공' });
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
            DELETE FROM \`comment\`
            WHERE comment_id = ?
              AND post_id = ?
              AND user_id = ?
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

    if (!reason) {
        return res.status(400).json({ message: '신고 사유를 선택하세요' });
    }

    // ── 테스트용 MOCK 응답: DB에 접근하지 않음 ──
    if (USE_MOCK_FEED) {
        return res.status(201).json({
            message: '신고 접수 성공',
            reportId: Date.now(),
            reason,
            detail: detail || '',
        });
    }

    if (!reporterId) {
        return res.status(401).json({ message: '로그인이 필요합니다' });
    }

    if (!postId) {
        return res.status(400).json({ message: '잘못된 게시물 ID입니다' });
    }

    try {
        const [[post]] = await db.query(
            `
            SELECT user_id AS reportedId
            FROM post
            WHERE post_id = ?
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
            SELECT report_id
            FROM report
            WHERE reporter_id = ? AND post_id = ?
            `,
            [reporterId, postId]
        );

        if (dup) {
            return res.status(409).json({ message: '이미 신고한 게시물입니다' });
        }

        // 현재 report 테이블에는 detail 컬럼이 없어서 reason에 합쳐 저장
        const fullReason = detail?.trim() ? `${reason} - ${detail.trim()}` : reason;

        const [result] = await db.query(
            `
            INSERT INTO report (
                reporter_id,
                reported_id,
                post_id,
                reason,
                status,
                created_date
            )
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

module.exports = router;
