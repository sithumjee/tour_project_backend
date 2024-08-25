const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const TourModel = require('./models/tourModel');

// JSON.parse is needed to convert the json to array
const devData = JSON.parse(fs.readFileSync('./dev-data/data/tours.json', 'utf-8'))

mongoose.connect(process.env.DB_STRING)
    .then(() => console.log('DB connection successful!'))
    .catch(err => console.log('Could not connect to db -> ' + err))


const destroyDb = async () => {
    try {
        // delete all docs in the collection
        await TourModel.deleteMany()
        console.log('Destroyed all the docs...')

    } catch (error) {
        console.log('Error while deleting the existing docs --> ' + error)
    }
}



const populateDb = async () => {
    try {
        await TourModel.create(devData)
        console.log('Data populated successfully')

    } catch (error) {
        console.log('Error while populating -> ' + error)
    }
}


(async () => {
    await destroyDb();
    await populateDb();
    mongoose.disconnect();
})();
