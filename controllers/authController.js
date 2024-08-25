const { promisify } = require('util')
const crypto = require('crypto')
const sendEmail = require('../utils/email')
const jwt = require('jsonwebtoken')

const asyncWrapper = require('../utils/asyncWrapper')
const AppError = require('../utils/appError')
const User = require('../models/userModel')

// generate the token
const generateToken = (id) => {
    // sign the user a token upon sign up -> payload | secret | exp time
    const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    })

    return token;
}

// send the token as a cookie -->  
/*
Cookies have an additional layer of protection because they can be set with the HttpOnly flag, making them inaccessible to JavaScript. This reduces the risk of an attacker stealing the token using malicious scripts injected into the web page.
*/
const sendToken = (user, statusCode, res) => {
    // Generate a JWT token using the user's ID
    const token = generateToken(user._id);

    // Configure options for the JWT cookie
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000), // Setting the expiration date for the cookie
        httpOnly: true, // Ensures that the cookie is only accessible through HTTP(S) requests and not client-side scripts
    };

    // Set the 'secure' option for the cookie in a production environment
    if (process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true;
    }

    // Attach the JWT cookie to the response object
    res.cookie('jwtCookie', token, cookieOptions);

    // Send a JSON response to the client with status, success message, and user data
    res.status(statusCode).json({
        status: 'success',
        data: user,
        token: token
    });
};


// user sign up
const signup = asyncWrapper(async (req, res, next) => {

    // for security reasons do not directly accept req.body, instead do it like below
    const { name, email, password, passwordConfirm, role } = req.body
    const user = await User.create({ name, email, password, passwordConfirm, role })


    sendToken(user, 201, res)

})

// login 
const login = asyncWrapper(async (req, res, next) => {

    // read email and password
    const { email, password } = req.body

    // * 1) check if user has provided both email & password
    if (!email || !password) {
        return next(new AppError('Please provide both email & password', 400))
    }

    // * 2) check if user exists and whether he has given the correct password

    const user = await User.findOne({ email: email }).select('+password')  // should explicitly select the password as in our userSchema we set select password as false

    // since checkPassword is an instance method it should be called using user instance not User model
    if (!user || user.lockoutTime > Date.now() || !(await user.checkPassword(user.password, password))) {

        if (user && user.failedLoginAttempts >= 5 && user.lockoutTime > Date.now()) {
            const unlockTime = new Date(user.lockoutTime).toLocaleTimeString(); // Convert lockout time to human-readable format
            return next(new AppError(`Account is locked due to multiple failed login attempts. Try again after ${unlockTime}.`, 401));
        }




        // increment failed login attempts
        user.failedLoginAttempts++

        // set when the account becomes free again 
        if (user.failedLoginAttempts >= 5) {
            const duration = process.env.LOCKOUT_DURATION || 30
            user.lockoutTime = Date.now() + duration * 60 * 1000
        }

        // save these new field changes to the user doc
        await user.save({ validateBeforeSave: false })

        return next(new AppError('Username or password does not match. Provide correct credentials', 401))  // 401 means unauthorized

    }

    // * 3) if above conditions are met send the token


    // also reset failedLoginAttempts and lockoutTime
    user.failedLoginAttempts = 0;
    user.lockoutTime = null;
    await user.save({ validateBeforeSave: false });

    sendToken(user, 200, res)




})

// protect the sensitive routes 
const protect = asyncWrapper(async (req, res, next) => {

    // 1) check whether the token exists
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]  // grab the token
    }

    if (!token) {
        return next(new AppError('Please login to continue.', 401))
    }

    // 2) verify the token -> to check whether the token has been tampered with
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)  // decoded obj will contain userId, iat and exp

    // console.log(decoded)

    // 3) check if user still exists (because user might have deleted his account after receiving his token )
    const matchingUser = await User.findById(decoded.id)

    if (!matchingUser) {
        return next(new AppError('User with the matching token no longer exists', 401))
    }

    // 4) check if the user has changed his password after the token issue (this will be done using the instance method defined in User schema)
    const isChanged = matchingUser.isPassChangedAfterTokenIssue(decoded.iat)
    if (isChanged) {
        return next(new AppError('User password was changed recently, after the issue of the current token ', 401))
    }

    req.user = matchingUser  //  to attach the authenticated user object to the request object. This allows downstream middleware (such as authorization )or route handlers to access information about the authenticated user.

    next()  // if all the above conditions are met, give access to the protected path😃

})


// authorization
/*
It takes a variable number of roles as arguments (using the spread operator ...roles) and returns a middleware function.
while we  can't directly pass arguments to middleware in Express, we can achieve a similar effect by using higher-order functions, like the one below 
*/
const restrictTo = (...roles) => {

    // no need to wrap this using asyncWrapper as this is not a async func

    return (req, res, next) => {

        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have enough permission to perform this action', 403))  // 403 is for forbidden
        }
        next()
    }
}

// forgot password
const forgotPassword = async (req, res, next) => {

    // 1) get user based on the given email
    const user = await User.findOne({ email: req.body.email })

    if (!user) {
        return next(new AppError('Please provide the email address which you signed up ', 404))
    }

    // 2) generate the random password reset token using the instance method we defined
    const resetToken = user.generatePasswordResetToken()
    await user.save({ validateBeforeSave: false })  //  * to save these changes to the database. + we set the validateBeforeSave to false coz the user will not post all the required fields we specified in the schema, for this particular route

    // 3) send the token to the user's email

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`


    // * in this case, we can not use asyncWrapper as we need to do more than just sending the error to the global error handler. We need to reset the password reset token and the token expiry time as well. So we will handle the error here itself using try catch block

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message: message
        })
        res.status(200).json({
            status: "successful",
            message: "Token sent to the email"

        })
    } catch (err) {
        user.passwordResetToken = undefined
        user.passwordResetTokenExpires = undefined
        console.log(err)
        await user.save({ validateBeforeSave: false })  //   to save these changes to the database. (due to these necessary additional steps in presence of an error, we could not simply use the global error handler)

        return next(new AppError('There was an error sending the email. Try again later!', 500))
    }

}



// reset password upon forgetting password
const resetPassword = asyncWrapper(async (req, res, next) => {

    // 1) get the user based on the token

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpires: { $gt: Date.now() }  // this will check whether token exp time is greater than curr time, if so it'll return true 
    })

    // 2) check whether the user exits and token has not expired -> set the new password
    console.log(user)
    if (!user) {
        return next(new AppError('Invalid token or the reset token has expired. ', 400))
    }

    // 3) update changedPasswordAt property in user schema
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetTokenExpires = undefined

    // also reset failedLoginAttempts and lockoutTime upon password reset
    user.failedLoginAttempts = 0;
    user.lockoutTime = null;


    // user.passwordChangedAt = Date.now()  ==> rather than doing the update here we did it in a pre save hook

    await user.save({ validateBeforeSave: true })  // we want validators to run to see whether the password and passwordConfirm matches


    // 4) log the user in and send the JWT
    sendToken(user, 200, res)


})


//update password
const updatePassword = asyncWrapper(async (req, res, next) => {

    // 1) get the user
    const user = await User.findById(req.user.id).select('+password') // we get user object from the protect middleware ☝️ + make sure to explicitly select password field

    if (!user) {
        return next(new AppError('User not found', 404))
    }
    // console.log(user)

    // 2) check if the current password is correct with the one in the DB
    // const passMatch = await user.checkPassword(user.password, req.body.currPassword)

    if (!(await user.checkPassword(user.password, req.body.currPassword))) {
        return next(new AppError('Entered password does not match with the current one', 401))
    }

    // 3) update the password

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    await user.save() // * if we do the password update using User.findByIDAndUpdate() then the validators + pre save hooks would not have worked

    // 4) log the user in and send the JWT
    sendToken(user, 200, res)
})










module.exports = { signup, login, protect, restrictTo, forgotPassword, resetPassword, updatePassword }