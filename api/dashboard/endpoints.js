const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js

/*************************************
 * ENDPOINT /settings
 * POST to save dashboard settings in DB
 *************************************
 */
app.post('/api/dashboard/settings', async (req, res) => {
  var settings = req.body.settings;
  var token = req.body.token;
  var tokenInfo = null;

  jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
    if (!err){
      //token is valid
      tokenInfo = decoded;
    } else {
      //token isn't valid
      if (err.name == 'TokenExpiredError'){
        res.json(buildError(403,"Token expired"));
      } else {
        res.json(buildError(403,"Could not verify token"));
      }
      return false;
    }
  });

  if (tokenInfo == null)
    return false;

  if (tokenInfo.type == "citizen"){
    res.json(buildError(403,"You cannot access this function with a Citizen account"));
    return false;
  }

  var settingsDoc = await getSettings(tokenInfo.user);

  if (settingsDoc.status == "success" && settingsDoc.data != "not_found")
    settingsDoc.data.settings = settings;
  else
    settingsDoc = { data : { username: tokenInfo.user, settings: settings } };

  const db_response = await updateSettings(settingsDoc.data);

  return res.json(db_response);

});

/*************************************
 * ENDPOINT /settings
 * GET to get dashboard settings from DB
 *************************************
 */
app.get('/api/dashboard/settings/:token', async (req, res) => {
  var token = req.params.token;
  var tokenInfo = null;

  jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
    if (!err){
      //token is valid
      tokenInfo = decoded;
    } else {
      //token isn't valid
      if (err.name == 'TokenExpiredError'){
        res.json(buildError(403,"Token expired"));
      } else {
        res.json(buildError(403,"Could not verify token"));
      }
      return false;
    }
  });

  if (tokenInfo == null)
    return false;

  if (tokenInfo.type == "citizen"){
    res.json(buildError(403,"You cannot access this function with a Citizen account"));
    return false;
  }

  var db_response = await getSettings(tokenInfo.user);

  if (db_response.data == "not_found")
    db_response.data = {};

  return res.json(db_response);

});

/*
 * HELPER FUNCTIONS BELOW
 */

//updates / inserts dashboard settings
const updateSettings = async (newSettings) => {
  var dbName = 'dash_settings';

  dbh.use(dbName);
  //make request to DB
  const db_response = dbh.db.insert(newSettings).then(function(data) {
    return {
      "status" : "success",
      "data" : data
    };
  }).catch(function(err) {
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
};

//gets dashboard settings doc
const getSettings = async (username) => {
  var dbName = 'dash_settings';

  //prepare query
  var query =   {
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
    return {
      "status" : "success",
      "data" : data.docs[0] || "not_found"
    };
  }).catch(function(err) {
    console.log(err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
};

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
