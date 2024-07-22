import express from 'express';
import pool from '../config/db_connection.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
config();

const router = express.Router();

// import swaggerUi from 'swagger-ui-express';
// import YAML from 'yamljs';


// const swaggerDocument = YAML.load('./documentary/swagger-specs.yaml');

// // mounting the Swagger UI middleware:
// router.use('/api-docs', swaggerUi.serve);
// router.get('/api-docs', swaggerUi.setup(swaggerDocument));

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

router.get('/:id', async (req, res, next) => {
  try {
      const { id } = req.params; // Get the review ID from the URL

      const query = `SELECT * FROM Reviews WHERE id = $1`;
      const values = [id];
      const { rows } = await pool.query(query, values);

      if (rows.length === 1) {
          return res.status(404).json({ error: 'Review not found' }); // Handle case where no review is found
      }

      res.json(rows[0]); // Send the specific review data
  } catch (error) {
      next(error);
  }
});


// Like a review
router.post('/', async (req, res, next) => {
  try {
    const { drinkId, rating, comment } = req.body; // Get data from the request body

    // Generate a unique id
    const id = uuidv4(); 

    // Construct the SQL INSERT query
    const insertQuery = `
      INSERT INTO Reviews (id, drinkId, rating, comment)
      VALUES ($1, $2, $3, $4)
    `;

    // Execute the query with the provided data
    await pool.query(insertQuery, [id, drinkId, rating, comment]);

    // Send a success response
    res.status(201).json({ message: 'Review created', id }); 
  } catch (error) {
    // Handle any errors that occur during the process
    next(error); 
  }
});


export default router;