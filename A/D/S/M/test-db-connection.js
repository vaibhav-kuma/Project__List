// Quick database connection test
require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing database connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dealscout',
  user: process.env.DB_USER || 'dealscout',
  password: process.env.DB_PASSWORD || 'dealscout123',
  connectionTimeoutMillis: 5000,
});

pool.connect(async (err, client) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  
  try {
    const result = await client.query('SELECT 1 as status');
    console.log('✓ Database connection successful!');
    console.log('Result:', result.rows);
  } catch (e) {
    console.error('Query error:', e);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
});
