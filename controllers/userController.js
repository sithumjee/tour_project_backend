const User = require('../models/userModel')
const asyncWrapper = require('../utils/asyncWrapper')
const { deleteSingleDoc, updateSingleDoc, getSingleDoc, getAllDocs } = require('../controllers/handlerFactory')
const AppError = require('../utils/appError')


// function to get the filtered object when user updates data
const getFilteredBodyObj = (bodyObj, ...updatableFields) => {  // as second parameter to this function we used spread operator, this way we can entry as many args and they will be placed inside an array
    const newObj = {}
    Object.keys(bodyObj).forEach((it) => {
        if (updatableFields.includes(it)) {
            newObj[it] = bodyObj[it]
        }
    })
    return newObj;
}

const getAllUsers = getAllDocs(User)

const getOneUser = getSingleDoc(User)

const deleteUser = deleteSingleDoc(User)

const updateUser = updateSingleDoc(User) // for admins only + no password update via this route 🤩 

// the currently logged in user will be able to access profile info using this
const getMe = (req, res, next) => {

    // we use protect middleware before this, it will add the user object to the request, so using it we can set req.params.id as follows

    req.params.id = req.user.id  // * so that we can use getOneUser next (refer userRoute.js for the use case => '/me' route)

    next()
}

const updateMe = asyncWrapper(async (req, res, next) => {

    // we will not let the user update his password via this route
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('You can not use this route to update password. Please use changePassword route for password update', 400))
    }


    // A malicious user may try to change his role (say to 'admin'). So we should filter the request object to accept only the relevant ones
    const filteredBody = getFilteredBodyObj(req.body, 'name', 'email')

    const user = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true })  //  since we are not dealing with sensitive data like passwords we do not have to run the pre save hooks we implemented in User schema. So we can use findByIdAndUpdate , rather than "save" 



    res.status(200).json({
        status: "success",
        updated: user
    })
})

// this will set user's status from active to false
const deleteMe = async (req, res, next) => {

    const user = await User.findByIdAndUpdate(req.user.id, { active: false })

    if (!user) {
        return next(new AppError('user not found', 404))
    }

    res.status(204).json({ status: "success" })

}


module.exports = { getAllUsers, getOneUser, deleteMe, updateMe, deleteUser, updateUser, getMe }