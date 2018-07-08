const dbh = require('../server.js').dbh; //import db instance from server.js

//Gets profile by username
 module.exports.getProfile = async (username) => {
   var dbName = 'users_db';

   //prepare query
   var query =   {
       "fields": [ "_id","_rev","username","name","password","email","phone","type","code","blood_type","profile_pic","contact" ],
       "selector": { "username": { "$eq": username } },
       "sort": [ { "username": "asc" } ]
     };

   //make request to DB
   const db_response = dbh.cloudant.request(
   {
     db: dbName,
     method: 'POST',
     doc: '_find',
     body: query
   }).then(function(data) {
     return {
       "status" : "success",
       "data" : data.docs[0]
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

  dbh.use(dbName);
  //make request to DB
  const db_response = dbh.db.insert(newProfile).then(function(data) {
    return {
      "status" : "success",
      "data" : data
    };
  }).catch(function(err) {
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
}
