const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error adquiriendo cliente', err.stack);
  }
  console.log('Conectado exitosamente a la Base de Datos: ' + process.env.DB_NAME);
  release();
});

module.exports = pool;