/*
 async handler", wraps  async functions and catches any errors they throw, then forwards them to a centralized error handling mechanism. The async wrapper takes an async function as an argument and returns a new function. This new function calls the original function and catches any errors. If an error occurs, it passes the error to the next middleware function in the chain
*/

const asyncWrapper = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next)
        } catch (err) {
            next(err)
        }
    }
}

module.exports = asyncWrapper