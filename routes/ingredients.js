import express from 'express';
import pool from '../config/db_connection.js'
import { config } from 'dotenv';
config();

const router = express.Router();

// GET all ingredients
router.get('/', (req, res, next) => {
    const query = 'SELECT * FROM Ingredients';

    pool.query(query, (error, result) => {
        if (error) {
            next(error);
            return;
        } else {
            res.json(result.rows);
        }
    });
});

// GET ingredients for a specific drink
router.get('/api/:drinkId/ingredients', (req, res, next) => {
    const { drinkId } = req.params;

    const query = `
    SELECT i.*
    FROM Drinks d
    JOIN DrinksIngredients di ON d.id = di.drink_id
    JOIN Ingredients i ON di.ingredient_id = i.id
    WHERE d.id = $1
  `;
    const values = [drinkId];

    pool.query(query, values, (error, result) => {
        if (error) {
            next(error);
            return;
        } else {
            res.json(result.rows);
        }
    });
});

// POST a new ingredient
router.post('/', async (req, res, next) => {
    try {
      const { ingredients } = req.body; // Assuming the request body has an "ingredients" array
  
      // Check if the "ingredients" array is valid
      if (!Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'Invalid request body. Expected an array of ingredients.' });
      }
  
      // Loop through each ingredient and insert it
      const insertedIngredients = [];
      for (const ingredient of ingredients) {
        const { name } = ingredient; 
        
        // Check if ingredient already exists
        const existsResult = await pool.query('SELECT 1 FROM Ingredients WHERE name = $1', [name]);
        if (existsResult.rows.length > 0) {
          return res.status(400).json({ error: `Ingredient '${name}' already exists.` });
        }
  
        // Insert new ingredient
        const query = 'INSERT INTO Ingredients (name) VALUES ($1) RETURNING *';
        const values = [name];
        const { rows } = await pool.query(query, values);
  
        insertedIngredients.push(rows[0]);
      }
  
      res.status(201).json(insertedIngredients); // Return the array of inserted ingredients
    } catch (error) {
      next(error);
    }
  });

// PUT (Update) an ingredient
router.put('/:id', (req, res, next) => {
    const { id } = req.params;
    const { name } = req.body;

    const query = 'UPDATE Ingredients SET name = $1 WHERE id = $2 RETURNING *';
    const values = [name, id];

    pool.query(query, values, (error, result) => {
        if (error) {
            next(error);
            return
        } else {
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Ingredient not found' });
            } else {
                res.json(result.rows[0]);
            }
        }
    });
});

// DELETE an ingredient
router.delete('/:id', (req, res, next) => {
    const { id } = req.params;

    const query = 'DELETE FROM Ingredients WHERE id = $1';
    const values = [id];

    pool.query(query, values, (error, result) => {
        if (error) {
            next(error)
            return;
        } else {
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Ingredient not found' });
            } else {
                res.status(204).send();
            }
        }
    });
});

export default router;