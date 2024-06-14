import express from 'express';
//import { createCloudinaryFolder, setupImageFolders, uploadImageToFolder } from '../db_config/cloudinary_config.js';
import pool from '../db_config/db_connection.js'
import { config } from 'dotenv';
config();

// import swaggerUi from 'swagger-ui-express';
 //import YAML from 'yamljs';

const router = express.Router();

//const swaggerDocument = YAML.load('./documentary/swagger-specs.yaml');

// // mounting the Swagger UI middleware:
// router.use('/api-docs', swaggerUi.serve);
// router.get('/api-docs', swaggerUi.setup(swaggerDocument));


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


// // post 
// router.post('/', async (req, res) => {
//   try {
//     const { name, description, alcoholic, category, image_path } = req.body;

    // // Upload the image to Cloudinary
    // const folderName = 'food-images'; 
    // const uploadedImage = await uploadImageToFolder(image_path, folderName);

    // // Get the URL path of the uploaded image
    // const imageUrl = uploadedImage.secure_url;

//     // Save the recipe details, including the image path, to the database
//     const query = 'INSERT INTO Drinks (name, description, alcoholic, category, image_path) VALUES ($1, $2, $3, $4, $5) RETURNING *';
//     const values = [name, description, alcoholic, category, image_path];
//     const { rows } = await pool.query(query, values);

//     res.status(201).json(rows[0]);
//   } catch (error) {
//     console.log(error)
//     res.status(500).json({ error: 'Failed to create recipe' });
//   }
// });

// POST a new drink
router.post('/', async (req, res, next) => {
  const { name, description, alcoholic, category, image_path } = req.body;

  try {
    // Check if ingredients exist, create new ones if necessary
    const ingredientIds = await Promise.all(ingredientIds.map(async (ingredient) => {
      const result = await pool.query('SELECT 1 FROM Ingredients WHERE name = $1', [ingredient.name]);
      if (result.rows.length === 0) {
        // Create new ingredient
        const createResult = await pool.query('INSERT INTO Ingredients (name) VALUES ($1) RETURNING *', [ingredient.name]);
        return createResult.rows[0].id;
      } else {
        return result.rows[0].id;
      }
    }));

    // Create the drink record
    const drinkResult = await pool.query('INSERT INTO Drinks (name, description, alcoholic, category, image_path) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, description, alcoholic, category, image_path]);
    const drinkId = drinkResult.rows[0].id;

    // Associate ingredients with the drink
    await Promise.all(ingredientIds.map(async (ingredientId) => {
      await pool.query('INSERT INTO DrinkIngredients (drink_id, ingredient_id) VALUES ($1, $2)', [drinkId, ingredientId]);
    }));

    res.status(201).json(drinkResult.rows[0]);
  } catch (error) {
    next(error);
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
      const existingIngredientResult = await pool.query('SELECT ingredient_id FROM DrinkIngredients WHERE drink_id = $1', [id]);
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
        await pool.query('DELETE FROM DrinkIngredients WHERE drink_id = $1 AND ingredient_id = $2', [id, ingredientId]);
      }));

      // 4. Insert new DrinkIngredients records
      await Promise.all(newIngredientIds.map(async (ingredientId) => {
        await pool.query('INSERT INTO DrinkIngredients (drink_id, ingredient_id) VALUES ($1, $2)', [id, ingredientId]);
      }));
    }

    res.json(rows[0]); // Return the updated drink
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drink' });
  }
});

// Delete a recipe
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