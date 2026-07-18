require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, 'certs/ca.pem'))
    },
    waitForConnections: true,
});

module.exports = db;