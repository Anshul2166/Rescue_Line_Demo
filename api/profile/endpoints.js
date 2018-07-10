const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js
const signer = require('../../util/signed_url.js');
const profileManager = require('../../util/profile_manager.js');
const AWS = require('ibm-cos-sdk');
var multer  = require('multer');
var multerS3 = require('multer-s3');
var awsConfig = {
    endpoint: 's3-api.us-geo.objectstorage.softlayer.net',
    apiKeyId: 'L7aO9YtTajvJjSGJZOkWxyouKZq583uIG8_7oW8cJV6Y',
    ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
    serviceInstanceId: 'crn:v1:bluemix:public:iam-identity::a/36bf5424ec774ea0b849445b3240d473::serviceid:ServiceId-f2756543-ccef-4fb5-bf6a-32dddfe00bab'
};

var s3 = new AWS.S3(awsConfig);

var myBucket = 'rl-profile';

var upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: myBucket,
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
        }
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

  //make sure user isn't updating username
  if (typeof profile.username != "undefined"){
    delete profile.username;
  }

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
  console.log(req.file.key);
  var fileLocation = req.file.key;
  var token = req.body.token;

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
     console.log('Deleting object');
     return s3.deleteObject({
         Bucket: bucket,
         Key: key
     }).promise();
 }
