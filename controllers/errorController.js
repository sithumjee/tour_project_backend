const AppError = require('../utils/AppError.js')

const sendErrorInDev = (res, err) => {
    // in dev, send detailed error reports
    res.status(err.statusCode).json({
        status: err.status,
        msg: err.message,
        error: err,
        stack: err.stack
    })
}

const sendErrorInProd = (res, err) => {

    // if the error is an operational error send the response below (trusted )
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            msg: err.message,
        })
    } else {
        // log the error to the hosting platform's console (for debugging)
        console.error('Error💀 -->' + err)

        // if it is not an operational error send a vague message + 500 
        res.status(500).json({
            status: err.status,
            msg: 'Something went wrong !'
        })

    }

}

const handleTokenError = () => {
    return new AppError('Invalid token. Please login again', 401)
}

const handleTokenExpiredError = () => {
    return new AppError('Token has expired !', 401)
}
// handling mongodb related errors 

// 1) cast error
const handleCastError = (err) => {
    const msg = `invalid ${err.path} : ${err.value} `
    return new AppError(msg, 400)
}

// 2) duplicate field error
const handleDuplicateFieldError = (err) => {
    const duplicateName = err.keyValue.name  // this duplicate name could be accessed from first looking at the error obj in development env in postman
    return new AppError(`A tour with the name "${duplicateName}"already exists`, 400)
}


// 3) validation error
const handleValidationError = (err) => {

    // By using Object.values(err.errors), we convert the properties of the err.errors object into an array,
    const errorArray = Object.values(err.errors)

    const errMsgArr = errorArray.map((e) => e.message)
    const msg = `Invalid input given. Please handle the following. ${errMsgArr.join('.')}`
    return new AppError(msg, 400)

}

const globalErrorHandler = (err, req, res, next) => {

    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'  // this is needed here coz not all errors will be coming from our AppError class 

    // based on the env we want to send different kind of error msgs
    if (process.env.NODE_ENV === 'development') {
        sendErrorInDev(res, err)
    } else if (process.env.NODE_ENV === 'production') {

        // cast error
        if (err.name === 'CastError') {
            err = handleCastError(err);
        }

        // duplicate fields error
        if (err.code === 11000) {  // had to use this code field as there was no "name" prop in err obj
            err = handleDuplicateFieldError(err)
        }

        // validation error
        if (err.name === 'ValidationError') {
            err = handleValidationError(err)
        }

        //json web token error (when the token is tampered )
        if (err.name === 'JsonWebTokenError') {
            err = handleTokenError()
        }

        // when token has expired
        if (err.name === 'TokenExpiredError') {
            err = handleTokenExpiredError()
        }



        sendErrorInProd(res, err)
    }
}

module.exports = globalErrorHandler