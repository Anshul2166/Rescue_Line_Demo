var express = require("express");
var app = express();
//var cfenv = require("cfenv");
var bodyParser = require('body-parser');
var nunjucks = require('nunjucks');
var cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
var DB = require('./util/db.js');
exports.dbh = new DB();
exports.parser = function(){
  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));
  // parse application/json
  app.use(bodyParser.json());
  app.use(cookieParser());

};

//API includes
var accountAPI = require('./api/account/endpoints.js');
var profileAPI = require('./api/profile/endpoints.js');
app.use(accountAPI);
app.use(profileAPI);

var port = process.env.PORT || 3000;
var http = require('http').Server(app);
var io = require('socket.io')(http);

//Basic websocket configuration
io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    socket.emit('chat message',"Hello back to you");
  });
});

http.listen(port, function(){
  console.log('listening on :'+ port);
});

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
      console.log(req.cookies['token']);
      var token = req.cookies['token'];
      // verify a token symmetric
      jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
        if (!err){
          console.log(decoded);
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


//checks if reset token is valid, then loads the reset password page if it is
app.get('/reset/:token', function(req, res) {
    var token = req.params.token;

    // verify a token symmetric
    jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
      if (!err){
        console.log(decoded);
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
