const TourModel = require('../models/tourModel')

const asyncWrapper = require('../utils/asyncWrapper')
const { deleteSingleDoc, updateSingleDoc, createSingleDoc, getSingleDoc, getAllDocs } = require('../controllers/handlerFactory')


// @desc --> create a tour
// POST / api / v1 / tours
const createTour = createSingleDoc(TourModel)


// @desc --> Get all tours 
// GET /api/v1/tours
const getAllTours = getAllDocs(TourModel)

// @desc --> Get one tour
// GET /api/v1/tours/:id
const getOneTour = getSingleDoc(TourModel, { path: 'reviews' })


// @desc --> Update a tour
// PATCH /api/v1/tours/:id
const updateTour = updateSingleDoc(TourModel)


// @desc --> delete a tour 
// DELETE /api/v1/tours/:id
const deleteTour = deleteSingleDoc(TourModel)



const getToursStats = asyncWrapper(async (req, res) => {


    // ! Refer MongoDB docs on aggregate pipelines (just like group by in SQL 💀)

    // In aggregate we ll pass an array , and that array will contain various pipeline stages such as $match , $group, $sort 
    const stats = await TourModel.aggregate([
        {
            $group: {
                _id: "$difficulty",  // each doc can be identified by "difficulty" 
                totalTours: { $sum: 1 },
                numRatings: { $sum: "$ratingsQuantity" },
                avgRating: { $avg: "$ratingsAverage" },
                avgPrice: { $avg: "$price" },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" }


            },

        }
    ])

    res.status(200)
        .json({
            status: "successful",
            stat: stats
        })
})


// @desc --> Get how many tours starting on each month and what they are
const getMonthlyPlan = asyncWrapper(async (req, res) => {


    const planYear = parseInt(req.params.year)

    const plan = await TourModel.aggregate([

        //  * unwind --> deconstructing an array field from input documents to output a document for each element. 

        { $unwind: "$startDates" },

        {
            // match the tours with the given year in the URL
            $match: {
                startDates: {
                    $lte: new Date(`${planYear}-12-31`),
                    $gte: new Date(`${planYear}-01-01`)
                }

            }
        },

        {
            $group: {
                _id: { $month: "$startDates" }, //  extracts the month part from each startDates field and groups the data by this month.

                numOfTourStarts: { $sum: 1 },
                tours: { $push: "$name" }  // to push tour names to the array "tours"

            }
        },

        {
            $addFields: { month: "$_id" }
        },

        {
            $project: {
                _id: 0  // exclude _id field from the response
            }
        },

        {
            // sort in descending order so that largest num of tour start month is at first
            $sort: { numOfTourStarts: -1 }

        }


    ])

    res.status(200)
        .json({
            status: "successful",
            plan: plan
        })

})




// * API aliasing --> These aliases are essentially shortcuts for more complex or commonly used queries. 
// @desc --> Get top 5 , highest rated, cheapest tours  (Middleware)
// GET api / v1 / tours / top-5-rated-cheapest
const topFiveRatedAndCheapest = (req, res, next) => {

    req.query.limit = '5'
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name, price,ratingsAverage,difficulty,summary'

    next()  // ! do not forget to call next() ☝️


}


module.exports = {
    getAllTours,
    getOneTour,
    updateTour,
    deleteTour,
    createTour,
    topFiveRatedAndCheapest,
    getToursStats,
    getMonthlyPlan
}

