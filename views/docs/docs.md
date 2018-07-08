# Account

### Create

This endpoint creates an account, and is used to sign up users.

```
POST /api/account/create/
```

**Params**

| Param | Type | Note |
|-------|------|-------------|
|name | String | Required. User's name |
|username | String | Required. User name used to log in. |
|password | String | Required. |
|type | String | Required. Account type. Can be "responder", "coordinator", "citizen", or "hospital"|
|code | String | Optional. Will be required if account type is not citizen. An org will be assigned a code to share with their staff.|

**Response**
```
{
  status : "{success-or-error}",
  data : {
      token: "{token}"
    },
  error :  {
    code : {error-code}, //always int
    message : "{explanation}"
  }
}
```

### Check-Name

Before signing up, we need to check if a username is already taken.

```
GET /api/account/check-name/:name
```

**Example (JS)**
```
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
**Response**
```
{
  status : "{success-or-error}",
  data : {
      is_available : {bool true/false}
    },
  error :  {
    code : {error-code},
    message : "{explanation}"
  }
}
```

### Login

This endpoint is used to login, and if successful, returns an access token that can be used to make requests. All access tokens expire after a week.

```
POST /api/account/login/
```
**Params**

```
{
  username : "{username}",
  password : "{password}",
}
```

**Response**
```
{
  status : "{success-or-error}",
  data : {
      token: "{token}",
      type: "{account-type}"
    },
  error :  {
    code : {error-code},
    message : "{explanation}"
  }
}
```

### Logout

I am using JSON Web Tokens for authentication. They are stateless, so they don't have anything to do with the database or server. They expire on their own. So, you don't have to make an API call to log out a user, just delete the token wherever you have it stored client side and refresh your state.

### Recover

### Reset
Will be handled in browser. After a user fills out their email for 'Recover', an e-mail will be sent to the user. They will click the link, and reset their password in the browser.
