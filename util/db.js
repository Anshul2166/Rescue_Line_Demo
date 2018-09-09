var cfenv = require("cfenv");
var Cloudant = require('cloudant-promise');

//handles DB connection to Cloudant
module.exports = class DB {

  //sets up database, default in use is "users"
  constructor(){

    this.db = null;

    // load local VCAP configuration  and service credentials
    var vcapLocal;
    try {
      vcapLocal = require('../vcap-local.json');
      console.log("Loaded local VCAP", vcapLocal);
    } catch (e) {
      console.log(e);
    }

    const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
    console.log(appEnvOpts);
    const appEnv = cfenv.getAppEnv(appEnvOpts);

    if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/cloudant/)) {
      console.log("in app env");
      // Load the Cloudant library.

      // Initialize database with credentials
      if (appEnv.services['cloudantNoSQLDB']) {
         // CF service named 'cloudantNoSQLDB'
         this.cloudant = Cloudant({url:appEnv.services['cloudantNoSQLDB'][0].credentials.url,plugins: 'promises'});
      } else {
         // user-provided service with 'cloudant' in its name
         this.cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
      }

    } else {
      //fail safe, for some read cfenv.getAppEnv isn't parsing appEnvOpts correctly
      this.cloudant = Cloudant(vcapLocal.services['cloudantNoSQLDB'][0].credentials);
    }

    this.use('users_db');

  }

  use(dbName){
    // Specify the database we are going to use e.g 'users'
    // Create database if it doesn't exist
 //    this.cloudant.db.create(dbName, function(err, data) {
 //    	console.log("Inside");
 //    	if(err)
	//     	console.log("Database exists. Error : ", err); 
 //  		else
	//     	console.log("Created database.");
	// });
    this.cloudant.db.create(dbName).then(function(data){
      console.log('created database');
    }).catch(function(err){
      console.log("Some error- Already created in use");
    });
    this.db = this.cloudant.db.use(dbName);
    console.log("Done");
  }

}
