const express= require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/:theme', async(req,res) => {
    try {
        const { theme } = req.params;

        const themeKeywords = {
            oversized: '오버핏',
            weather: null,
            autumn: '가을'
        };

        const keyword = themeKeywords[theme];

        let query;
        let params;

        if(keyword) {
            query= `
            SELECT p.POST_ID, p.CONTENT, p.SEASON,
        GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS
        FROM POST p
        LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
        WHERE p.CONTENT LIKE ?
        GROUP BY p.POST_ID
        ORDER BY p.POST_ID DESC
        LIMIT 20
        `;

        params = [`%${keyword}%`];
        } else {
            query= `
            SELECT p.POST_ID, p.CONTENT, p.SEASON,
            GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS
            FROM POST p
            LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
            GROUP BY p.POST_ID
            ORDER BY p.POST_ID DESC
            LIMIT 20
            `;
            params = [];
        }
        const [rows] = await db.query(query, params);
        res.json({ success: true, theme, posts: rows});
    } catch (err)
    {
        console.error(err);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.'});
    }
});

module.exports = router;