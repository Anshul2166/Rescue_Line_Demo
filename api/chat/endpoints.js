const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js
const signer = require('../../util/signed_url.js');
const profileManager = require('../../util/profile_manager.js');
const ioh = require('../../server.js').io; //import io instance from server.js

/*************************************
 * ENDPOINT /logs
 * Get logs from a chat
 *************************************
 */
app.get('/api/chat/logs', async (req, res) => {
  var username = req.query.username;
  var token = req.query.token;
  var tokenInfo, chatId, logs = null;

  if (typeof username == "undefined" || username === "undefined"){
    res.json(buildError(403,"Invalid username for chat request"));
    return false;
  }
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

  //get chatId, with chat ID, we can search all logs
  chatId = (username < tokenInfo.user) ? username+":"+tokenInfo.user : tokenInfo.user+":"+username;

  const db_response = await getChatLogs(chatId);

  for (var i = 0; i < db_response.data.length; i++){
    db_response.data[i].timestamp = processStamp(db_response.data[i].timestamp);
  }

  res.json(db_response);
});

/*************************************
 * ENDPOINT /history
 * Get recent chat history
 *************************************
 */
app.get('/api/chat/history/:token', async (req, res) => {
  var token = req.params.token;
  var tokenInfo = null;
  var history = {};

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

  const db_response = await getChatHistory(tokenInfo.user);
  console.log("Getting chat history");
  console.log(db_response);
  //reduce chat logs to only most recent
  if (db_response[0].data.length > 0){
    for (var i = 0; i < db_response.data.length; i++){
      if (typeof history[db_response.data[i].chat_id] == "undefined" || history[db_response.data[i].chat_id].timestamp < db_response.data[i].timestamp)
        history[db_response.data[i].chat_id] = db_response.data[i];
    }
  }

  //convert to array and get profile
  db_response.data = await Promise.all(Object.keys(history).map(async (key,index) => {
    var thisProfile = {};
    var otherUser = null;
    var thisHistory = history[key];

    if (thisHistory.sender == tokenInfo.user){
      otherUser = thisHistory.receiver;
      thisHistory.read = true;
    } else {
      otherUser = thisHistory.sender;
    }

    thisProfile = await profileManager.getProfile(otherUser,["name","profile_pic"]);

    if (thisProfile.status == "success" && typeof thisProfile.data != "undefined"){
      if (typeof thisProfile.data["profile_pic"] != "undefined")
        thisProfile.data["profile_pic"] = signer.signUrl("rl-profile",thisProfile.data["profile_pic"],120);

    thisProfile.data.other_user = otherUser;
    thisHistory = Object.assign({}, thisHistory, thisProfile.data);

    delete thisHistory.timestamp;
    }

    return thisHistory;
  }));

  res.json(db_response);
});

/*************************************
 * ENDPOINT /nearby
 * Get nearby user
 *************************************
 */
app.get('/api/chat/nearby', async (req, res) => {
  var token = req.query.token;
  var location;
  var tokenInfo, thisProfile = null;
  var nearby = {};

  try {
    location = JSON.parse(req.query.location);
  } catch(e) {
      res.json(buildError(400,"Invalid JSON string for location."));
      return false;
  }

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

  const db_response = await getNearby(location);

  console.log(db_response);

  db_response.data = await Promise.all(db_response.data.filter(function(obj) {

    if (obj.doc.type == "coordinator" || obj.doc.username == tokenInfo.user)
      return false; // skip

    return true;

  }).map(async (obj,index) => {

    thisProfile = obj.doc;

    if (typeof thisProfile["profile_pic"] != "undefined")
      thisProfile["profile_pic"] = signer.signUrl("rl-profile",thisProfile["profile_pic"],120);

    return {
      username: thisProfile.username,
      name: thisProfile.name,
      profile_pic: thisProfile.profile_pic || null,
      type: thisProfile.type
    };

  }));

  res.json(db_response);
});

/*************************************
 * ENDPOINT /send
 * Send chat to user
 *************************************
 */
app.post('/api/chat/send', async (req, res) => {
  var chatInfo = req.body.message;
  var token = req.body.token;
  var tokenInfo, chatId = null;

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

  //create chatId, this is important
  chatId = (chatInfo.receiver < tokenInfo.user) ? chatInfo.receiver+":"+tokenInfo.user : tokenInfo.user+":"+chatInfo.receiver;

  chatInfo.chat_id = chatId;
  chatInfo.sender = tokenInfo.user;
  chatInfo.read = false;
  chatInfo.timestamp = Date.now();

  const db_response = await insertChat(chatInfo);

  // TODO: if db_response is good, try to emit to socket at chatInfo.receiver
  if (db_response.status == 'success'){
    if (typeof ioh.connections[chatInfo.receiver] != "undefined"){
      chatInfo.timestamp = processStamp(chatInfo.timestamp);
      ioh.io.to(ioh.connections[chatInfo.receiver]).emit('chat', JSON.stringify(chatInfo));
    } else {
      console.log("SOCKET CONNECTION NOT FOUND");
    }
  }

  return res.json(db_response);

});

/*************************************
 * ENDPOINT /read
 * Mark a chat as read using _id for doc
 *************************************
 */
app.get('/api/chat/read/:id', async (req, res) => {
  var docId = req.params.id;

  if (typeof docId == "undefined" || docId == "undefined"){
    res.json(buildError(400,"Invalid document _id"));
    return false;
  }

  const db_response = await readChat(docId);

  return res.json(db_response);

});

/*###################################
 * HELPER FUNCTIONS BELOW
 ####################################
 */


 /*
  * Gets chat logs for specific chatId
  */
const getChatLogs = async (chatId) => {
  var dbName = 'chat_logs';
  //get chat logs from within 24 hours ago
  var dayAgo = Date.now() - 86400000;

  //prepare query
  var query =   {
      "fields": [ "sender","receiver","msg","timestamp" ],
      "selector": {
        "chat_id": { "$eq": chatId },
        "timestamp": { "$gt": dayAgo }
      }
      // "sort": [ { "timestamp": "asc" } ]
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
      "data" : data.docs
    };
  }).catch(function(err) {
    console.log("getChatLogs ERROR",err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
};


/*
 * Get all nearby users
 */
const getNearby = async (coords) => {
  var dbName = 'users_db';
  dbh.use(dbName);

  // Find nearby users within 8km (~ 5 miles) radius
  var query = {
    lat: coords.lat,
    lon: coords.lng,
    radius: 8000,
    relation: "contains",
    include_docs:true
  };

  var db_response = dbh.db.geo('locationDoc', 'locationIndex', query).then(function(data) {
    return {
      "status" : "success",
      "data" : data.rows
    };
  }).catch(function(err){
    console.log("getNearby ERROR",err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
};

/*
 * Get all chat history for specific username, within the past 24 hours
 */
const getChatHistory = async (username) => {
  var dbName = 'chat_logs';
  //get chat logs from within 24 hours ago
  var dayAgo = Date.now() - 86400000;

  //prepare query
  var query =   {
      "fields": [ "_id","chat_id","sender","receiver","read","msg","timestamp" ],
      "selector": {
        "timestamp": { "$gt": dayAgo },
        "$or": [
           { "sender": { "$eq": username } },
           { "receiver": { "$eq": username } }
         ]
      }
      // "sort": [ { "timestamp": "asc" } ]
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
      "data" : data.docs
    };
  }).catch(function(err) {
    console.log(err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
};

/*
 * Inserts chat into logs
 */
const insertChat = async (chat) => {
 var dbName = 'chat_logs';

 dbh.use(dbName);
 //make request to DB
 const db_response = dbh.db.insert(chat).then(function(data) {
   return {
     "status" : "success",
     "data" : data
   };
 }).catch(function(err) {
   return buildError(400,"There was a database error. Please try again in a while.");
 });

 return db_response;
};

/*
 * Marks a chat as read
 */
const readChat = async (docId) => {
  var dbName = "chat_logs";

  dbh.use(dbName);

  const db_response = dbh.db.get(docId).then(function (existing, err) {
    if(!err) existing.read = true;
    return dbh.db.insert(existing).then(function(data){
      return {
        "status" : "success",
        "data" : data
      };
    }).catch(function(err){
      console.log(err);
      return buildError(400,"There was a database error. Please try again in a while.");
    });
  }).catch(function(err){
    console.log(err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;

};

//takes in timestamp and returns meaningful string such as "3 mins ago"
function processStamp(timestamp){
  //get time difference in seconds
  var diff = (Date.now() - timestamp) / 1000;
  if (diff < 10)
    return "now";
  else if (diff < 60)
    return Math.floor(diff) + " secs ago";
  else if (diff < 3600)
    return Math.floor((diff / 60)) + " minutes ago";
  else
    return Math.floor((diff / 3600)) + " hours ago";
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
