const express = require('express');
const { getAllReviews, createReview, deleteReview, updateReview, setTourIdAndUserID, getSingleReview, setTourId } = require('../controllers/reviewsController');
const { protect, restrictTo } = require('../controllers/authController');


const router = express.Router({ mergeParams: true });  // mergeParams: true is needed to access the tourId in the nested route in tourRouters.js

// ! to access the routes below the user must be logged in
router.use(protect)

// POST /tour/:tourId/reviews (nested route ⭐)
// GET /tour/:tourId/reviews (nested route ⭐)  (get all the reviews for a particular tour)
// POST /reviews
// GET /reviews 
router.route('/')
    .get(setTourId, getAllReviews)
    .post(protect, restrictTo("user"), setTourIdAndUserID, createReview)  // only logged in users who are not admin or lead-guide/guide  can create a review 😊 + call setTourIdAndUserID middleware :)

router.route('/:id')
    .delete(restrictTo('user', 'admin'), deleteReview)
    .patch(restrictTo('user', 'admin'), updateReview)
    .get(getSingleReview)

module.exports = router