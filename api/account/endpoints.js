const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mailer = require('../../util/mailer.js');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js
const profileManager = require('../../util/profile_manager.js');

/*************************************
 * ENDPOINT /create
 * Create an account (sign up)
 *************************************
 */
app.post('/api/account/create', async (req, res) => {
  console.log(req.body);
  var userData = req.body;
  var codeInfo = null;

  //makes sure there is a code for user types that aren't citizens
  if (userData.type != 'citizen' && userData.code == "none" ){
    res.json(buildError(400,"Organizational code is required for account type"));
    return false;
  }

  //makes sure password length is fine
  if (userData.password.length < 6){
    res.json(buildError(400,"Password is too short"));
    return false;
  }

  //make sure username is actually not taken
  const nameData = await checkName(userData.username);
  if (nameData.status == "success"){
    if (nameData.data.is_available == false){
      res.json(buildError(400,"Sorry, that username is taken."));
      return false;
    }
  } else {
    res.json(buildError(400,"Error verifying that username."));
  }

  if (userData.code != "TEST"){
  if (userData.type == "coordinator" || userData.type == "responder"){
    //check that organizational code is a valid code
    const codeDoc = await getCode(userData.code);
    if (codeDoc.status == "success"){
      //check if code exists
      console.log("Loggin codeDoc");
      console.log(codeDoc);
      if (codeDoc.data.length == 0){
        res.json(buildError(403,"Invalid organizational code. Please recheck code, or contact your organization admin for a new code."));
        return false;
      }

      codeInfo = codeDoc.data[0];
      var codeExpiry = codeInfo.timestamp + codeInfo.lifetime;
      //check if code has expired
      if ( codeExpiry < Date.now() ){
        res.json(buildError(403,"Code has expired. Please contact your organization admin for a new code."));
        return false;
      }
    } else {
      res.json(buildError(400,"Database error. Please try again in a while and contact support if the problem persists."));
    }

    //make sure type provided by user matches with type in code
    if (userData.type != codeInfo.type){
      res.json(buildError(403,"This code does not authorize you to make this type of account."));
      return false;
    }
  }
  }

  //hash password and insert into DB
  bcrypt.hash(userData.password, 10, function(err, hash) {
    var userDoc = {
      "name" : userData.name,
      "username" : userData.username,
      "password" : hash,
      "type" : userData.type
    };

    if (typeof userData.code != "undefined" && userData.code !== "none")
      userDoc.code = userData.code;

    if (codeInfo !== null){
      userDoc.country = codeInfo.country;
      userDoc.privilege = codeInfo.privilege;
    }

    dbh.db.insert(userDoc).then(function(body){
      console.log(body);
    }).catch(function(err){
      console.log(err);
    });
  });

  var tokenOptions = {
    user: userData.username,
    type: userData.type
  };

  if (codeInfo != null)
    tokenOptions.country = codeInfo.country;

  //create JWT using username, account type, expiresIn
  jwt.sign(tokenOptions,"MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", { expiresIn : '7d' }, (err,token) => {
    res.json({
      status : "success",
      data : {
        "token" : token
      }
    });
  });

});

/*************************************
 * ENDPOINT /login
 * Checks is username and password match, then create an access token for user valid for 1 week
 *************************************
 */
app.post('/api/account/login', async (req, res) => {
  var loginInfo = req.body;
  if (typeof loginInfo.username == "undefined" || typeof loginInfo.password == "undefined" ){
    res.json(buildError(400,"Invalid username or password"));
    return false;
  }
  const accountDetails = await getAccountDetails(loginInfo.username, "username");
  console.log("Here is the accountDetails");
  console.log(accountDetails);
  if (accountDetails==undefined||accountDetails.length == 0){
    res.json(buildError(400,"Invalid username or password"));
    return false;
  }
  bcrypt.compare(loginInfo.password, accountDetails[0].password, function(err, result) {
    if(result) {
      //success, so create access token

      var tokenOptions = {user: accountDetails[0].username, type: accountDetails[0].type };

      if (typeof accountDetails[0].country == "undefined")
        tokenOptions.country = accountDetails[0].country;

      jwt.sign(tokenOptions,"MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", { expiresIn : '7d' }, (err,token) => {
        res.json({
          status : "success",
          data : {
            "token" : token,
            "type" : accountDetails[0].type
          }
        });
      });
    } else {
      res.json(buildError(400,"Invalid username or password"));
      return false;
    }
  });
});

/*************************************
 * ENDPOINT /recover
 * Send an e-mail to user with information to recover account
 *************************************
 */
app.post('/api/account/recover', async (req, res) => {
  var email = req.body.email;
  console.log(req.body);
  if (typeof email == "undefined"){
    res.json(buildError(400,"Invalid email"));
    return false;
  }
  const accountDetails = await getAccountDetails(email, "email");
  console.log(accountDetails);

  if (accountDetails.length == 0){
    res.json(buildError(400,"Invalid email"));
    return false;
  }

  jwt.sign({user: accountDetails[0].username, type: accountDetails[0].type, valid_reset: true },"MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", { expiresIn : 300 }, (err,token) => {
    var email_text = "Hello "+ accountDetails[0].username +", you can reset your password at this link: https://rl-node-shy-okapi.mybluemix.net/reset/"+ token +". This link expires in 5 minutes. Thanks, RescueLine Team";
    var email_html = "Hello "+ accountDetails[0].username +",<br><br>You can reset your password <a target='_blank' href='https://rl-node-shy-okapi.mybluemix.net/reset/"+ token +"'>here</a> . This link expires in 5 minutes.<br><br>Thanks,<br><br>RescueLine Team";
    var mailStatus = mailer.sendMail(email,"Your RescueLine Account",email_text, email_html);
    console.log("Sending mail");
    console.log(mailStatus);
    if (mailStatus.status == "success"){
      console.log("Inside");
      res.json({
        status : "success",
        data : {}
      });
    } else {
      console.log("Not success");
      res.json(buildError(400,"Could not send email. That email might not be valid."));
    }
  });

});

/*************************************
 * ENDPOINT /reset
 * Will reset a password with a valid token
 *************************************
 */
app.post('/api/account/reset', async (req, res) => {
  var accountInfo = req.body;
  console.log(req.body);
  if (typeof accountInfo.token == "undefined" || typeof accountInfo.password == "undefined" ){
    res.json(buildError(400,"Invalid token or password"));
    return false;
  }
  if (accountInfo.password.length < 6 ){
    res.json(buildError(400,"Your password is too short"));
    return false;
  }
  // verify token symmetric
  jwt.verify(accountInfo.token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
    if (!err){
      console.log(decoded);
      if (decoded.valid_reset){

        //hash password and update password in DB
        bcrypt.hash(accountInfo.password, 10, async (err, hash) => {

          let db_profile = await profileManager.getProfile(decoded.user);

          db_profile = db_profile.data;

          //update db_profile with new password
          db_profile["password"] = hash;

          //save profile in DB
          const updateStatus = await profileManager.updateProfile(db_profile);

          res.json(updateStatus);
        });

      } else {
        res.json(buildError(403,"Invalid token"));
      }
    } else {
      //token isn't valid
      res.json(buildError(403,"Sorry, the token has expired. Tokens expire after 5 minutes. Please try again with a fresh token."));
    }
  });
});

/*************************************
 * ENDPOINT /check-name
 * Check if a user already exists
 *************************************
 */
app.get('/api/account/check-name/:username', async (req, res) => {
  var username = req.params.username;
  const db_response = await checkName(username);
  res.json(db_response);
});

/*###################################
 * HELPER FUNCTIONS BELOW
 ####################################
 */

//checks if username exists
const checkName = async (username) => {
  var dbName = 'users_db';

  //prepare query
  var query =   {
      "fields": [ "username" ],
      "selector": { "username": { "$eq": username } }
      // "sort": [ { "username": "asc" } ]
    };

  //make request to DB
  const db_response = dbh.cloudant.request({
    db: dbName,
    method: 'POST',
    doc: '_find',
    body: query
  }).then(function(data) {
    console.log("Here in checkName");
    console.log(data);
    return {
      "status" : "success",
      "data" : {
        "is_available" : ( data[0].docs.length == 0)
      }
    };
  }).catch(function(err) {
    console.log('something went wrong with name check', err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
}

/*
 * Get account details by username
 */
const getAccountDetails = async (toFind,getBy) => {
  var dbName = 'users_db';

  //prepare query
  var query =   {
      "fields": [ "username","password","type","country" ],
      "selector": { [getBy] : { "$eq": toFind } }
      // "sort": [ { "username": "asc" } ]
    };

  //make request to DB
  const db_response = dbh.cloudant.request({
    db: dbName,
    method: 'POST',
    doc: '_find',
    body: query
  }).then(function(data) {
    console.log(data);
    return data[0].docs;
  }).catch(function(err) {
    console.log('something went wrong in getting account details', err);
    return buildError(400,"There was a database error. Please try again in a while.");
  });

  return db_response;
}

/*
 * Get info on an organizational code
 */
const getCode = async (code) => {
  var dbName = 'codes';

  //prepare query
  var query =   {
      "selector": { "code" : { "$eq": code } }
    };

  //make request to DB
  const db_response = dbh.cloudant.request({
    db: dbName,
    method: 'POST',
    doc: '_find',
    body: query
  }).then(function(data) {
    console.log("Sending data in");
    console.log(data);
    return {
      status : "success",
      data : data[0].docs
    };
  }).catch(function(err) {
    console.log('something went wrong', err);
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
