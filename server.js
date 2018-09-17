var express = require("express");
var app = express();
var port = process.env.PORT || 3000;
var http = require('http').Server(app);
//var cfenv = require("cfenv");
var bodyParser = require('body-parser');
var nunjucks = require('nunjucks');
var cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
var DB = require('./util/db.js');
var IO = require('./util/io.js');
exports.dbh = new DB();
exports.io = new IO(http);
exports.parser = function(){
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));
  // parse application/json
  app.use(bodyParser.json());
  app.use(cookieParser());

};

http.listen(port, function(){
  console.log('listening on :'+ port);
});

//API includes
var accountAPI = require('./api/account/endpoints.js');
var profileAPI = require('./api/profile/endpoints.js');
var watsonAPI = require('./api/ai/endpoints.js');
var chatAPI = require('./api/chat/endpoints.js');
var dashboardAPI = require('./api/dashboard/endpoints.js');
var satAPI = require('./api/sat/endpoints.js');
app.use(accountAPI);
app.use(profileAPI);
app.use(watsonAPI);
app.use(chatAPI);
app.use(dashboardAPI);
app.use(satAPI);

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

//home page
app.get('/', function(req, res) {
    res.render('templates/index.html');
});

//manage different signup types
app.get('/signup/:signup_type', function(req, res) {
    var signup_type = req.params.signup_type;
    res.render('templates/signup.html', { signup_type : signup_type } );
});

//load dashboard, or log in page if user not logged in
app.get('/dashboard', function(req, res) {
    var userInfo = { logged_in : "false", account_type : null };
    if (req.cookies['token']){
      var token = req.cookies['token'];
      // verify a token symmetric
      jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
        if (!err){
          userInfo.logged_in = "true";
          userInfo.account_type = decoded.type;
        } else {
          //token isn't valid
          //err.name == 'TokenExpiredError'
            userInfo.logged_in = "false";
            res.clearCookie("token");
        }
      });
    } else {
      userInfo.logged_in = "false";
    }

    res.render('templates/dashboard.html', { userInfo : userInfo });
});

//load account recovery page
app.get('/recover', function(req, res) {
    res.render('templates/recover.html',{type: "recover"});
});

//Report a missing person
app.get('/report_missing', function(req, res) {
    res.render('templates/missing.html');
});

//checks if reset token is valid, then loads the reset password page if it is
app.get('/reset/:token', function(req, res) {
    var token = req.params.token;

    // verify a token symmetric
    jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
      if (!err){
        if (decoded.valid_reset)
          res.render('templates/recover.html',{ type: "reset", token: token});
        else
          res.send('Token has expired.');

      } else {
        //token isn't valid
        res.send('Token has expired.');
      }
    });

});

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));
