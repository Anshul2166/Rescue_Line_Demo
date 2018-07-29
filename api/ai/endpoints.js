require('dotenv').config();
const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js
const profileManager = require('../../util/profile_manager.js');
const watson = require('watson-developer-cloud');
var request = require('request-promise');
const ioh = require('../../server.js').io; //import io instance from server.js

const AWS = require('ibm-cos-sdk');
var multer  = require('multer');
var multerS3 = require('multer-s3');
var awsConfig = {
    endpoint: 's3-api.us-geo.objectstorage.softlayer.net',
    apiKeyId: process.env.COS_API_KEY,
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
    serviceInstanceId: 'crn:v1:bluemix:public:iam-identity::a/36bf5424ec774ea0b849445b3240d473::serviceid:ServiceId-f2756543-ccef-4fb5-bf6a-32dddfe00bab'
};

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_TOKEN;
const twilio = require('twilio')(accountSid, authToken);
const TwilioResponse = require('twilio').twiml.MessagingResponse;

//for watson assistant
var assistant;

assistant = new watson.AssistantV1({
  'version': '2018-02-16',
  'username': process.env.ASSISTANT_USERNAME || '<username>',
  'password': process.env.ASSISTANT_PASSWORD || '<password>'
});

//lookup intents, we need to know if information is being provided now or in the next message
const intentLookup = {

};

/*************************************
 * ENDPOINT /ai/chat
 * POST - controls the chat flow between the victim and watson assistant
 *************************************
 */
app.post('/api/ai/chat', async (req, res) => {

  if (req.body.location !== null)
    console.log("PRECISE LOCATION",req.body.location);

  var contextDoc,
      identifier,
      inputMsg,
      requestType = null;

  if (typeof req.body.token == "undefined"){
    requestType = "SMS";
    identifier = req.body["From"];
    inputMsg = req.body["Body"];
  } else {
    requestType = "APP";
    //get chat context based on username gotten from token
    var token = req.body.token;
    var userInfo = null;

    // decode the token to get username and type. The chatbot is meant for citizens only
    jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
      if (!err){

        if (decoded.type == "citizen")
          userInfo = decoded;
        else
          res.json(buildError(400,'User is a '+ decoded.type +'. Only citizens are allowed.'));

      } else {
        //token isn't valid
        res.json(buildError(403,'Invalid token'));
      }
    });

    identifier = userInfo.user;
    inputMsg = req.body.input;
  }

  if (identifier === null)
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

    //check if report is live (has already been inserted into reports DB)
    //if it is live, we have to pull info from reports DB
    //we are reusing getContext but passing 'reports' for DB to use
    //sort of 'dirty' but it saves time and works great
    if (contextDoc.is_live && contextDoc.is_finalized !== true){
      var prevInfo = await getContext(identifier,'reports');
      if (typeof prevInfo != "undefined"){
        if (prevInfo.status != "error")
          contextDoc.info = prevInfo;
        else
          contextDoc.info = {};
      }
    }

    if (contextDoc.is_finalized){
      //this is an old context already finalized. start with new context
      contextDoc = {
        "identifier" : identifier
      };
      var context = {};
    } else {
      var context = contextDoc.context;
    }
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

    //analyzeResponse will read contextDoc current_state to try to "save information", will reply with text response / info doc
    //will also update current_state. This will be a part of info
    var response = await analyzeResponse(data,contextDoc);

    contextDoc.context = data.context;
    contextDoc.timestamp = Date.now();

    //check if chat was inserted into DB. We would be getting info from reports DB now so we delete .info
    if (typeof response.info.is_live != "undefined"){
      contextDoc.is_live = response.info.is_live;
      response.info.identifier = identifier;
      delete contextDoc.info;
    }

    //check if chat has been completed (final info has been taken)
    if (typeof response.info.is_finalized != "undefined")
      contextDoc.is_finalized = response.info.is_finalized;

    //will still need previous intent
    if (data.intents.length > 0)
      contextDoc.previous_intent = data.intents[0].intent;

    //if precise location is available in request, update that into info variable
    if (req.body.location !== null)
      response.info.device_location = { "geometry" : { type: 'Point', coordinates: [ req.body.location.lng, req.body.location.lat ] } };

    console.log('INFO BEFORE INSERT');
    //either insert info into reports DB or into context DB
    if (contextDoc.is_live)
      var reportInsertStatus = await updateContext(response.info,"reports");
    else
      contextDoc.info = response.info;

    var contextStatus = await updateContext(contextDoc);

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
          "attachments" : response.attachments || []
        }
      });
    }
  });

});

/*###################################
 * HELPER FUNCTIONS BELOW
 ####################################
 */


//analyzes watson response and returns a suitable message
const analyzeResponse = async (data,prevContext) => {
  var chatData = {};
  var chatInput;

  //set default response values
  var response = {
   msg : "We want to help you, but your response isn't clear. Please provide more details so that we can identify the issue and quickly route your emergency.",
   info : prevContext.info || {}
  };

  console.log("CURRENT DATA", data);
  console.log("PREVIOUS INTENT", prevContext.previous_intent);

  // TODO: will analyze prevContext for previous intents
  //and will see if users message contains any valuable information related to that that needs to be saved
  //current_state will be in info.current_state

  //assign previous input and intent to chatData
  chatData.input = data.input.text;
  chatData.previous_intent = prevContext.previous_intent;
  chatData.previous_weight = response.info.priority_weight;

  //if watson found an intent take the best prediction
  if (data.intents.length > 0)
   chatData.intent = data.intents[0].intent;

  //if watson found system entity, take most relevant
  if (data.entities.length > 0)
   chatData.entity = data.entities[0]; //is an object { entity: {sys-number} , value: {String} }

  //if watson had a response, take best relevant prediction
  if (data.output.text.length > 0)
   response.msg = data.output.text[0];

  //pass on to relevant state handler so we can process the data in context to convo
  if (typeof stateHandlers[response.info.current_state] != "undefined"){
    processedState = await stateHandlers[response.info.current_state](chatData);
    console.log("PROCESSEDSTATE",processedState);
    console.log("CURRENT_STATE",response.info.current_state);
    response.info.current_state = processedState.new_state;
    response.attachments = processedState.attachments || [];

    //save any important info weeded out by stateHandlers
    if (typeof processedState.info != "undefined"){
      for (var i = 0; i < processedState.info.length; i++)
        response.info[processedState.info[i].key] = processedState.info[i].value;
    }

    //push to coordinator dashboards
    if (processedState.push)
      ioh.io.to(response.info.user_country).emit('report', JSON.stringify(response.info));


  } else {
    if (typeof intentDict[chatData.intent] != "undefined"){
      processedState = await stateHandlers["intent_identification"](chatData);
      response.info.current_state = processedState.new_state;
      response.attachments = processedState.attachments || [];

      //save any important info weeded out by stateHandlers
      if (typeof processedState.info != "undefined"){
        for (var i = 0; i < processedState.info.length; i++)
          response.info[processedState.info[i].key] = processedState.info[i].value;
      }
    }
  }

  //update current time before sending back
  response.info.timestamp = Date.now();

  console.log("RESPONSE BEING SENT",response);
  return response;
}

//Lookup dictionary so we can understand type of intents
// d is for disaster / after-effect. These follow the same flow of info collection
// t is for special tasks. These will require a different type of flow
// base_weight is also set. Weight >= 0.95 is BLACK, weight >= 0.8 is RED, >= 0.5 is YELLOW , > 0.0 Green emergency
// every life threatening injury is +0.05 weight added. Every minor injury is +0.01
// every nearby event of same type reported adds +0.0025
// example: user reports fire, 1 person seriously injured, 4 people minor injures and 6 other people nearby report the incident
// weight would be 0.7 + 0.05 + 0.04 + 0.015 = 0.805
// example two: 50 people that have been displaced from home and do not have clean food or water. 0.4 + (50 * 0.0025) = 0.525 (YELLOW)
var intentDict = {
 "fire" : { t: "d" , base_weight: 0.7 },
 "earthquake" : { t: "d" , base_weight: 0.7 },
 "avalanche" : { t: "d" , base_weight: 0.7 },
 "tornado" : { t: "d" , base_weight: 0.7 },
 "volcano" : { t: "d" , base_weight: 0.7 },
 "flood" : { t: "d" , base_weight: 0.7 },
 "landslide" : { t: "d" , base_weight: 0.7 },
 "tsunami" : { t: "d" , base_weight: 0.7 },
 "sandstorm" : { t: "d" , base_weight: 0.6 },
 "needs_medic" : { t: "d" , base_weight: 0.6 },
 "trapped" : { t: "d" , base_weight: 0.75 },
 "needs_supplies" : { t: "d" , base_weight: 0.4 },
 "needs_shelter" : { t: "s" , base_weight: 0.1 }, //submit into DB still
 "missing" : { t: "s" , base_weight: 0.1 }, //submit into DB
 "reported_incident" : { t: "s" , base_weight: 0.1 } //submit into DB
};

//these functions handle specific state in the chat and moves on to next state if it meets certain conditions
//if it doesn't meet conditions, return empty object {} to destroy state, else return chatData to keep current state
//the states are:
//intent_identification //identifies "fire" , this state is implicitly handled by watson since it is the first state
//intent_verification   //verifies that "fire" was the correct intent by asking user Yes/No
//address_query         //asks for address
//serious_injury_yesno  //asks if there are any seriously injured
//serious_injury_query  //asks for the specific number of people seriously injured (if user answered yes to prior)
//regular_injury_query  //asks for the specifc number of people with a non-severe injury
//get_image_query       //asks for an image from user
//more_info_query       //asks for any additional information that the victim wants to provide
var stateHandlers = {
  "intent_identification" : async (chatData) => {
      var intentType = intentDict[chatData.intent];
      var data = {};

      if (intentType.t == "d"){
        //is a disaster, so will follow the normal chat flow
        chatData.current_state = "intent_verification";
        //do something with chatData.input
        data.key = "first_explanation";
        data.value = chatData.input;

      } else if (intentType.t == "s") {
        //is a task, will have to do something specific for each task
        //TODO: will focus on "d" for now then come to this

      }

      return { new_state : chatData.current_state, info : [data] };
  },
  "intent_verification" : async (chatData) => {
    if (chatData.intent == "yes"){
      //successfully guessed intent
      return {
        new_state : "address_query",
        info : [{ key: "verified_intent" , value: chatData.previous_intent },{ key: "priority_weight" , value: intentDict[chatData.previous_intent].base_weight }]
      };
    } else {
      return {}; //forget chat state
    }
  },
  "address_query" : async (chatData) => {
    var allInfo = [];
    if (chatData.intent == "address"){
      allInfo.push({ key: "address", value: chatData.input });

      var mapboxToken = "pk.eyJ1Ijoicm9naTU1NSIsImEiOiJjajh1MjJnYTYwdXU4MzNtYnZ5NHl1dGhpIn0.CBUJUe_M8sLWykZgHIpfIw";

      var address_geocoded = await request.get('https://api.mapbox.com/geocoding/v5/mapbox.places/'+ chatData.input +'.json?access_token='+ mapboxToken +'&limit=1', { json:true })
      .then(function(response,body){
        console.log(response);
        if (response.features.length > 0){
          var country = null;
          for (var i = 0; i < response.features[0].context.length; i++){
            if (response.features[0].context[i].id.slice(0,8) == "country.")
              country = response.features[0].context[i].short_code;
          }
          return {
            "country": country,
            "geojson": { "geometry" : response.features[0].geometry }
          };
        } else {
          return "not_found";
        }
      }).catch(function(err){
        console.log(err);
        return "not_found";
      });

      if (address_geocoded == "not_found"){
        allInfo.push({ key: "address_geocoded", value: address_geocoded });
      } else {
        allInfo.push({ key: "address_geocoded", value: address_geocoded.geojson });
        allInfo.push({ key: "user_country", value: address_geocoded.country });
      }

      //TODO: get number of incidences of type of "intent" nearby, modify priority_weight

      //mark as is_live so we know that we are inserting it into reports
      allInfo.push({ key: "is_live", value: true });

      return { new_state : "serious_injury_yesno", info : allInfo , push : true };
    } else {
      return {};
    }
  },
  "serious_injury_yesno" : async (chatData) => {
    if (chatData.intent == "yes"){
      chatData.current_state = "serious_injury_query";
    } else if (chatData.intent == "no") {
      chatData.current_state = "regular_injury_query";
    }
    return { new_state : chatData.current_state };
  },
  "serious_injury_query" : async (chatData) => {
    var newData = [];
    var injuryCount = 0;
    if (typeof chatData.entity != "undefined"){
      if (chatData.entity.entity == "sys-number"){
        injuryCount = parseInt(chatData.entity.value);
        //calculate new weight
        chatData.previous_weight += (injuryCount * 0.05);
        newData.push({ key: "serious_injuries" , value: injuryCount });
        newData.push({ key: "priority_weight" , value: chatData.previous_weight });
      }
      return { new_state : "regular_injury_query", info : newData };
    } else {
      return { };
    }
  },
  "regular_injury_query" : async (chatData) => {
    var newData = [];
    var injuryCount = 0;
    if (typeof chatData.entity != "undefined"){
      if (chatData.entity.entity == "sys-number"){
        injuryCount = parseInt(chatData.entity.value);
        //calculate new weight
        chatData.previous_weight += (injuryCount * 0.01);
        newData.push({ key: "minor_injuries" , value: injuryCount });
        newData.push({ key: "priority_weight" , value: chatData.previous_weight });
      }
      return { new_state : "more_info_query", info : newData };
    } else {
      return { };
    }

  },
  "more_info_query" : async (chatData) => {
    return { info: [{ key: "additional_info" , value: chatData.input }, {key: "is_finalized", value: true }] };
  }
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

/*
 * Get current chat context or info doc
 */
const getContext = async (identifier, db) => {
  console.log("GET CONTEXT DB",db);
  var dbName = db || 'context_db';

  //only get contexts with watson from 12 hours ago
  var halfdayAgo = Date.now() - 43200000;

  //prepare query
  var query =   {
//      "fields": [],
      "selector": {
        "identifier" : { "$eq": identifier },
        "timestamp": { "$gt": halfdayAgo }
      },
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
const updateContext = async (newContext, db) => {
  var dbName = db || 'context_db';

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
