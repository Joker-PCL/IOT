require("dotenv").config();
const mysql = require('mysql2/promise');
const DB_HOST = process.env.NODE_ENV === 'production' ? process.env.DB_PRODUCTION_HOST : process.env.DB_TEST_HOST;

const pool = mysql.createPool({
  host: DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_MAIN_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10, // ตั้งจำนวนสูงสุดของ connection pool
  queueLimit: 0,
  multipleStatements: true,
});

module.exports = pool;
