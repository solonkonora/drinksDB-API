import express from 'express';
//import { createCloudinaryFolder, setupImageFolders, uploadImageToFolder } from '../db_config/cloudinary_config.js';
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

// DrinksIngredients endpoint
router.get('/:drinkId/ingredients', async (req, res, next) => {
    try {
        const { drinkId } = req.params;

        // Get ingredients for the specified drink
        const query = `
        SELECT i.name, i.description, di.quantity
        FROM DrinksIngredients di
        JOIN Ingredients i ON di.ingredient_id = i.id
        WHERE di.drink_id = $1
      `;
        const values = [drinkId];
        const { rows } = await pool.query(query, values);

        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// Add an ingredient to a drink
router.post('/:drinkId/ingredients', async (req, res, next) => {
    try {
        const { drinkId } = req.params;
        const { ingredientId, quantity } = req.body;

        // Check if ingredient exists
        const ingredientResult = await pool.query('SELECT 1 FROM Ingredients WHERE id = $1', [ingredientId]);
        if (ingredientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ingredient not found' });
        }

        // Insert new DrinksIngredient record
        const query = 'INSERT INTO DrinksIngredients (drink_id, ingredient_id, quantity) VALUES ($1, $2, $3) RETURNING *';
        const values = [drinkId, ingredientId, quantity];
        const { rows } = await pool.query(query, values);

        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// Delete an ingredient from a drink
router.delete('/:drinkId/ingredients/:ingredientId', async (req, res, next) => {
    try {
        const { drinkId, ingredientId } = req.params;

        // Delete DrinksIngredient record
        const query = 'DELETE FROM DrinksIngredients WHERE drink_id = $1 AND ingredient_id = $2';
        const values = [drinkId, ingredientId];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Ingredient not found in drink' });
        }

        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

export default router;