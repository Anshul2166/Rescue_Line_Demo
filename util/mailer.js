require('dotenv').config();
var nodemailer = require('nodemailer');

module.exports.sendMail = function(email,subject,msg,html){
  var status = { "status" : "success" };

  var transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 465,
    secure: true, // secure:true for port 465, secure:false for port 587
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  var mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: subject,
    text: msg,
    html: html
  };
  console.log("Sending from "+process.env.EMAIL_USERNAME+" and "+process.env.EMAIL_PASSWORD+" to "+email);
  transporter.sendMail(mailOptions, function(error, info){
    console.log("Here is the info");
    console.log(info);
    console.log(error);
    if (error)
      status = { "status" : "error", "error" : error };
  });
  console.log("Status is");
  console.log(status);
  return status;
};
