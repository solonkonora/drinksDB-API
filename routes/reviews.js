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

router.get('/', async (req, res, next) => {
    try {
        const query = 'SELECT * FROM Reviews';
        const { rows } = await pool.query(query)
        res.send(rows)
    }
    catch (error) {
        next(error)
    }
});


// Get all reviews for a specific drink
router.get('/:drinkId/reviews', async (req, res, next) => {
    try {
        const { drinkId } = req.params;

        const query = `SELECT * FROM Reviews WHERE drink_id = $1`;
        const values = [drinkId];
        const { rows } = await pool.query(query, values);

        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// Create a new review for a drink
router.post('/:drinkId/reviews', async (req, res, next) => {
    try {
        const { drinkId } = req.params;
        const { rating, comment, like } = req.body;

        const query = `
      INSERT INTO Reviews (drink_id, rating, comment, like)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const values = [drinkId, rating, comment, like];
        const { rows } = await pool.query(query, values);

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// Update an existing review
router.put('/:drinkId/reviews/:reviewId', async (req, res, next) => {
    try {
        const { drinkId, reviewId } = req.params;
        const { rating, comment, like } = req.body;

        const query = `UPDATE Reviews SET rating = $1, comment = $2, like = $3 WHERE id = $4 RETURNING *`;
        const values = [rating, comment, like, reviewId];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// Delete a review
router.delete('/:drinkId/reviews/:reviewId', async (req, res, next) => {
    try {
        const { drinkId, reviewId } = req.params;

        const query = `DELETE FROM Reviews WHERE id = $1`;
        const values = [reviewId];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;