const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '_' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    },
});

const fileFilter = function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

// db/migrations/001_add_post_topic.sql 의 주제 목록과 맞춘다
const VALID_TOPICS = ['recommend', 'question', 'daily', 'etc'];
const DEFAULT_TOPIC = 'etc';

function getLoginUserId(req) {
    return req.session?.user?.userId || null;
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
// 커뮤니티 글 작성 (사진은 선택)
// POST /api/community/posts  (multipart/form-data)
// body: title, content, topic(선택, 기본 'etc'), images[](선택, 최대 10장)
// ──────────────────────────────────────────
router.post('/posts', upload.array('images', 10), async (req, res) => {
    const memberId = getLoginUserId(req);
    if (!memberId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다' });
    }

    const title = (req.body.title || '').trim();
    const content = (req.body.content || '').trim();
    const topic = VALID_TOPICS.includes(req.body.topic) ? req.body.topic : DEFAULT_TOPIC;
    const files = req.files || [];

    if (!content) {
        return res.status(400).json({ success: false, message: '내용을 입력해주세요' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // TOPIC은 항상 값이 채워지므로(IS NOT NULL) 코디 게시물(TOPIC IS NULL)과 구분된다
        const [result] = await conn.query(
            'INSERT INTO POST (CONTENT, TITLE, MEMBER_ID, TOPIC) VALUES (?, ?, ?, ?)',
            [content, title || null, memberId, topic]
        );
        const postId = result.insertId;

        for (const file of files) {
            const imageUrl = `/uploads/${file.filename}`;
            await conn.query('INSERT INTO IMAGE (URL, POST_ID) VALUES (?, ?)', [imageUrl, postId]);
        }

        await conn.commit();
        res.status(201).json({ success: true, message: '게시글이 등록되었습니다', postId });
    } catch (err) {
        await conn.rollback();
        console.error('[community/posts POST]', err);
        res.status(500).json({ success: false, message: '게시글 등록 실패' });
    } finally {
        conn.release();
    }
});

// ──────────────────────────────────────────
// 커뮤니티 글 목록
// GET /api/community/posts?topic=&page=0&size=10
// ──────────────────────────────────────────
router.get('/posts', async (req, res) => {
    const { topic, page = 0, size = 10 } = req.query;
    const limit = Number.parseInt(size, 10) || 10;
    const offset = (Number.parseInt(page, 10) || 0) * limit;

    const conditions = ['p.TOPIC IS NOT NULL'];
    const params = [];
    if (topic && VALID_TOPICS.includes(topic)) {
        conditions.push('p.TOPIC = ?');
        params.push(topic);
    }
    const where = 'WHERE ' + conditions.join(' AND ');

    try {
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM POST p ${where}`,
            params
        );

        const [rows] = await db.query(
            `
            SELECT
                p.POST_ID, p.MEMBER_ID, p.TITLE, p.CONTENT, p.TOPIC, p.CREATED_DATE,
                p.VIEW_COUNT, p.SCRAP_COUNT, p.LIKE_COUNT,
                u.NAME, u.PROFILE_IMAGE, u.ID AS PROFILE_ID,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS image_urls
            FROM POST p
            JOIN USERS u ON p.MEMBER_ID = u.USER_ID
            LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
            ${where}
            GROUP BY p.POST_ID, p.MEMBER_ID, p.TITLE, p.CONTENT, p.TOPIC, p.CREATED_DATE,
                p.VIEW_COUNT, p.SCRAP_COUNT, p.LIKE_COUNT, u.NAME, u.PROFILE_IMAGE, u.ID
            ORDER BY p.CREATED_DATE DESC
            LIMIT ? OFFSET ?
            `,
            [...params, limit, offset]
        );

        const posts = rows.map((row) => ({
            id: row.POST_ID,
            title: row.TITLE,
            desc: row.CONTENT,
            topic: row.TOPIC,
            createdAt: row.CREATED_DATE,
            viewCount: row.VIEW_COUNT || 0,
            scrapCount: row.SCRAP_COUNT || 0,
            likeCount: row.LIKE_COUNT || 0,
            user: {
                id: row.MEMBER_ID,
                username: normalizeUsername(row.NAME),
                profileId: row.PROFILE_ID,
                avatar: row.PROFILE_IMAGE || '',
            },
            images: splitGroupConcat(row.image_urls),
        }));

        res.json({ posts, total });
    } catch (err) {
        console.error('[community/posts GET]', err);
        res.status(500).json({ success: false, message: '게시글 목록 조회 실패' });
    }
});

// ──────────────────────────────────────────
// 커뮤니티 글 상세
// GET /api/community/posts/:postId
// ──────────────────────────────────────────
router.get('/posts/:postId', async (req, res) => {
    const postId = Number(req.params.postId);
    if (!postId || isNaN(postId)) {
        return res.status(400).json({ success: false, message: '잘못된 게시물 ID입니다' });
    }

    try {
        const [[row]] = await db.query(
            `
            SELECT
                p.POST_ID, p.MEMBER_ID, p.TITLE, p.CONTENT, p.TOPIC, p.CREATED_DATE,
                p.VIEW_COUNT, p.SCRAP_COUNT, p.LIKE_COUNT,
                u.NAME, u.PROFILE_IMAGE, u.ID AS PROFILE_ID,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS image_urls
            FROM POST p
            JOIN USERS u ON p.MEMBER_ID = u.USER_ID
            LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
            WHERE p.POST_ID = ? AND p.TOPIC IS NOT NULL
            GROUP BY p.POST_ID, p.MEMBER_ID, p.TITLE, p.CONTENT, p.TOPIC, p.CREATED_DATE,
                p.VIEW_COUNT, p.SCRAP_COUNT, p.LIKE_COUNT, u.NAME, u.PROFILE_IMAGE, u.ID
            `,
            [postId]
        );

        if (!row) return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다' });

        await db.query('UPDATE POST SET VIEW_COUNT = VIEW_COUNT + 1 WHERE POST_ID = ?', [postId]);

        res.json({
            success: true,
            post: {
                id: row.POST_ID,
                title: row.TITLE,
                desc: row.CONTENT,
                topic: row.TOPIC,
                createdAt: row.CREATED_DATE,
                viewCount: (row.VIEW_COUNT || 0) + 1,
                scrapCount: row.SCRAP_COUNT || 0,
                likeCount: row.LIKE_COUNT || 0,
                user: {
                    id: row.MEMBER_ID,
                    username: normalizeUsername(row.NAME),
                    profileId: row.PROFILE_ID,
                    avatar: row.PROFILE_IMAGE || '',
                },
                images: splitGroupConcat(row.image_urls),
            },
        });
    } catch (err) {
        console.error('[community/posts/:postId GET]', err);
        res.status(500).json({ success: false, message: '게시글 조회 실패' });
    }
});

// ──────────────────────────────────────────
// 커뮤니티 글 삭제 (작성자 본인만)
// DELETE /api/community/posts/:postId
// ──────────────────────────────────────────
router.delete('/posts/:postId', async (req, res) => {
    const memberId = getLoginUserId(req);
    const postId = Number(req.params.postId);

    if (!memberId) return res.status(401).json({ success: false, message: '로그인이 필요합니다' });
    if (!postId || isNaN(postId)) {
        return res.status(400).json({ success: false, message: '잘못된 게시물 ID입니다' });
    }

    try {
        await db.query('DELETE FROM POST_LINK WHERE POST_ID = ?', [postId]);
        await db.query('DELETE FROM IMAGE WHERE POST_ID = ?', [postId]);
        const [result] = await db.query(
            'DELETE FROM POST WHERE POST_ID = ? AND MEMBER_ID = ? AND TOPIC IS NOT NULL',
            [postId, memberId]
        );

        if (result.affectedRows === 0) {
            return res.status(403).json({ success: false, message: '삭제 권한이 없거나 이미 삭제된 게시글입니다' });
        }

        res.json({ success: true, message: '삭제되었습니다' });
    } catch (err) {
        console.error('[community/posts/:postId DELETE]', err);
        res.status(500).json({ success: false, message: '삭제 실패' });
    }
});

module.exports = router;
