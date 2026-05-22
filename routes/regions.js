const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async(req, res) => {
    try {
        const { name } = req.query;
        const [rows] = await db.query (
            'SELECT * FROM REGION WHERE REGION_NAME LIKE ?',
            [`%{name}%`]
        );
        res.json(rows);    
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

module.exports = router;