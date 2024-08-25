const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')


const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: [true, 'A username must be specified']
    },

    email: {
        type: String,
        unique: true,
        validate: [validator.isEmail, 'Please provide a valid email.']
    },

    photo: String,

    role: {
        type: String,
        enum: ['user', 'admin', 'guide', 'lead-guide'],
        default: 'user',
    },

    password: {
        type: String,
        required: [true, 'You must specify a password'],
        minlength: [6, 'Password length should at least be 6 char long'],
        select: false  //  as we do not wanna send the password with response

    },

    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate:
        {
            validator: function (pass) {
                return this.password === pass  // will return true if both password & confirmPass (pass) matches
            },
            message: 'Passwords do not match '
        }
    },

    passwordChangedAt: Date, // this field is to get the time when user updated his password. This is useful when implementing "protect" route in auth controller

    passwordResetToken: String,
    passwordResetTokenExpires: Date,

    active: {  // to support soft deletion 
        type: Boolean,
        default: true,
        select: false
    },

    failedLoginAttempts: {
        type: Number,
        default: 0
    },

    lockoutTime: Date  // gives the time until the account becomes free to login again after blocking






})

// query middleware to select only the active users from the DB for any "find" methods
userSchema.pre(/^find/, function (next) {
    // this refers to the current query object
    this.find({ active: { $ne: false } })

    next()

})
// hash password before saving to the DB using pre save hook
userSchema.pre('save', async function (next) {

    // hash the password only if it has been modified, if not return 
    if (!this.isModified('password')) {
        return next()
    }
    this.password = await bcrypt.hash(this.password, 12)
    this.passwordConfirm = undefined  // as we no longer need passConfirm field, delete it 
    next()

})

// Update passwordChangedAt before saving when password is changed
userSchema.pre('save', function (next) {

    if (this.isModified('password') || this.isNew) {
        return next()   //  exit the middleware and proceed with the save operation.
    }

    this.passwordChangedAt = Date.now() - 1000  // we subtract 1 sec, because sometimes the JWT token may be created before the saving. (refer resetPassword controller in authController)
    next()

})




// "instance method" to check whether passwords matched upon login  => call this method using an instance not the model itself ⭐
userSchema.methods.checkPassword = async function (realPass, enteredPass) {
    return await bcrypt.compare(enteredPass, realPass)
}


// "instance method" to check whether user last updated password > token issue
userSchema.methods.isPassChangedAfterTokenIssue = function (tokenIssue) {

    if (this.passwordChangedAt) {
        const passChangeTime = Number(this.passwordChangedAt.getTime() / 1000)
        if (passChangeTime > tokenIssue) {  // if this is true then password was modified after grabbing the token
            return true
        }
    }

    return false;  // password has never been changed
}

// Instance method to generate a random token for password reset
userSchema.methods.generatePasswordResetToken = function () {

    // Generate a random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash the token and store it in the database  (encrypted token)
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // console.log(resetToken, this.passwordResetToken)

    // Set the expiration time for the token (e.g., 10 minutes)
    this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;


    // Return the plain token, not the encrypted one (to be sent to the user via email)
    return resetToken;

}



const User = mongoose.model('User', userSchema)

module.exports = User