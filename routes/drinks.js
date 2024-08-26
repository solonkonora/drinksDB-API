import express from 'express';
import cloudinary from '../config/cloudinary_config.js';
// import { createCloudinaryFolder, uploadImageToFolder } from '../utils/image_utils.js';
import imageUtil from '../utils/image_util.js'
import validateDrinkData from '../utils/validation.js';
import pool from '../config/db_connection.js'
import multer from 'multer';
import fs from 'fs';
import { config } from 'dotenv';
config();

const router = express.Router();

// async function uploadDrinkImage(imagePath) {
//   await setupImageFolders(); // Ensure the 'drinks-images' folder exists
//   const uploadResult = await uploadImageToFolder(imagePath, 'drinks-images');
//   console.log('Uploaded image:', uploadResult.secure_url);
// }

// //Call the function to upload an image
// uploadDrinkImage('./images/purple.png');


// Function to get a drink by ID
// const getDrinkById = async (id) => {
//   const query = `
//     SELECT
//       d.id,
//       d.name,
//       d.description,
//       d.alcoholic,
//       d.category,
//       d.image_path,
//       d.instructions,
//       COALESCE(json_agg(json_build_object(
//         'name', i.name,
//         'quantity', di.quantity,
//         'measurement', di.measurement
//       )), '[]') AS ingredients
//     FROM Drinks d
//     LEFT JOIN DrinksIngredients di ON d.id = di.DrinkId
//     LEFT JOIN Ingredients i ON di.IngredientId = i.id
//     WHERE d.id = $1
//     GROUP BY d.id;
//   `;

//   const { rows } = await pool.query(query, [id]);

//   if (rows.length === 0) {
//     return null; // No drink found
//   }

//   return rows[0];
// };

async function getDrinkById(id) {
  try {
    // Validate the id
    if (isNaN(id) || id === '' || typeof id === 'undefined') {
      return { error: 'Invalid drink ID' };
    }

    // Convert to integer
    const drinkId = parseInt(id, 10);

    const getDrinkQuery = `
      SELECT * FROM Drinks WHERE id = $1;
    `;
    const getDrinkResult = await pool.query(getDrinkQuery, [drinkId]);
    return getDrinkResult.rows[0];
  } catch (error) {
    console.error('Error getting drink by ID:', error);
    throw error;
  }
}

// Get all drinks
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT
        d.id,
        d.name,
        d.description,
        d.alcoholic,
        d.category,
        d.image_path,
        d.instructions,
        COALESCE(json_agg(json_build_object(
          'name', i.name,
          'quantity', di.quantity,
          'measurement', di.measurement
        )), '[]') AS ingredients
      FROM Drinks d
      LEFT JOIN DrinksIngredients di ON d.id = di.DrinkId
      LEFT JOIN Ingredients i ON di.IngredientId = i.id
      GROUP BY d.id
      ORDER BY d.id;
    `;

    const { rows } = await pool.query(query);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No drinks found' });
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error });
  }
});

// Route to get a drink by ID
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id; // Get the id from the request URL

    // Call the getDrinkById function
    const drink = await getDrinkById(id);

    if (!drink) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    res.status(200).json(drink);
  } catch (error) {
    console.error('Error getting drink by ID:', error);
    next(error);
  }
});



// Create the 'uploads/drinks' directory if it doesn't exist
fs.mkdirSync('uploads/drinks', { recursive: true }, (err) => {
  if (err) {
    console.error("Error creating directory:", err);
    // Handle the error appropriately (e.g., exit the process)
  } else {
    console.log("Directory created successfully.");

    // Set permissions
    fs.chmodSync('uploads/drinks', 0o755, (err) => {
      if (err) {
        console.error("Error setting permissions:", err);
        // Handle the error appropriately
      } else {
        console.log("Permissions set successfully.");
      }
    });
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/drinks'); // Set the upload directory
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname); // Generate a unique filename
    },
  }),
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Route to create a new drink
// router.post('/', upload.single('image_path'), async (req, res, next) => {
//   try {
//     // Log the incoming data
//     console.log('req.body:', req.body);

//     // 1. Parse Form Data
//     const { name, description, alcoholic, category, instructions, ingredients } = req.body;

//     // Convert ingredients to an array if it's a string
//     let parsedIngredients = ingredients;
//     if (typeof ingredients === 'string') {
//       parsedIngredients = JSON.parse(ingredients);
//     }

//     // 2. Validate Data
// const validationError = validateDrinkData({
//   name,
//   description,
//   alcoholic,
//   category,
//   instructions,
//   ingredients: parsedIngredients,
// });
// if (validationError) {
//   return res.status(400).json(validationError);
// }

//     // 3. Check for Duplicate Drink Name
//     const checkDrinkQuery = `
//         SELECT 1 FROM Drinks WHERE name = $1;
//       `;
//     const checkDrinkResult = await pool.query(checkDrinkQuery, [name]);

//     if (checkDrinkResult.rows.length > 0) {
//       return res.status(409).json({ error: 'A drink with that name already exists' });
//     }

//     // 4. Image Upload (if available)
//     let imageUrl = null;
//     if (req.file) {
//       try {
//         // Create the Cloudinary folder if it doesn't exist
//         await imageUtil.createCloudinaryFolder('drinks-images');

//         // Upload the image to Cloudinary
//         const uploadResult = await cloudinary.uploader.upload(req.file.path, {
//           // ... your Cloudinary upload options
//         });
//         imageUrl = uploadResult.secure_url;

//         // Return the imageUrl before proceeding with drink creation
//         return res.status(200).json({ imageUrl });
//       } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Error uploading image to Cloudinary' });
//       }
//     } else {
//       // Handle the case where no image is provided
//       return res.status(400).json({ error: 'Image is required' });
//     }

//     // 5. Create Drink and Ingredients (with Transaction)
//     try {
//       await pool.query('BEGIN');
//       try {
//         // 5.1 Create Drink
//         const createDrinkQuery = `
//         INSERT INTO Drinks (name, description, alcoholic, category, image_path, instructions)
//         VALUES ($1, $2, $3, $4, $5, $6)
//         RETURNING id;
//       `;

//         const createDrinkValues = [
//           name,
//           description,
//           alcoholic,
//           category,
//           imageUrl,
//           instructions,
//         ];

//         const createDrinkResult = await pool.query(
//           createDrinkQuery,
//           createDrinkValues
//         );
//         const newDrinkId = parseInt(createDrinkResult.rows[0].id, 10);

//         // 5.2 Create Ingredients
//         if (Array.isArray(parsedIngredients)) {
//           // Move the await outside Promise.all
//           const createDrinksIngredientsValues = await Promise.all(
//             parsedIngredients.map(async (ingredient) => {
//               // Retrieve IngredientId from Ingredients table
//               const ingredientResult = await pool.query(
//                 'SELECT id FROM Ingredients WHERE name = $1',
//                 [ingredient.name]
//               );
//               stylus

//               let ingredientId;
//               if (ingredientResult.rows.length > 0) {
//                 ingredientId = ingredientResult.rows[0].id;
//               } else {
//                 // Ingredient not found, insert it
//                 const insertIngredientResult = await pool.query(
//                   'INSERT INTO Ingredients (name) VALUES ($1) RETURNING id',
//                   [ingredient.name]
//                 );
//                 ingredientId = insertIngredientResult.rows[0].id;
//               }

//               // **Important: Use the newDrinkId from the previous step**
//               return [newDrinkId, ingredientId, ingredient.quantity, ingredient.measurement];
//             })

//           );

//           // Execute ingredient insertion queries
//           for (let i = 0; i < parsedIngredients.length; i++) {
//             await pool.query(
//               'INSERT INTO DrinksIngredients (DrinkId, IngredientId, quantity, measurement) VALUES ($1, $2, $3, $4)',
//               createDrinksIngredientsValues[i]
//             );
//           }

//           await pool.query('COMMIT');

//           // Return success response
//           res.status(201).json({ drinkId: newDrinkId });
//         } else {
//           // Handle the case where ingredients is not an array
//           console.error('Error: ingredients is not an array.');
//           res.status(400).json({ error: 'Invalid ingredients data.' });
//           return; // Stop further processing
//         }
//       } catch (error) {
//         await pool.query('ROLLBACK');
//         console.error(error);
//         next(error);
//       }
//     } catch (error) {
//       console.error(error);
//       next(error);
//     }
//   } catch (error) {
//     console.error(error);
//     next(error);
//   }
// }); latest uploading image








// Route to create a new drink


// Helper function to upload an image to Cloudinary

async function uploadImageToCloudinary(imagePath) {
  try {
    // Create the Cloudinary folder if it doesn't exist
    await imageUtil.createCloudinaryFolder('drinks-images');

    // Upload the image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(imagePath, {
    });
    return uploadResult.secure_url;
  } catch (error) {
    next(error);
  }
}

router.post('/', upload.single('image_path'), async (req, res, next) => {
  try {
    // Log the incoming data
    console.log('req.body:', req.body);

    // 1. Parse Form Data
    const { name, description, alcoholic, category, instructions, ingredients } = req.body;

    // Convert ingredients to an array if it's a string
    let parsedIngredients = ingredients;
    if (typeof ingredients === 'string') {
      parsedIngredients = JSON.parse(ingredients);
    }

    // 2. Validate Data
    const validationError = validateDrinkData({
      name,
      description,
      alcoholic,
      category,
      instructions,
      ingredients: parsedIngredients,
    });
    if (validationError) {
      return res.status(400).json(validationError);
    }

    // 3. Check for Duplicate Drink Name
    const checkDrinkQuery = `
        SELECT 1 FROM Drinks WHERE name = $1;
      `;
    const checkDrinkResult = await pool.query(checkDrinkQuery, [name]);

    if (checkDrinkResult.rows.length > 0) {
      return res.status(409).json({ error: 'A drink with that name already exists' });
    }

    // 4. Handle Image Upload (if available)
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadImageToCloudinary(req.file.path);
    } else {
      // Handle the case where no image is provided
      return res.status(400).json({ error: 'Image is required' });
    }

    // 5. Create Drink and Ingredients (with Transaction)
    await pool.query('BEGIN');
    try {
      // 5.1 Create Drink
      const createDrinkQuery = `
        INSERT INTO Drinks (name, description, alcoholic, category, image_path, instructions)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `;

      const createDrinkValues = [
        name,
        description,
        alcoholic,
        category,
        imageUrl,
        instructions,
      ];

      const createDrinkResult = await pool.query(
        createDrinkQuery,
        createDrinkValues
      );
      const newDrinkId = parseInt(createDrinkResult.rows[0].id, 10);

      // 5.2 Create Ingredients
      if (Array.isArray(parsedIngredients)) {
        for (let i = 0; i < parsedIngredients.length; i++) {
          const ingredient = parsedIngredients[i];
          // Retrieve IngredientId from Ingredients table
          const ingredientResult = await pool.query(
            'SELECT id FROM Ingredients WHERE name = $1',
            [ingredient.name]
          );

          let ingredientId;
          if (ingredientResult.rows.length > 0) {
            ingredientId = ingredientResult.rows[0].id;
          } else {
            // Ingredient not found, insert it
            const insertIngredientResult = await pool.query(
              'INSERT INTO Ingredients (name) VALUES ($1) RETURNING id',
              [ingredient.name]
            );
            ingredientId = insertIngredientResult.rows[0].id;
          }

          // Insert the ingredient into DrinksIngredients
          await pool.query(
            'INSERT INTO DrinksIngredients (DrinkId, IngredientId, quantity, measurement) VALUES ($1, $2, $3, $4)',
            [newDrinkId, ingredientId, ingredient.quantity, ingredient.measurement]
          );
        }

        await pool.query('COMMIT');

        // Return success response
        return res.status(201).json({ drinkId: newDrinkId });
      } else {
        // Handle the case where ingredients is not an array
        return res.status(400).json({ error: 'Invalid ingredients data.' });
      }
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(error);
      next(error);
    }
  } catch (error) {
    console.error(error);
    next(error);
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
// async function getDrinkById(id) {
//   try {
//     const query = 'SELECT * FROM Drinks WHERE id = $1';
//     const values = [id];
//     const { rows } = await pool.query(query, values);
//     return rows[0];
//   } catch (error) {
//     next(error);
//   }
// }

export default router;