import express from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const { Pool } = pkg;
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  dialect: 'postgres'
});

//handle connection error
pool.connect((err) => {
    if (err) {
  console.error('error connecting to the database:', err);
  throw err;
};

console.log('Connected to the PostgreSQL database');
})

export default pool;