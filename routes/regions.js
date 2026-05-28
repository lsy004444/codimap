const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/nearby', async(req, res) => {
    try {
        const { lat, lng, season, type, gu } = req.query;
        const range = type === 'gu' ? 0.05 : 0.01;

        let query;
        let params;

        if(gu) {
            query = `
                SELECT p.*, r.REGION_NAME, r.LATITUDE, r.LONGITUDE,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS
                FROM POST p
                JOIN REGION r ON p.REGION_ID = r.REGION_ID
                LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
                WHERE r.COUNTRY = ?
            `;
            params = [gu];
        } else {
            query = `
                SELECT p.*, r.REGION_NAME, r.LATITUDE, r.LONGITUDE,
                GROUP_CONCAT(DISTINCT i.URL ORDER BY i.IMAGE_ID SEPARATOR '||') AS IMAGE_URLS
                FROM POST p
                JOIN REGION r ON p.REGION_ID = r.REGION_ID
                LEFT JOIN IMAGE i ON p.POST_ID = i.POST_ID
                WHERE r.LATITUDE BETWEEN ? AND ?
                AND r.LONGITUDE BETWEEN ? AND ?
            `;
            params = [
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

        query += ' GROUP BY p.POST_ID, r.REGION_NAME, r.LATITUDE, r.LONGITUDE';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;