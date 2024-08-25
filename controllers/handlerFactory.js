const asyncWrapper = require('../utils/asyncWrapper')
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/APIFeatures')




const deleteSingleDoc = (Model) => asyncWrapper(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
        return next(new AppError('Could not perform the deletion. No document found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
})


const updateSingleDoc = (Model) => asyncWrapper(async (req, res, next) => {
    // findByIdAndUpdate --> refer mongoose docs

    //  ! when we use findByIdAndUpdate, the pre save hooks we implemented will not work.

    const doc = await Model.findByIdAndUpdate(
        req.params.id,
        req.body,
        { returnDocument: 'after', runValidators: true }
    )

    if (!doc) {
        return next(new AppError('Requested document not found', 404))
    }
    res.status(200)
        .json({
            status: "successfully updated",
            updatedDoc: doc

        })

});


const createSingleDoc = (Model) => asyncWrapper(async (req, res, next) => {
    // here create method returns a promise so we can use async await to handle it
    const doc = await Model.create(req.body)

    res.status(201)
        .json({
            status: "Successful",
            data: doc
        })
})


//  here we need to pass populateOptions because getATour controller needs to populate "reviews" field
const getSingleDoc = (Model, populateOptionsObj) => asyncWrapper(async (req, res, next) => {

    let query = Model.findById(req.params.id)

    if (populateOptionsObj) {
        query = query.populate(populateOptionsObj)
    }

    const doc = await query

    if (!doc) {
        return next(new AppError('Requested doc not found', 404))
    }

    res.status(200).json({
        status: "successful",
        data: doc
    })




})

// we can now use our API features to sort/ paginate, ... on tours, users, reviews ... 🤩🤩🤩 
const getAllDocs = (Model) => asyncWrapper(async (req, res, next) => {
    // creating an instance & chaining the methods
    const features = new APIFeatures(Model.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate()


    const docs = await features.query

    res.status(200)
        .json({
            status: "successful",
            totalDocs: docs.length,
            allDocs: docs
        })
})


module.exports = { deleteSingleDoc, updateSingleDoc, createSingleDoc, getSingleDoc, getAllDocs };