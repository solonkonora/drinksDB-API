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


router.post('/', async (req, res) => {
  try {
    // 1) validation
    const { name, description, alcoholic, category, image_path, instructions, ingredients } = req.body;

    // 2. Check if a drink with the same name already exists
    const checkDrinkQuery = `
SELECT 1 FROM Drinks WHERE name = $1;
`;
    const checkDrinkResult = await pool.query(checkDrinkQuery, [name]);

    if (checkDrinkResult.rows.length > 0) {
      return res.status(409).json({ error: 'A drink with that name already exists' });
    }

 
    // 3. Upload image to Cloudinary
    let imageUrl = null;
    if (image_path) {
      await setupImageFolders();
      const uploadResult = await uploadImageToFolder(image_path, 'drinks-images');
      imageUrl = uploadResult.secure_url;
    }

    // 4. Create the drink record
    const createDrinkQuery = `
      INSERT INTO Drinks (name, description, alcoholic, category, image_path, instructions)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

    const createDrinkValues = [name, description, alcoholic, category, imageUrl, instructions];

    const createDrinkResult = await pool.query(createDrinkQuery, createDrinkValues);
    const newDrinkId = createDrinkResult.rows[0].id;

 // 3. Create DrinksIngredients records
 const createDrinksIngredientsQueries = ingredients.map((ingredient) => {
  // Check if ingredient exists, insert if not
  return `
INSERT INTO Ingredients (name)
SELECT $1
WHERE NOT EXISTS (SELECT 1 FROM Ingredients WHERE name = $1)
RETURNING id;
`;
});

// Define createDrinksIngredientsValues here, before the for loop
const createDrinksIngredientsValues = ingredients.map((ingredient) => {
  return [ingredient.name]; // Only pass the ingredient name for insertion
});

// Execute the ingredient insertion queries in a transaction
await pool.query('BEGIN'); // Start transaction
try {
  for (let i = 0; i < createDrinksIngredientsQueries.length; i++) {
    // Always execute the insert query, even if the ingredient exists
    const insertResult = await pool.query(createDrinksIngredientsQueries[i], createDrinksIngredientsValues[i]);

    // Check if a row was inserted (this will be true even if the ingredient already existed)
    if (insertResult.rows.length > 0) {
      const ingredientId = insertResult.rows[0].id; // Get the ID of the newly inserted ingredient

      // Now create the DrinksIngredients record
      const createDrinksIngredientsQuery = `
        INSERT INTO DrinksIngredients (DrinkId, IngredientId, quantity, measurement)
        VALUES ($1, $2, $3, $4);
      `;

      const createDrinksIngredientsValuesForInsert = [newDrinkId, ingredientId, ingredients[i].quantity, ingredients[i].measurement];
      await pool.query(createDrinksIngredientsQuery, createDrinksIngredientsValuesForInsert);
    } else {
      // Handle the case where the ingredient already exists (e.g., log a message, skip the insert, etc.)
      console.log(`Ingredient '${ingredients[i].name}' already exists.`);
    }
  }
  await pool.query('COMMIT'); // Commit transaction
} catch (error) {
  await pool.query('ROLLBACK'); // Rollback transaction on error
  throw error;
}

    // 4. Return success response
    res.status(201).json({ drinkId: newDrinkId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create drink' });
  }
});







// Update a drink
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, alcoholic, category, image_path, ingredients } = req.body;

    // Update the drink record
    const query = 'UPDATE Drinks SET name = $1, description = $2, alcoholic = $3, category = $4, image_path = $5 WHERE id = $6 RETURNING *';
    const values = [name, description, alcoholic, category, image_path, id];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    // Update DrinkIngredients table (if necessary)
    if (ingredients) { // Check if ingredients are provided in the request
      // 1. Get existing ingredient IDs for this drink
      const existingIngredientResult = await pool.query('SELECT ingredient_id FROM DrinksIngredients WHERE drink_id = $1', [id]);
      const existingIngredientIds = existingIngredientResult.rows.map(row => row.ingredient_id);

      // 2. Find new ingredients and create them if necessary
      const newIngredients = ingredients.filter(ingredient => !existingIngredientIds.includes(ingredient.id));
      const newIngredientIds = await Promise.all(newIngredients.map(async (ingredient) => {
        const result = await pool.query('SELECT 1 FROM Ingredients WHERE name = $1', [ingredient.name]);
        if (result.rows.length === 0) {
          // Create new ingredient
          const createResult = await pool.query('INSERT INTO Ingredients (name) VALUES ($1) RETURNING *', [ingredient.name]);
          return createResult.rows[0].id;
        } else {
          return result.rows[0].id;
        }
      }));

      // 3. Delete old DrinkIngredients records that are no longer needed
      const deletedIngredientIds = existingIngredientIds.filter(id => !ingredients.some(ingredient => ingredient.id === id));
      await Promise.all(deletedIngredientIds.map(async (ingredientId) => {
        await pool.query('DELETE FROM DrinksIngredients WHERE drink_id = $1 AND ingredient_id = $2', [id, ingredientId]);
      }));

      // 4. Insert new DrinkIngredients records
      await Promise.all(newIngredientIds.map(async (ingredientId) => {
        await pool.query('INSERT INTO DrinksIngredients (drink_id, ingredient_id) VALUES ($1, $2)', [id, ingredientId]);
      }));
    }

    res.json(rows[0]); // Return the updated drink
  } catch (error) {
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
    // Handle error appropriately (e.g., throw, log, return null)
    throw error; // Example: re-throw the error
  }
}

export default router;