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

// incase of deployment on any web service, automatically create tables/constraints of the db if not existing.
// pool.query('create table users if not exist(id int serial primary key, name varchar )')

// Create the drinks table
pool.query(`
  CREATE TABLE IF NOT EXISTS drinks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    alcoholic BOOLEAN,
    category VARCHAR(50),
    image_path TEXT,
    instructions TEXT
  )
`, (err, res) => {
  if (err) {
    console.error('Error creating drinks table:', err);
  } else {
    console.log('Drinks table created successfully.');
  }
});

// Create the ingredients table
pool.query(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
  )
`, (err, res) => {
  if (err) {
    console.error('Error creating ingredients table:', err);
  } else {
    console.log('Ingredients table created successfully.');
  }
});

// Create the drinksIngredients table
pool.query(`
  CREATE TABLE IF NOT EXISTS drinksIngredients (
    id SERIAL PRIMARY KEY,
    drink_id INT,
    ingredient_id INT,
    quantity NUMERIC,
    measurement TEXT,
    FOREIGN KEY (drink_id) REFERENCES drinks(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  )
`, (err, res) => {
  if (err) {
    console.error('Error creating drinksIngredients table:', err);
  } else {
    console.log('DrinksIngredients table created successfully.');
  }
});

// Create the reviews table
pool.query(`
  CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    drink_id INT,
    rating NUMERIC(2,1),
    comment TEXT,
    FOREIGN KEY (drink_id) REFERENCES drinks(id)
  )
`, (err, res) => {
  if (err) {
    console.error('Error creating reviews table:', err);
  } else {
    console.log('Reviews table created successfully.');
  }
});


console.log('Connected to the PostgreSQL database');
})

export default pool;