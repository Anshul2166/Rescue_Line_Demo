var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser');
var nunjucks = require('nunjucks');
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

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

var mydb;

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/cloudant/)) {
  // Load the Cloudant library.
  var Cloudant = require('cloudant');

  // Initialize database with credentials
  if (appEnv.services['cloudantNoSQLDB']) {
     // CF service named 'cloudantNoSQLDB'
     var cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
  } else {
     // user-provided service with 'cloudant' in its name
     var cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
  }

  //database name
  var dbName = 'mydb';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);
}

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
    var userInfo = { logged_in : "true", account_type : "coordinator" };
    res.render('templates/dashboard.html', { userInfo : userInfo });
});


//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));
