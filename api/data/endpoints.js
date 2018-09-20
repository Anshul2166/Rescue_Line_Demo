const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js

app.post('/api/data/feed', async (req, res) => {
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

  var feed=await get_feed();
  if (feed.status == "success" && settingsDoc.data != "not_found")
    feed.data.settings = settings;
  else
    feed = { data : { username: tokenInfo.user, feed: feed } };

  return res.json(feed);

});

const get_feed=async ()=>{
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