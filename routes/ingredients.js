import express from 'express';
import pool from '../db_config/db_connection.js'
import { config } from 'dotenv';
config();


import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const router = express.Router();

const swaggerDocument = YAML.load('./documentary/swagger-specs.yaml');

// mounting the Swagger UI middleware:
router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerDocument));


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
router.get('/:drinkId', (req, res, next) => {
    const { drinkId } = req.params;

    const query = `
    SELECT i.*
    FROM DrinksIngredients di
    JOIN Ingredients i ON di.ingredient_id = i.id
    WHERE di.drink_id = $1
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
router.post('/', (req, res, next) => {
    const { name } = req.body;

    pool.query('SELECT 1 FROM Ingredients WHERE name = $1', [name], (error, result) => {
        if (error) {
            next(error);
            return;
        } else if (result.rows.length > 0) {
            return res.status(400).json({ error: 'Ingredient already exists' });
        } else {
            const query = 'INSERT INTO Ingredients (name) VALUES ($1) RETURNING *';
            const values = [name];

            pool.query(query, values, (error, result) => {
                if (error) {
                    next(error);
                    return;
                } else {
                    res.status(200).json(result.rows[0]);
                }
            });
        }
    });
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