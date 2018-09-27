const express = require("express");
const app = (module.exports = express());
const jwt = require("jsonwebtoken");
const dbh = require("../../server.js").dbh; //import db instance from server.js
const parser = require("../../server.js").parser(); //import parser instance from server.js
const axios = require("axios");
var FormData = require('form-data');

app.post("/api/missing/add_profile", async (req, res) => {
	console.log("Inside add_profile");
	console.log(req.body);
	let formdata=new FormData();
	// formdata.append("image",r)
	formdata.append("first_name", "Sample");
	formdata.append("last_name", "Demo");
	jwt.verify(
		token,
		"MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==",
		function(err, decoded) {
			if (!err) {
				//token is valid
				tokenInfo = decoded;
			} else {
				//token isn't valid
				if (err.name == "TokenExpiredError") {
					res.json(buildError(403, "Token expired"));
				} else {
					res.json(buildError(403, "Could not verify token"));
				}
				return false;
			}
		}
	);

	if (tokenInfo == null) return false;

	if (tokenInfo.type == "citizen") {
		res.json(
			buildError(
				403,
				"You cannot access this function with a Citizen account"
			)
		);
		return false;
	}
	console.log("Reached the end");
	var feed = await send_user_api(formData);
	return res.json(feed);
});

const send_user_api = async formData => {
	// Performing a POST request
	axios
		.post("http://investorrank.in/api/user_profile/", formData)
		.then(function(response) {
			console.log("saved successfully");
			console.log(response);
		});
};
