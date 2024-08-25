const mongoose = require('mongoose');

// ! for dotenv the following order must be assured
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');

// handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('uncaught exception 😡');
  console.log(err.name, err.message);
  process.exit(1);
});

// this connect function returns a promise -> here we handled the promise using then /catch (in our app if there is any unhandled promise rejections they will be handled by the error handler below)
mongoose
  .connect(process.env.DB_STRING)
  .then(() => console.log('DB connection successful!'))
  .catch((err) => {
    console.log('Could not connect to db -> ' + err);
    process.exit(1);
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}...`);
});

// unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
  console.log('Unhandled rejection occurred 😡 ');
  console.log(err.name, err.message);
  server.close(() => {
    console.log('Closing the server');
    process.exit(1);
  });
});
