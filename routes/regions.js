const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { resolvePostSort } = require('../utils/postSort');

router.get('/nearby', async(req, res) => {
    try {
        const { lat, lng, season, type, gu, city, sort } = req.query;
        const viewerId = req.session?.user?.userId || 0;
        const range = type === 'gu' ? 0.05 : 0.01;

        let query;
        let params;

        if(city) {
            // 시 단위 검색 추가
            query = `
                SELECT p.*, r.REGION_NAME, r.LATITUDE, r.LONGITUDE,
                u.NAME, u.ID AS PROFILE_ID,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS,
                GROUP_CONCAT(DISTINCT pl.URL ORDER BY pl.LINK_ID SEPARATOR '||') AS LINK_URLS,
                MAX(pl.AFFILIATE) AS HAS_AFFILIATE,
                EXISTS(SELECT 1 FROM FOLLOW WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = p.MEMBER_ID) AS IS_FOLLOWING
                FROM POST p
                JOIN REGION r ON p.REGION_ID = r.REGION_ID
                JOIN USERS u ON p.MEMBER_ID = u.USER_ID
                LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
                LEFT JOIN POST_LINK pl ON p.POST_ID = pl.POST_ID
                WHERE r.CITY LIKE ?
            `;
            params = [viewerId, `%${city}%`];
        }
        else if(gu) {
            query = `
                SELECT p.*, r.REGION_NAME, r.LATITUDE, r.LONGITUDE,
                u.NAME, u.ID AS PROFILE_ID,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS,
                GROUP_CONCAT(DISTINCT pl.URL ORDER BY pl.LINK_ID SEPARATOR '||') AS LINK_URLS,
                MAX(pl.AFFILIATE) AS HAS_AFFILIATE,
                EXISTS(SELECT 1 FROM FOLLOW WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = p.MEMBER_ID) AS IS_FOLLOWING
                FROM POST p
                JOIN REGION r ON p.REGION_ID = r.REGION_ID
                JOIN USERS u ON p.MEMBER_ID = u.USER_ID
                LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
                LEFT JOIN POST_LINK pl ON p.POST_ID = pl.POST_ID
                WHERE r.COUNTRY = ?
            `;
            params = [viewerId, gu];
        } else {
            query = `
                SELECT p.*, r.REGION_NAME, r.LATITUDE, r.LONGITUDE,
                u.NAME, u.ID AS PROFILE_ID,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS,
                GROUP_CONCAT(DISTINCT pl.URL ORDER BY pl.LINK_ID SEPARATOR '||') AS LINK_URLS,
                MAX(pl.AFFILIATE) AS HAS_AFFILIATE,
                EXISTS(SELECT 1 FROM FOLLOW WHERE FOLLOWER_ID = ? AND FOLLOWING_ID = p.MEMBER_ID) AS IS_FOLLOWING
                FROM POST p
                JOIN REGION r ON p.REGION_ID = r.REGION_ID
                JOIN USERS u ON p.MEMBER_ID = u.USER_ID
                LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
                LEFT JOIN POST_LINK pl ON p.POST_ID = pl.POST_ID
                WHERE r.LATITUDE BETWEEN ? AND ?
                AND r.LONGITUDE BETWEEN ? AND ?
            `;
            params = [
                viewerId,
                parseFloat(lat) - range,
                parseFloat(lat) + range,
                parseFloat(lng) - range,
                parseFloat(lng) + range
            ];
        }

        if(season) {
            const seasonMap = {
                spring: '봄',
                summer: '여름',
                fall: '가을',
                winter: '겨울'
            };
            query += ' AND p.SEASON = ?';
            params.push(seasonMap[season] || season);
        }

        query += ' GROUP BY p.POST_ID, r.REGION_NAME, r.LATITUDE, r.LONGITUDE, u.NAME, u.ID';

        // 정렬은 화이트리스트(utils/postSort)에서 고른 값만 붙인다 — 쿼리 문자열에
        // 직접 이어붙이므로 req.query.sort 를 그대로 쓰면 인젝션이 된다.
        query += ` ORDER BY ${resolvePostSort(sort)}`;

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;