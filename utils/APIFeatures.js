class APIFeatures {

    // query --> This parameter is expected to be a Mongoose query object (TourModel.find())
    // queryString --> This parameter represents the query string from the HTTP request
    constructor(query, queryString) {

        this.query = query
        this.queryString = queryString

    }

    // * Why return 'this' at the end of each method ? ==> By returning this, each method returns the instance of the object it was called on. This allows you to immediately call another method on the same object without having to break the statement into multiple lines.




    filter() {

        // ! Removing unwanted fields from the queryString

        // our query obj may have extra fields such as 'limit', 'sort',...So we should remove them from the query obj as follows

        // cloning the query obj
        let clonedQuery = { ...this.queryString }

        const excludedFields = ['page', 'sort', 'limit', 'fields']

        // removing the unnecessary fields from clonedObj  --> we should use [] instead of . because the dot notation requires the property name to be known
        excludedFields.forEach((field) => delete clonedQuery[field])


        // console.log(clonedQuery)

        // * What happens if we use "await" here (Direct execution)--> Since the query is executed immediately, you don’t have the opportunity to modify or add conditions to the query afterward. This approach is best when the query is fixed and doesn't require further refinement.

        // const allTours = await TourModel.find(clonedQuery)


        //  ** Delayed Execution --> This separation allows you to manipulate or refine the query further before executing it.

        // * Matching Client-Side and Server-Side Syntax:--> Typically, the query parameters sent from the client-side (like through a URL in a web application) are in a more readable or user-friendly format (e.g., lt, gt, lte, gte).  However, the server-side, which interacts with the database, must translate these into the syntax that the database understands. In this case, your code acts as a translator between the client-side representation and the MongoDB query syntax.

        // * for example consider URL ->  http://yourwebsite.com/api/tours?price[gt]=300&duration[lt]=10 . When this URL is accessed, your server receives an object like:-->

        /*
        {
        "price": {
            "gt": "300"
        },
        "duration": {
            "lt": "10"
        }
        */

        // * Your server-side code then needs to convert this into a format that MongoDB understands. The conversion process you implement in your code would translate price[gt] to price: {$gt: 300} and duration[lt] to duration: {$lt: 10} for the MongoDB query. //


        // ! gt|gte|lt|lte Feature

        // **************   HOW THIS IS DONE *****************  

        // convert the cloned query obj into a JSON string to run replace func

        let clonedString = JSON.stringify(clonedQuery)

        // run replace method + regEx
        clonedString = clonedString.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`)

        // parse the string into an obj
        const filters = JSON.parse(clonedString)

        // console.log(filters)

        // ! if we do not want to include secret tours we could have just do this, but I ll do it using a pre find hook for learning purposes (commented line below)

        // ** this.query = this.query.find({ ...filters, secretTour: { $ne: true } })


        this.query = this.query.find(filters)

        return this  // 



    }

    sort() {

        // ! SORTING Feature

        // check whether sort is given as a query
        if (this.queryString.sort) {

            // * In a URL, query parameters are typically delimited by commas for readability and URL encoding standards. For example, if a user wants to sort by price in ascending order and then by rating in descending order, they might send a request like this: "http://yourwebsite.com/api/tours?sort=price,-rating" 

            // * MongoDB Sort Method Format: MongoDB's sort method expects each field to be sorted by as a separate argument, and these arguments are typically separated by spaces in JavaScript. For instance, sorting by price in ascending order and rating in descending order would look like this in MongoDB query syntax: .sort('price -rating')

            // * So to do the matching we will do the following


            const sortConditions = this.queryString.sort.split(',').join(' ')  // convert the sort criteria to mongoDb format

            this.query = this.query.sort(sortConditions)  // actual sorting happens here


        } else {
            this.query = this.query.sort('-createdAt') // descending order -> newest first 

        }

        return this
    }

    limitFields() {


        // ! FIELDS LIMITING Feature

        if (this.queryString.fields) {
            const fieldSet = this.queryString.fields.split(',').join(' ')
            this.query = this.query.select(fieldSet)


        } else {
            this.query = this.query.select('-__v')  // here __v is a mongoose related field, and we will not send it as a field by simply using minus sign(-)
        }

        return this
    }

    paginate() {

        //! PAGINATION Feature

        const page = parseInt(this.queryString.page) || 1  // default val is 1
        const limit = parseInt(this.queryString.limit) || 4  // default is set to 4 tours per pg
        const skip = (page - 1) * limit


        this.query = this.query.skip(skip).limit(limit)

        return this

    }



}


module.exports = APIFeatures