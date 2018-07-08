var nodemailer = require('nodemailer');

module.exports.sendMail = function(email,subject,msg,html){
  var status = { "status" : "success" };

  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'rescueline.team@gmail.com',
      pass: 'Rs812169!'
    }
  });

  var mailOptions = {
    from: 'rescueline.team@gmail.com',
    to: email,
    subject: subject,
    text: msg,
    html: html
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error)
      status = { "status" : "error", "error" : error };
  });

  return status;
};
