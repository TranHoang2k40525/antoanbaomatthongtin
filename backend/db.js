// db.js - mssql connection
const sql = require('mssql');

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'AuthDB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const poolPromise = new sql.ConnectionPool(config).connect().then(pool => {
  console.log('Connected to MSSQL');
  return pool;
}).catch(err => {
  console.error('Database Connection Failed! ', err);
  throw err;
});

module.exports = { sql, poolPromise };