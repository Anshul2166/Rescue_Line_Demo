var cfenv = require("cfenv");

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

    const appEnv = cfenv.getAppEnv(appEnvOpts);

    if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/cloudant/)) {
      // Load the Cloudant library.
      var Cloudant = require('cloudant');

      // Initialize database with credentials
      if (appEnv.services['cloudantNoSQLDB']) {
         // CF service named 'cloudantNoSQLDB'
         this.cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
      } else {
         // user-provided service with 'cloudant' in its name
         this.cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
      }

      this.use('users_db');

    }

  }

  use(dbName){
    // Specify the database we are going to use e.g 'users'
    // Create database if it doesn't exist
    this.cloudant.db.create(dbName).then(function(data){
      console.log('created database');
    }).catch(function(err){
      //console.log(err);
      //will throw error, DB already exists
    });
    this.db = this.cloudant.db.use(dbName);
  }

}
