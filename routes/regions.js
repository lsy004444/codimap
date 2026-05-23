const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/nearby', async(req,res) => {
    try{
        const { lat, lng, season } = req.query;
        const range = 0.01;

        let query = `
            SELECT p.*, r.REGION_NAME, r.LATITUDE, r.LONGITUDE
            FROM POST p
            JOIN REGION r ON p.REGION_ID = r.REGION_ID
            WHERE r.LATITUDE BETWEEN ? AND ?
            AND r.LONGITUDE BETWEEN ? AND ?
        `;

        const params = [
            parseFloat(lat) - range,
            parseFloat(lat) + range,
            parseFloat(lng) - range,
            parseFloat(lng) + range
        ];

        if(season) {
            query += 'AND p.SEASON = ?';
            params.push(season);
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;