const dbh = require('../server.js').dbh; //import db instance from server.js

//Gets profile by username, you can pass an array of specific fields
 module.exports.getProfile = async (username, fields = []) => {
   var dbName = 'users_db';

   //prepare query
   var query =   {
       "fields" : fields,
       "selector": { "username": { "$eq": username } }
       // "sort": [ { "username": "asc" } ]
     };

   //make request to DB
   const db_response = dbh.cloudant.request(
   {
     db: dbName,
     method: 'POST',
     doc: '_find',
     body: query
   }).then(function(data) {
     console.log(data);
     return {
       "status" : "success",
       "data" : data[0].docs
     };
   }).catch(function(err) {
     console.log(err);
     return buildError(400,"There was a database error. Please try again in a while.");
   });

   return db_response;
 }

 //Updates profile by username
module.exports.updateProfile = async (newProfile) => {
  var dbName = 'users_db';
  console.log("Showing new profile");
  console.log(newProfile);
  dbh.use(dbName);
  //make request to DB
  console.log("Updating profile");
  const db_response = dbh.db.insert(newProfile).then(function(data) {
    console.log(data);
    return {
      "status" : "success",
      "data" : data
    };
  }).catch(function(err) {
    console.log("Error in update profile");
    console.log(err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
}

//builds a very simple error payload
function buildError(code,message){
  return {
    "status" : "error",
    "error" : {
      "code" : code,
      "message" : message
    }
  };
}
