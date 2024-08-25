const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/AppError');

const tourRouter = require('./routers/tourRouters');
const userRouter = require('./routers/userRouters');
const reviewRouter = require('./routers/reviewRouters');

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173', // Allow your frontend origin
    credentials: true, // Allow credentials if needed
  })
);

app.use(helmet()); // to set security headers

// rate limiting -->
/*
 to control the number of requests a client (typically identified by their IP address) can make to a server within a specified time frame. + ensures fair usage
 */

const rateLimiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // a certain ip can send max of 100 req to the api every 15 min
  message: 'Too many requests received from this IP. Try again later.',
});

app.use('/api', rateLimiter);

// creating a middleware to get the time when the request made --> "morgan" can be used 🙀

/*
const getReqTime = (req, res, next) => {

    const reqTime = new Date().toISOString()
    console.log(`${req.method} to ${req.url} at ${reqTime}`)
    next()  // ! do not forget to call next(), otherwise response will be left hanging
}

app.use(getReqTime)

*/

// * MIDDLEWARES * \\

/* The express.json() middleware function acts as a parser. It takes the raw request body and transforms it into a format that's easier to work with (in this case, JSON). After the middleware processes the request body, you can access the JSON data sent with the request using req.body in your route handlers. ==>
 */

app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use(mongoSanitize()); // data sanitization against no-sql query injection

app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
); // prevent against parameter pollution attacks

// only log if we are in dev mode
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// mounting routers
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// handle non-existing routes
app.use('*', (req, res, next) => {
  const err = new AppError(
    `Requested path ${req.originalUrl} does not exist !`,
    404
  );

  next(err);
});

// use the global error handler
app.use(globalErrorHandler);

// ! make sure to export app to server.js 😡
module.exports = app;
