import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
});
transporter.verify(function(error, success) {
   if (error) {
        console.log("SMTP Error:", error);
   } else {
        console.log("Server is ready");
   }
});
