const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/active', async(req,res) => {
    try {
        const [rows] = await db.query(
            `SELECT BANNER_ID, TEXT, LINK_URL, TYPE
       FROM BANNER
       WHERE IS_ACTIVE = 1
         AND (START_DATE IS NULL OR START_DATE <= CURDATE())
         AND (END_DATE IS NULL OR END_DATE >= CURDATE())
       ORDER BY DISPLAY_ORDER ASC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: '배너를 불러오지 못했습니다.'});
    }
});

module.exports = router;