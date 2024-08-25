const Review = require('../models/reviewModel');

const {
    deleteSingleDoc,
    updateSingleDoc,
    createSingleDoc,
    getSingleDoc,
    getAllDocs } = require('../controllers/handlerFactory')


// middleware function 👉
// if the tour id is  in the url params (for a nested route) we will get the tour id from the url  of the request so that we can get all the reviews for that particular tour, otherwise we will get all the reviews for all the tours   (REFER reviewsRouter.js to see this use case )
const setTourId = (req, res, next) => {


    let filter = {}

    if (req.params.tourId) {
        filter = { tour: req.params.tourId }
    }

    next()

}

const getAllReviews = getAllDocs(Review)


// middleware function 👉
// due to the following code, we can create a review without specifying the tour id and user id in the body of the request 😊  REFER reviewsRouter.js to see this use case 
const setTourIdAndUserID = (req, res, next) => {


    // if the tour id is not in the body, then we will get it from the url params (nested route in tourRouter.js + reviewRouter.js)
    if (!req.body.tour) {
        req.body.tour = req.params.tourId
    }

    // we will call the protect middleware before this controller, so we will have access to req.user.id 
    if (!req.body.user) {
        req.body.user = req.user.id

    }

    next()
}


const createReview = createSingleDoc(Review)

const deleteReview = deleteSingleDoc(Review)

const updateReview = updateSingleDoc(Review)

const getSingleReview = getSingleDoc(Review)

module.exports = { getAllReviews, createReview, deleteReview, updateReview, setTourIdAndUserID, getSingleReview, setTourId }