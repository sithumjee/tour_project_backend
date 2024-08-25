const express = require('express')
const {
    getAllTours,
    getOneTour,
    updateTour,
    deleteTour,
    createTour,
    topFiveRatedAndCheapest,
    getToursStats,
    getMonthlyPlan
} = require("../controllers/tourController")

const { protect, restrictTo } = require('../controllers/authController')

const reviewRouter = require('./reviewRouters')

const router = express.Router()


// * nested routes

// POST /tour/:tourId/reviews 

router.use('/:tourId/reviews', reviewRouter)  // use reviewRouter if this pattern /:tourId/reviews  is matched in the url (redirect to reviewRouter.js)


// *  defining a middleware function that will be invoked when a route parameter named 'id' is present in the URL. This kind of middleware function can be useful for validation, logging, or loading additional data related to the route parameter.

router.param('id', (req, res, next, id) => {
    console.log('Tour id is is ' + id)
    next()
})


router.route('/top-5-rated-cheapest')
    .get(topFiveRatedAndCheapest, getAllTours)

router.route('/tour-stats')
    .get(getToursStats)

router.route('/monthly-plan/:year')
    .post(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan)


router.route('/')
    .get(protect, getAllTours)
    .post(protect, restrictTo('admin', 'lead-guide'), createTour)


router.route('/:id')
    .get(getOneTour)
    .post(protect, restrictTo('admin', 'lead-guide'), updateTour)
    .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour)




module.exports = router 