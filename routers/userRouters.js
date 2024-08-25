const express = require('express')
const { getAllUsers,
    getOneUser,
    updateMe,
    deleteMe,
    deleteUser,
    updateUser,
    getMe
} = require('../controllers/userController.js')
const { signup, login, forgotPassword, resetPassword, updatePassword, protect, restrictTo } = require('../controllers/authController.js')

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)

router.post('/forgotPassword', forgotPassword)
router.patch('/resetPassword/:token', resetPassword)

// ! since all the below routes are protected use this middleware
router.use(protect)

router.patch('/updatePassword', updatePassword)  // since only the logged in users can update the password protect middleware should be used


router.get('/me', getMe, getOneUser)
router.patch('/updateMe', updateMe)
router.delete('/deleteMe', deleteMe)


// !since only the admins are allowed to use the below routes
router.use(restrictTo('admin'))


router.route('/').get(getAllUsers)

router.route('/:id')
    .get(getOneUser)
    .delete(deleteUser)
    .patch(updateUser)



module.exports = router
