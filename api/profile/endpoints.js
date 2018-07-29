require('dotenv').config();
const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js
const signer = require('../../util/signed_url.js');
const profileManager = require('../../util/profile_manager.js');
const AWS = require('ibm-cos-sdk');
const sharp = require('sharp');
var multer  = require('multer');
var multerS3 = require('multer-s3-transform');
var awsConfig = {
    endpoint: 's3-api.us-geo.objectstorage.softlayer.net',
    apiKeyId: process.env.COS_API_KEY,
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
    serviceInstanceId: 'crn:v1:bluemix:public:iam-identity::a/36bf5424ec774ea0b849445b3240d473::serviceid:ServiceId-f2756543-ccef-4fb5-bf6a-32dddfe00bab'
};

var s3 = new AWS.S3(awsConfig);

var myBucket = 'rl-profile';

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: myBucket,
        shouldTransform: true,
        transforms: [{
          id: "thumbnail",
          key: function (req, file, cb) {
            var fileObj = {
               "image/png": ".png",
               "image/jpeg": ".jpeg",
               "image/jpg": ".jpg"
             };
            if (fileObj[file.mimetype] == undefined) {
             cb(new Error("file format not valid"));
            } else {
             cb(null, 'p-' + Date.now() + fileObj[file.mimetype]);
            }
          },
          transform: function (req, file, cb) {
            cb(null, sharp().resize(150, 150).jpeg());
          }
      }]
    })
});

/*************************************
 * ENDPOINT /profile
 * GET - get profile info
 *************************************
 */
app.get('/api/profile/:token', async (req, res) => {
  var tokenInfo = null;
  var token = req.params.token;
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
  if (tokenInfo != null ){
    const db_response = await profileManager.getProfile(tokenInfo.user);
    //delete sensitive data before sending to client
    if (db_response.status == "success"){
      delete db_response.data["_id"];
      delete db_response.data["_rev"];
      delete db_response.data["password"];
      delete db_response.data["location"];
      delete db_response.data["location_timestamp"];
      delete db_response.data["code"];
    }
    if (typeof db_response.data["profile_pic"] != "undefined"){
      //get signed url for profile pic. Expiry time is set to 120 seconds
      db_response.data["profile_pic"] = signer.signUrl("rl-profile",db_response.data["profile_pic"],120);
    }
    res.json(db_response);
  }
});

/*************************************
 * ENDPOINT /profile
 * POST - updates a profile
 *************************************
 */
app.post('/api/profile', async (req, res) => {
  var profile = req.body.profile;

  var tokenInfo = null;
  var token = req.body.token;

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

  //make sure user isn't updating username, privilege level, country code, or account type
  if (typeof profile.username != "undefined")
    delete profile.username;
  if (typeof profile.privilege != "undefined")
    delete profile.privilege;
  if (typeof profile.country != "undefined")
    delete profile.country;
  if (typeof profile.type != "undefined")
    delete profile.type;


  //get profile from DB
  let db_profile = await profileManager.getProfile(tokenInfo.user);

  db_profile = db_profile.data;

  //update db_profile with any keys that were included
  for (var key in profile){
    db_profile[key] = profile[key];
  }

  //update profile
  const updateStatus = await profileManager.updateProfile(db_profile);

  res.json(updateStatus);
});

/*************************************
 * ENDPOINT /profile/image
 * POST - updates a profile image
 *************************************
 */
app.post('/api/profile/image', upload.single('image'), async (req, res) => {
  var fileLocation = req.file.transforms[0].key;
  var token = req.body.token;

  console.log("FILE VAR",req.file);

  var tokenInfo = null;
  //verify token
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

  //get profile from DB
  let db_profile = await profileManager.getProfile(tokenInfo.user);

  db_profile = db_profile.data;

  if (typeof db_profile["profile_pic"] != "undefined"){
    //delete old profile pic if exists
    deleteObject('rl-profile',db_profile["profile_pic"]);
  }

  //update db_profile with new profile_pic nam
  db_profile["profile_pic"] = fileLocation;

  //save profile in DB
  const updateStatus = await profileManager.updateProfile(db_profile);

  //create signed url so we have the picture URL and can update profile pic on client side
  updateStatus.data["profile_pic"] = signer.signUrl('rl-profile',fileLocation,120);

  res.json(updateStatus);
});

/*************************************
 * ENDPOINT /profile/location
 * POST - updates a user's latest location
 *************************************
 */
app.post('/api/profile/location', async (req, res) => {
  var location = req.body.location;
  console.log("LOCATION RECEIVED",location);

  var tokenInfo = null;
  var token = req.body.token;

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

  //get profile from DB
  let db_profile = await profileManager.getProfile(tokenInfo.user);

  db_profile = db_profile.data;

  //update location and timestamp
  db_profile.geo = {
    "type": "Feature",
    "properties": {
        "timestamp": Date.now(),
        "version": "1.01"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [location.lng,location.lat]
    }
  };

  //update profile
  const updateStatus = await profileManager.updateProfile(db_profile);

  res.json(updateStatus);
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

 //delete object
 function deleteObject(bucket,key) {
     return s3.deleteObject({
         Bucket: bucket,
         Key: key
     }).promise();
 }
