const mongoose = require('mongoose')
const slugify = require('slugify')


// Schema --> define the structure of the data
// Model --> a wrapper for the schema, provides an interface to the database for CRUD operations




const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, 'A name must be provided for the tour.'],  // validator
        minlength: [3, 'Tour name must have at least 5 characters'],  // validator
        maxlength: [30, 'Tour name must have a max of  30 characters'], // validator

        validate: {  // custom validator using regEx
            validator: function (value) {

                return /^[A-Za-z\s]+$/.test(value)  // * test(value) is used test the pattern

                /*
                In this regex:
                1) ^ asserts the start of a line.
                2) [A-Za-z\s] allows uppercase letters (A-Z), lowercase letters (a-z), and whitespace characters (\s).
                3) + ensures that there is at least one character matching the pattern.
                4) $ asserts the end of a line. 
                */
            },
            message: 'Tour name can contain only letters and spaces'
        }
    },

    slug: String,  // this will be our slug for the tour   (will be created using slugify)

    price: {
        type: Number,
        required: [true, 'A tour must have a price.'],  // validator
        min: [0, 'Price must be >= 0']  // validator

    },

    ratingsAverage: {

        type: Number,
        default: 0

    },

    ratingsQuantity: {
        type: Number,
        default: 0
    },

    difficulty: {
        type: String,
        required: [true, 'Difficulty must be given'],
        enum: {  // validator
            values: ['easy', 'medium', 'difficult'],
            message: 'Tour difficulty must be --> easy/ medium/ difficult '
        }
    },

    duration: {
        type: Number,
        required: [true, 'A tour must have a duration'],
        min: [1, 'Tour must be at least 1 day long'],
        max: [30, 'Max duration is 30 days']
    },

    maxGroupSize: {
        type: Number,
        required: [true, 'Group size must be mentioned']

    },

    priceDiscount: {
        type: Number,

        validate: {  // custom validator
            validator: function (value) {
                return this.price > value
            },
            message: 'The discount price must be lower than the actual price'
        }
    },

    summary: {
        type: String,
        required: [true, 'A summary must be given about the tour'],
        trim: true,

    },

    description: {
        type: String,
        minlength: [20, 'description length >= 20 char']

    },

    imageCover: {
        type: String, // we will store the path to the image in the db, not the image itself
        required: [true, 'Must have a cover image']
    },

    images: [String],

    createdAt: {
        type: Date,
        default: Date.now(),
        select: false  // since select is false we will never send createdAt field as response (security reasons,... 🙀)
    },

    startDates: [Date],

    secretTour: {
        type: Boolean,
        default: false

    },

    // * here we will embed the locations in the tour model itself  because we will not use locations anywhere else in the app 

    startLocation: {
        // GeoJson ==> a special format for specifying GeoSpatial data (data associated with a real place on earth)
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']  // only one value is allowed
        },
        coordinates: [Number],  // array of numbers
        address: String,
        description: String
    },
    // ** locations => Embedded documents  😊
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']  // only one value is allowed
            },
            coordinates: [Number],  // array of numbers
            address: String,
            description: String,
            day: Number  // day of the tour
        }
    ],

    // array of user ids
    guides: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'  // reference to the UserModel
        }]



},
    { toJSON: { virtuals: true } })  //  if you pass a document to Express' res.json() function, virtuals will not be included by default. include virtuals in res.json(), you need to set the toJSON schema option to { virtuals: true }


// * virtual props ==>  a virtual is a property that is not stored in MongoDB. Virtuals are typically used for computed properties on documents. Also help us separate app and business logic  (discount calc, ... )


// refer Mongoose docs ==> here we need to use "this" keyword, so we must use traditional function 
tourSchema.virtual('formattedDuration').get(function () {


    const weeks = Math.floor(this.duration / 7)

    const days = this.duration % 7

    return `${weeks} weeks ${days} days`

})


// * virtual populate ==>  to populate the reviews field with the actual review data (not just the id) when we query for a tour ⭐

// also there is no need to get the reviews populated when we query all the tours, it is enough to populate the reviews when we query for a single tour. So here did not use a query middleware, instead used "populate()" in get a single tour router


tourSchema.virtual('reviews', {
    ref: 'Review',  // the model to reference
    foreignField: 'tour',  // the field in the Review model which stores the tour id
    localField: '_id'  // the field in the Tour model which stores the tour id
})


// refer Mongoose docs 
// * Mongoose Middleware (also called pre and post hooks) ==> 

// 1) Document Middleware
tourSchema.pre('save', function (next) {  // * before saving data to the database

    // ! Document middleware ==> "this" points to the current document⭐

    // console.log(this)

    this.slug = slugify(this.name, { replacement: '_', lower: true })  // refer slugify package docs

    console.log('Slug added successfully')

    next()  // ! call next() to pass control 💀

})

// ****  refer the commented code for more about Document type Mongoose hooks  **** \\

/*
/if we want we can have more than one hooks
tourSchema.pre('save', function (next) {

    console.log(this.name + ' is being saved. Please wait...')
    next()
})


tourSchema.post('save', function (doc) {  // *post save  hooks have access to the doc

    console.log(doc.name + ' --> has been saved. ')


})
*/


// 2) Query middleware

// ! refer utils/ API features/ find() section -> how the same thing is done 

// ! below if we had used "find" only it will work only for "find", not for "findOne". So we use a regEx to run the middleware for any that has 'find' 


tourSchema.pre(/^find/, function (next) {  // ! do not use ' ' with regEx

    // only get tours which are not secret
    this.find({ secretTour: { $ne: true } })

    next()

})

// this query middleware will populate the guides field with the actual user data (not just the id) when we query for a tour ⭐
tourSchema.pre(/^find/, function (next) {

    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt -lockoutTime -failedLoginAttempts'  // exclude these fields from the response
    })

    next()

})
// 3) Aggregation Middleware

// if we do not do this in our aggregate routes we will get those secret tours
tourSchema.pre('aggregate', function (next) {

    // to add the match condition to the beginning of the array using JS's unshift
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } })

    // console.log(this.pipeline())

    next()
})



// convention is to name the model as capitalized
const TourModel = mongoose.model('TourModel', tourSchema)

module.exports = TourModel
