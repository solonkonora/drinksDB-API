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
    console.error(err); // Simply display the error as it is
  }

// // incase of deployment on any web service, automatically create tables/constraints of the db if not existing.
// pool.query('create table users if not exist(id int serial primary key, name varchar )')

console.log('Connected to the PostgreSQL database');
})

export default pool;