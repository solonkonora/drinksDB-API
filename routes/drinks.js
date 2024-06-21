import express from 'express';
//import Joi from 'joi';
import { createCloudinaryFolder, setupImageFolders, uploadImageToFolder } from '../db_config/cloudinary_config.js';
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


async function uploadDrinkImage(imagePath) {
  await setupImageFolders(); // Ensure the 'drinks-images' folder exists
  const uploadResult = await uploadImageToFolder(imagePath, 'drinks-images');
  console.log('Uploaded image:', uploadResult.secure_url);
}

// Call the function to upload an image
uploadDrinkImage('./images/old-fashion.png');


// Get all recipes
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM Drinks';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    // res.status(500).json({ error });
    throw err;
  }
});


// Get a recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await getDrinkById(id);
    if (!recipe) {
      return res.status(404).json({ error: 'drink not found' });
    }
    res.json(recipe);
  } catch (err) {
    console.error('Error retrieving drink:', err);
    res.status(500).json({ error: 'message' });
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description, alcoholic, category, image_path, instructions, ingredients } = req.body;

    // 1. Check if a drink with the same name already exists
    const checkDrinkQuery = `
      SELECT 1 FROM Drinks WHERE name = $1;
    `;
    const checkDrinkResult = await pool.query(checkDrinkQuery, [name]);

    if (checkDrinkResult.rows.length > 0) {
      return res.status(409).json({ error: 'A drink with that name already exists' });
    }

    // 2. Upload image to Cloudinary
    let imageUrl = null;
    if (image_path) {
      await setupImageFolders();
      const uploadResult = await uploadImageToFolder(image_path, 'drinks-images');
      imageUrl = uploadResult.secure_url;
    }

    // 3. Create the drink record
    const createDrinkQuery = `
      INSERT INTO Drinks (name, description, alcoholic, category, image_path, instructions)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

    const createDrinkValues = [name, description, alcoholic, category, imageUrl, instructions];

    const createDrinkResult = await pool.query(createDrinkQuery, createDrinkValues);
    const newDrinkId = parseInt(createDrinkResult.rows[0].id, 10); // Convert to integer

    // 4. Create DrinksIngredients records
    const createDrinksIngredientsQueries = ingredients.map((ingredient) => {
      // Dynamic query for each ingredient, including DrinkId
      return `
        INSERT INTO DrinksIngredients (DrinkId, IngredientId, quantity, measurement)
        VALUES ($1, $2, $3, $4);
      `;
    });

    const createDrinksIngredientsValues = ingredients.map(async (ingredient, index) => {
      // Retrieve IngredientId from Ingredients table
      const ingredientResult = await pool.query(
        'SELECT id FROM Ingredients WHERE name = $1',
        [ingredient.name]
      );

      let ingredientId;
      if (ingredientResult.rows.length > 0) {
        // Ingredient found, get the id
        ingredientId = ingredientResult.rows[0].id;
      } else {
        // Ingredient not found, handle the error
        console.error(`Ingredient ${ingredient.name} not found in database.`);

        // . Insert the ingredient into the Ingredients table
        const insertIngredientResult = await pool.query(
          'INSERT INTO Ingredients (name) VALUES ($1) RETURNING id',
          [ingredient.name]
        );
        ingredientId = insertIngredientResult.rows[0].id;
        console.log(`Ingredient ${ingredient.name} added to Ingredients table.`);
      }

      // Dynamic values for each ingredient, including DrinkId
      return [newDrinkId, ingredientId, ingredients[index].quantity, ingredients[index].measurement];
    });

    // Execute the ingredient insertion queries in a transaction
    await pool.query('BEGIN');
    try {
      for (let i = 0; i < createDrinksIngredientsQueries.length; i++) {
        // Wait for the async operation to retrieve IngredientId
        const createDrinksIngredientsValuesForInsert = await createDrinksIngredientsValues[i];

        // Only execute the query if the ingredient was found
        if (createDrinksIngredientsValuesForInsert) {
          await pool.query(
            createDrinksIngredientsQueries[i],
            createDrinksIngredientsValuesForInsert
          );
        }
      }
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    // 5. Return success response
    res.status(201).json({ drinkId: newDrinkId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create drink' });
  }
});







// Update a drink
router.put('/:drinkId', async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.drinkId, 10); // Convert drinkId to integer
    const { name, description, alcoholic, category, image_path, instructions, ingredients } = req.body;

    // 1. Check if the drink exists
    const checkDrinkQuery = `
      SELECT 1 FROM Drinks WHERE id = $1;
    `;
    const checkDrinkResult = await pool.query(checkDrinkQuery, [drinkId]);

    if (checkDrinkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    // 2. Update drink record
    let imageUrl = null;
    if (image_path) {
      await setupImageFolders();
      const uploadResult = await uploadImageToFolder(image_path, 'drinks-images');
      imageUrl = uploadResult.secure_url;
    }

    const updateDrinkQuery = `
      UPDATE Drinks
      SET name = $1, description = $2, alcoholic = $3, category = $4, image_path = $5, instructions = $6
      WHERE id = $7;
    `;

    const updateDrinkValues = [name, description, alcoholic, category, imageUrl, instructions, drinkId];

    await pool.query(updateDrinkQuery, updateDrinkValues);

    // 3. Update DrinksIngredients records
    // 3.1 Delete existing DrinksIngredients records for this drink
    const deleteDrinksIngredientsQuery = `
      DELETE FROM DrinksIngredients WHERE DrinkId = $1;
    `;
    await pool.query(deleteDrinksIngredientsQuery, [drinkId]);

    // 3.2 Insert new DrinksIngredients records
    await pool.query('BEGIN');
    try {
      for (const ingredient of ingredients) {
        const ingredientResult = await pool.query(
          'SELECT id FROM Ingredients WHERE name = $1',
          [ingredient.name]
        );

        let ingredientId;
        if (ingredientResult.rows.length > 0) {
          ingredientId = ingredientResult.rows[0].id;
        } else {
          const insertIngredientResult = await pool.query(
            'INSERT INTO Ingredients (name) VALUES ($1) RETURNING id',
            [ingredient.name]
          );
          ingredientId = insertIngredientResult.rows[0].id;
          console.log(`Ingredient ${ingredient.name} added to Ingredients table.`);
        }

        const createDrinksIngredientsQuery = `
          INSERT INTO DrinksIngredients (DrinkId, IngredientId, quantity, measurement)
          VALUES ($1, $2, $3, $4);
        `;

        const createDrinksIngredientsValues = [drinkId, ingredientId, ingredient.quantity, ingredient.measurement];
        await pool.query(createDrinksIngredientsQuery, createDrinksIngredientsValues);
      }
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    // 4. Return success response
    res.status(200).json({ message: 'Drink updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update drink' });
  }
});



// Delete a drink
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM Drinks WHERE id = $1';
    const values = [id];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    res.status(200).send(); // Indicate successful deletion
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete drink' });
  }
});

// Function to get a recipe by ID
async function getDrinkById(id) {
  try {
    const query = 'SELECT * FROM Drinks WHERE id = $1';
    const values = [id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    throw error;
  }
}

export default router;