import createError from 'http-errors';
import express, { json, urlencoded} from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';

import indexRouter from './routes/index.js';
import ingredientsRouter from './routes/ingredients.js';
import drinksRouter from './routes/drinks.js';
import drinksingredientsRouter from './routes/drinksingredients.js';
import instructionsRouter from './routes/instructions.js';
import reviewsRouter from './routes/reviews.js'

const app = express();

const swaggerDocument = YAML.load('./documentary/swagger-specs.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/drinks', drinksRouter);
app.use('/api/drinksingredients', drinksingredientsRouter);
app.use('/api/instructions', instructionsRouter);
app.use('/api/reviews', reviewsRouter)


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  res.status(err.status || 500);
  // console.log the error
  console.error(err)
  // send and error error message with the status code
  res.send({ message: err.message })
});

export default app;
