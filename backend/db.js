const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// In Docker the CA cert is at /app/ca.pem; locally it lives one level up from /backend
const caPath = fs.existsSync('/app/ca.pem')
  ? '/app/ca.pem'
  : path.resolve(__dirname, '..', 'ca.pem');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
});

module.exports = pool;
