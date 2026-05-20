require('dotenv').config();
const mysql = require('mysql2/promise');

let test = async () => {
    const db = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PW,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        waitForConnections: true,
    });

    try {
        const [rows] = await db.query('SELECT 1');
        console.log('DB 연결 성공!');
    } catch (err) {
        console.error('DB 연결 실패:', err.message);
    }
};

test();
