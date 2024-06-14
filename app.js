import createError from 'http-errors';
import express, { json, urlencoded} from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';


import indexRouter from './routes/index.js';
import ingredientsRouter from './routes/ingredients.js';
import drinksRouter from './routes/drinks.js';


const app = express();


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/ingredients', ingredientsRouter);
app.use('/drinks', drinksRouter);


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
