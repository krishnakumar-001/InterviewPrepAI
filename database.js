const mysql = require('mysql2');
require('dotenv').config();

// Connection pool create karo
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',  // XAMPP mein password blank
    database: process.env.DB_NAME || 'ai_interview_simulator',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise based connection
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Database connected successfully!');
        connection.release();
    }
});

module.exports = promisePool;