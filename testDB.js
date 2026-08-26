require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: '64.227.165.203',  // 호스트명 대신 IP 직접 지정
      user: process.env.DB_USER,
      password: process.env.DB_PW,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      connectTimeout: 20000
    });
    console.log('✅ 연결 성공');
    const [rows] = await conn.query('SELECT 1+1 AS result');
    console.log(rows);
    await conn.end();
  } catch (err) {
    console.error('❌ 연결 실패:', err);
  }
}

test();