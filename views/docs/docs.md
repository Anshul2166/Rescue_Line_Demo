![alt text](/assets/logo/rescueline-grey.png "RescueLine")

# Account
##  
### Create

This endpoint creates an account, and is used to sign up users.

```
POST /api/account/create
```

**Params**

| Param | Type | Note |
|-------|------|-------------|
|name | String | Required. User's name |
|username | String | Required. User name used to log in. |
|password | String | Required. |
|type | String | Required. Account type. Can be "responder", "coordinator", "citizen", or "hospital"|
|code | String | Optional. Will be required if account type is not citizen. NOTE: use code "TEST" for debugging purposes |

**Successful Response**
```
{
  status : "success",
  data : {
      token: "{token}"
    }
}
```

### Check-Name

Before signing up, we need to check if a username is already taken.

```
GET /api/account/check-name/:name
```

**Example (JS)**
```javascript
$.get("./api/account/check-name/"+ userName)
    .done(function(response) {
      if (response.status == "success") {
        if (response.data.exists === false)
          alert("Sorry, "+ userName + " is already taken");
      } else {
        alert(response.error.message);
      }
    });
```

**Successful Response**
```
{
  status : "success",
  data : {
      is_available : {bool true/false}
    }
}
```

### Login

This endpoint is used to login, and if successful, returns an access token that can be used to make requests. All access tokens expire after a week.

```
POST /api/account/login
```
**Params**

```
{
  username : "{username}",
  password : "{password}",
}
```

**Successful Response**
```
{
  status : "success",
  data : {
      token: "{token}",
      type: "{account-type}"
    }
}
```

### Logout

I am using JSON Web Tokens for authentication. They are stateless, so they don't have anything to do with the database or server. They expire on their own. So, you don't have to make an API call to log out a user, just delete the token wherever you have it stored client side and refresh your state.

### Recover

Send an email to this endpoint to trigger a reset password flow. An e-mail will be sent to user with a link where they can reset password.

```
POST /api/account/recover
```
**Params**

```
{
  email : "{email}"
}
```

**Successful Response**
```
{
  status : "success",
  data : {}
}
```

### Reset
Will be handled in browser. After a user fills out their email for 'Recover', an e-mail will be sent to the user. They will click the link, and reset their password in the browser.


# Profile
##  
### Profile (GET)

```
GET /api/profile/:token
```

This endpoint is used to get a user's profile. :token is replaced by the users current access token

**Successful Response**
```
{
  status : "{success-or-error}",
  data : {
      "profile_pic" : "{pic-url}",
      "username" : "{username}",
      "name" : "{name}",
      "email" : "{email}",
      "phone" : "{phone-number}",
      "blood_type" : "{blood-type}",
      "contact" : "{emergency-contact}",
      "blood_type" : "{blood-type}"
    }
}
```

Not all fields in data will be returned every time, because not everyone would have filled out every field.

### Profile (POST)

```
POST /api/profile
```

POST to this endpoint to update user info. Not all Params are required in "profile", you can send just the values that need to be updated. The backend will merge with the current user profile and only update what needs to be updated. **Note** that profile pics are updated separately.

**Params**

```
{
  "profile" : {
    "username" : "{username}",
    "name" : "{name}",
    "email" : "{email}",
    "phone" : "{phone-number}",
    "blood_type" : "{blood-type}",
    "contact" : "{emergency-contact}",
    "blood_type" : "{blood-type}"
  },
  token : {access-token}
}
```

**Successful Response**
```
{
  status : "{success-or-error}",
  data : {
    "_id" : "{new-doc-id}", //not important
    "_rev" : "{new-rev-id}" //not important
  }
}
```

### Image


```
POST /api/profile/image
```

POST a **multipart form** to this endpoint to update user profile pic. The field name for the image actually is 'image' and the 'token' should also be a part of the same form body.

**Params**

```
{
  image : {image},
  token : {access-token}
}
```

**Successful Response**
```
{
  status : "{success-or-error}",
  data : {
    "profile_pic" : "{new-pic-url}",
    "_id" : {new-doc-id} //not important
    "_rev" : "{new-rev-id}" //not important
  }
}
```

You will get back 'profile_pic' in the data which is the new url for the picture.


### Location


```
POST /api/profile/location
```

Update a user's last known location. This is used so that people nearby can find the user to chat, and it is sometimes used by the chatbot

**Params**

```
{
  location : {LatLng},
  token : {access-token}
}
```
See [LatLng](#data-types--latlng)

**Successful Response**
```
{
  status : "success",
  data : {
    "ok" : true,
    "id" : {new-doc-id}, //not important
    "rev" : "{new-rev-id}" //not important
  }
}
```

#CHAT
##  
###Send


```
POST /api/chat/send
```

Sends a chat to the specified user. If the user is connected to the websocket on the other end, it will automatically be transmitted to the socket.

**Params**

```
{
  message : {
      receiver : {username}, //who you want to receive chat
      msg : {message}
  },
  token : {access-token}
}
```

**Successful Response**
```
{
  status : "success",
  data : {
    "ok" : true,
    "id" : {new-doc-id}, //not important
    "rev" : "{new-rev-id}" //not important
  }
}
```

###Logs

```
GET /api/chat/logs?username={username}&token={token}
```

Get all logs for a specific chat session with someone.

**Params**

| Param | Type | Note |
|-------|------|-------------|
| username | String | Required. Username of person whose chat logs we will get. |
| token | String | Required. Your token. |

**Successful Response**
```
{
  status : "success",
  data : [
    {
      msg : {message},
      receiver : {receiver-username},
      sender : {sender-username},
      timestamp : {processed-timestamp} //example: 4 minutes ago
    },
    {
      msg : {message},
      receiver : {receiver-username},
      sender : {sender-username},
      timestamp : {processed-timestamp} //example: 40 seconds ago
    },
    // ... and so on
  ]
}
```

###History

```
GET /api/chat/history/:token
```

Get the history of people the user has chat to before. This returns the latest chat message sent by either the user, or the other chat participant. Replace :token in above URL with user token.

**Successful Response**
```
{
  status : "success",
  data : [
    {
      _id: {doc-id} //save this, it will be needed to mark chat as read
      chat_id : {chat-id},
      msg : {message},
      name : {person-name}, //other_user name
      receiver : {receiver-username}, //who msg was sent to
      sender : {sender-username}, //who sent msg
      other_user : {sender-username}, //username you are NOT. So, the other user. Can be useful to know.
      profile_pic: {pic-url} //profile picture of other_user
      read: {Bool, true/false} //if chat is read
    },
    {
      _id: {doc-id} //save this, it will be needed to mark chat as read on click
      chat_id : {chat-id},
      msg : {message},
      name : {person-name}, //other user's name
      receiver : {receiver-username}, //who msg was sent to
      sender : {sender-username}, //who sent msg
      read: {Bool, true/false} //if chat is read
    },
    // ... and so on
  ]
}
```

###Nearby

```
GET /api/chat/nearby?location={LatLng}&token={token}
```

Get a list of nearby users you can chat to (5 mile radius). Coordinators are not retrieved in this list.

**Params**

| Param | Type | Note |
|-------|------|-------------|
| location | [LatLng](#data-types--latlng) | Required. Current location of user. |
| token | String | Required. Your token. |


**Successful Response**
```
{
  status : "success",
  data : [
    {
      username : {username},
      name : {person-name},
      profile_pic : {pic-url}, //
      type : {account-type} //example: responder
    },
    {
      username : {username},
      name : {person-name},
      profile_pic : {pic-url}, //
      type : {account-type} //example: responder
    },
    // ... and so on
  ]
}
```

###Read

```
GET /api/chat/read/:id
```

Mark a chat thread as 'read'.

**Params**

| Param | Type | Note |
|-------|------|-------------|
| id | DocId | Required. In [History](#chat--history), you will receive a chat doc _id in the response. This is what you need to send. |


**Successful Response**
```
{
  status : "success",
  data : {
    "ok" : true,
    "id" : {new-doc-id}, //not important
    "rev" : "{new-rev-id}" //not important
  }
}
```

#AI
##  
###Chat


```
POST /api/ai/chat
```

Sends a chat to our chatbot, waits for it to respond, then sends back the response.

**Params**

```
{
  input : {message}, //message being sent to chatbot
  token : {access-token},
  location : {LatLng} //optional but highly recommended, read below
}
```

**Note:** 'location' is optional as SMS users won't be able to send this as a parameter, and sometimes our app users might deny location permissions so you won't be able to send it either. However, it is HIGHLY RECOMMENDED that this is sent when possible. With a precise location, we don't have to rely on address geocoding which has a much higher chance of being inaccurate.

**Successful Response**
```
{
  status : "success",
  data : {
    "msg" : {response-from-chatbot},
    "codes" : [{image-request}] //experimental, so not really important for now
  }
}
```
'codes' will be a way the backend asks for a 'rich response' from the client side. So for example, if the intent of our chatbot was "missingperson" and we know that the chatbot will ask for an image from the client, I would send the code "{image-request}" so that the front end knows to ask the person for an image. Then NodeJS would also be expecting an image in the next chat.

###Speech

This endpoint will take in a recorded file and call Watson speech to text API, and then return the text.

```
POST /api/ai/speech
```

**Speech to text capabilities coming soon**

#WEBSOCKET
##  
###Connection

Preferably use socketIO client. Connect to "https://rl-node-shy-okapi.mybluemix.net/" . Note that the user's access token must be included as a query parameter. Below is the basics of my implementation in javascript. It should look pretty similar in whatever language you are using if you use the socketIO client.

```javascript
function SocketHandler(){

  var socket = null;

  //connects to the socket
  this.connect = function(){

    //makes connection request, note token is in query
    socket = io("https://rl-node-shy-okapi.mybluemix.net/",{ query: "token="+ token });

    //set events below. These are the basic events needed for a citizen. More events will be added for responder soon
    socket.on('chat',function(msg){
      //received a chat, do something with it
    });

    socket.on('invalid_token',function(msg){
      //if you send an invalid access token, you will receive this event. Handle it here
    });

  };

  //initialize own self
  this.connect();

}
```


#DATA TYPES
##  
###LatLng

Simple LatLng object.

```
  { lat: 34.121201, lng: -94.123141 }
```

###Success Payload

Success payloads are structured as such:

```
{
  status : "success",
  data :  {
    key : {value},
    key : {value}
  }
}
```

###Error Payload

Error payloads are structured as such:

```
{
  status : "error",
  error :  {
    code : {error-code},
    message : "{explanation}"
  }
}
```

Error Codes

| Code | Description |
|-------|------|
| 400 | General failure. Could be anything from DB error, badly structured JSON, missing params, and so on. In this case, refer to "message" for more information. |
| 403 | Forbidden. Very likely that it is an issue with access token. |
| 404 | Something is terribly broken / missing |

Note that the message in the error payload is user friendly, so you don't really have to check error codes. Just alert(response.error.message) to the user.
