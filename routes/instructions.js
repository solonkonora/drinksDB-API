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
        const query = 'SELECT * FROM Instructions';
        const { rows } = await pool.query(query)
        res.send(rows)
    }
    catch (error) {
        next(error)
    }
});

// Get instruction for a drink by id
router.get('/:drink_id', async (req, res, next) => {
    const { drink_id } = req.params;

    try {
        const query = 'SELECT * FROM Instructions WHERE drink_id = $1';
        const values = [drink_id];
        const { rows } = await pool.query(query, values);
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
});

// create a instructions for a drink
router.post('/:drink_id', async (req, res, next) => {
    const { drink_id } = req.params;
    const instructions = req.body.instructions; // Assuming the request body contains an "instructions" array

    const query = 'INSERT INTO Instructions (drink_id, step_number, description) VALUES ($1, $2, $3) RETURNING *';

    try {
        const results = await Promise.all(instructions.map(async (instruction) => {
            const { step_number, description } = instruction;
            const values = [drink_id, step_number, description];
            const { rows } = await pool.query(query, values);
            return rows[0];
        }));
        res.status(200).json(results);
    } catch (error) {
        next(error);
    }
});

//update an instruction
router.put('/:id', async (req, res, next) => {
    const { id } = req.params;
    const { step_number, description } = req.body;

    try {
        const query = 'UPDATE Instructions SET step_number = $1, description = $2 WHERE id = $3 RETURNING *';
        const values = [step_number, description, id];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Instruction not found' });
        } else {
            res.status(200).json(rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// delete an instruction
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM Instructions WHERE id = $1';
        const values = [id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Instruction not found' });
        } else {
            res.status(204).send();
        }
    } catch (error) {
        next(error);
    }
});

export default router;