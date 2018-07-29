const express = require('express');
const app = module.exports = express();
const jwt = require('jsonwebtoken');
const dbh = require('../../server.js').dbh; //import db instance from server.js
const parser = require('../../server.js').parser(); //import parser instance from server.js
var request = require('request');

app.get('/api/sat/', async (req, res) => {

  request.get('https://sat-api.developmentseed.org/search/stac?datetime=2018-07&collection=sentinel-2', { json:true }, function(err,response,body){
    if(response.statusCode === 200 ){
      res.json(body);
    }
  });

});
