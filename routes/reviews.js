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


export default router;