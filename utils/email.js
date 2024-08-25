const nodemailer = require('nodemailer')
const asyncWrapper = require('./asyncWrapper')

const sendEmail = async (options) => {  // * no need to wrap this using asyncWrapper as we will handle the error in the auth controller's forgotPassword itself. 

    // 1) create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })

    // 2) define the email options
    const mailOptions = {
        from: 'Chamika Jayasinghe <hirosanajaya2001@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    // 3) send the email
    await transporter.sendMail(mailOptions)

}

module.exports = sendEmail