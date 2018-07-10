require('dotenv').config();
const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js
const profileManager = require('../../util/profile_manager.js');
const watson = require('watson-developer-cloud');

const AWS = require('ibm-cos-sdk');
var multer  = require('multer');
var multerS3 = require('multer-s3');
var awsConfig = {
    endpoint: 's3-api.us-geo.objectstorage.softlayer.net',
    apiKeyId: 'L7aO9YtTajvJjSGJZOkWxyouKZq583uIG8_7oW8cJV6Y',
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
    serviceInstanceId: 'crn:v1:bluemix:public:iam-identity::a/36bf5424ec774ea0b849445b3240d473::serviceid:ServiceId-f2756543-ccef-4fb5-bf6a-32dddfe00bab'
};

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilio = require('twilio')(accountSid, authToken);
const TwilioResponse = require('twilio').twiml.MessagingResponse;
console.log("twilio response",TwilioResponse);

//for watson assistant
var assistant;

assistant = new watson.AssistantV1({
  'version': '2018-02-16',
  'username': process.env.ASSISTANT_USERNAME || '<username>',
  'password': process.env.ASSISTANT_PASSWORD || '<password>'
});
console.log(assistant);

/*************************************
 * ENDPOINT /ai/chat
 * POST - controls the chat flow between the victim and watson assistant
 *************************************
 */
app.post('/api/ai/chat', async (req, res) => {

  var contextDoc,
      identifier,
      inputMsg,
      requestType = null;

  if (typeof req.body.token == "undefined"){
    requestType = "SMS";
    console.log(req.body);
    identifier = req.body["From"];
    inputMsg = req.body["Body"];
    console.log("SMS IDENTIFIER",identifier);
  } else {
    requestType = "APP";
    //get chat context based on username gotten from token
    var token = req.body.token;
    var userInfo = null;

    // decode the token to get username and type. The chatbot is meant for citizens only
    jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
      if (!err){
        console.log(decoded);

        if (decoded.type == "citizen")
          userInfo = decoded;
        else
          res.json(buildError(400,'User is a '+ userInfo.type +'. Only citizens are allowed.'));

      } else {
        //token isn't valid
        res.json(buildError(403,'Invalid token'));
      }
    });

    identifier = userInfo.user;
    inputMsg = req.body.input;
  }
  console.log("IDENTIFIER: ",identifier);

  if (identifier == null)
    return false;

  //get latest chat context based on identifier
  var contextDoc = await getContext(identifier);

  if (typeof contextDoc == "undefined"){
    //context not found, so initialize to {}
    contextDoc = {
      "identifier" : identifier
    };
    var context = {};
  } else {
    console.log("OLD CONTEXT DOC",contextDoc);
    var context = contextDoc.context;
  }
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';

  //prepare message to send to watson
  var payload = {
    workspace_id: workspace,
    context: context || {},
    input: { text: inputMsg } || {}
  };

  //send message to watson
  assistant.message(payload, async (err, data) => {
    if (err) {
      console.log(err);
      return res.json(buildError(err.code,err.error));
    }
    // TODO: process response to update info object / prompt for more information in front end
    //analyzeResponse will read contextDoc previous intents to try to "save information", will reply with text response / info doc
    var response = analyzeResponse(data,contextDoc);
    contextDoc.info = response.info;
    contextDoc.context = data.context;
    contextDoc.previousIntents = data.intents;
    contextDoc.timestamp = Date.now();
    console.log("NEW CONTEXT DOC",contextDoc);
    var contextStatus = await updateContext(contextDoc,identifier);
    if (requestType == "SMS"){
      const twiml = new TwilioResponse();

      twiml.message(response.msg);

      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(twiml.toString());
    } else {
      return res.json({
        "status" : "success",
        "data" : {
          "msg" : response.msg,
          "codes" : ["{image-request}"] //just an example. This would be processed client side to ask for image of missing person for example
        }
      });
    }
  });

});

/*###################################
 * HELPER FUNCTIONS BELOW
 ####################################
 */

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

/*
 * Get current chat context
 */
const getContext = async (identifier) => {
  var dbName = 'context_db';

  //prepare query
  var query =   {
      "fields": [ "_id","_rev","identifier","context","info","timestamp" ],
      "selector": { "identifier" : { "$eq": identifier } },
      "sort":[{ "timestamp":"desc" }],
    };

  //make request to DB
  const db_response = dbh.cloudant.request({
    db: dbName,
    method: 'POST',
    doc: '_find',
    body: query
  }).then(function(data) {
    //[0] to return latest / most relevant
    return data.docs[0];
  }).catch(function(err) {
    console.log('something went wrong', err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
}

/*
 * Update context document
 */
const updateContext = async (newContext) => {
  var dbName = 'context_db';

  dbh.use(dbName);
  //make request to DB
  const db_response = dbh.db.insert(newContext).then(function(data) {
    return {
      "status" : "success",
      "data" : data
    };
  }).catch(function(err) {
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
}

//analyzes watson response and returns a suitable message
function analyzeResponse(data,prevContext){
  console.log("DATA RECEIVED",data);
  //set default response values
  var response = {
    msg : "We want to help you, but your response isn't clear. Please provide more details so that we can quickly route your emergency.",
    info : {}
  };

  // TODO: will analyze prevContext for previous intents
  //and will see if users message contains any valuable information related to that that needs to be saved

  //if watson had a response, take best relevant prediction
  if (data.output.text.length > 0){
    console.log("IN IF");
    response.msg = data.output.text[0];
  }

  console.log("RESPONSE BEING SENT",response);
  return response;
}

// //for speech to text
// const stt = new watson.SpeechToTextV1({
//   'username': process.env.SPEECH_TO_TEXT_USERNAME || '<username>',
//   'password': process.env.SPEECH_TO_TEXT_PASSWORD || '<password>'
// });
// const authService = new watson.AuthorizationV1(stt.getCredentials());

// //I will use this token to build speech to text later on
// // Get token using your credentials for speech to text
// app.get('/api/ai/speech/token', (req, res, next) => {
//   authService.getToken((err, token) => {
//     if (err) {
//       next(err);
//     } else {
//       res.send(token);
//     }
//   });
// });

// //Twilio example
// twilio.messages
//   .create({
//      body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
//      from: '+19136015894 ',
//      to: '+19139917128'
//    })
//   .then(message => console.log(message.sid))
//   .done();
