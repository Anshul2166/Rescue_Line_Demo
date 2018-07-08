const crypto = require('crypto');
const moment = require('moment');

//signs a url
//expiration time is in seconds
module.exports.signUrl = function(bucket,objectKey,expiration){
const accessKey = "a594301954304f71bced5d4f2e4cf96d";
const secretKey = "0663508d70d7618707b309a4110ddda9b07e0e857c668942";
const httpMethod = 'GET';
const host = 's3-api.us-geo.objectstorage.softlayer.net';
const region = '';
const endpoint = 'https://' + host;

// hashing and signing methods
function hash(key, msg) {
    var hmac = crypto.createHmac('sha256', key);
    hmac.update(msg, 'utf8');
    return hmac.digest();
}

function hmacHex(key, msg) {
    var hmac = crypto.createHmac('sha256', key);
    hmac.update(msg, 'utf8');
    return hmac.digest('hex');
}

function hashHex(msg) {
    var hash = crypto.createHash('sha256');
    hash.update(msg);
    return hash.digest('hex');
}

// region is a wildcard value that takes the place of the AWS region value
// as COS doesn't use the same conventions for regions, this parameter can accept any string
function createSignatureKey(key, datestamp, region, service) {
    keyDate = hash(('AWS4' + key), datestamp);
    keyString = hash(keyDate, region);
    keyService = hash(keyString, service);
    keySigning = hash(keyService, 'aws4_request');
    return keySigning;
}

function createHexSignatureKey(key, datestamp, region, service) {
    keyDate = hashHex(('AWS4' + key), datestamp);
    keyString = hashHex(keyDate, region);
    keyService = hashHex(keyString, service);
    keySigning = hashHex(keyService, 'aws4_request');
    return keySigning;
}

// assemble the standardized request
var time = moment().utc();
var timestamp = time.format('YYYYMMDDTHHmmss') + 'Z';
var datestamp = time.format('YYYYMMDD');

var standardizedQuerystring = 'X-Amz-Algorithm=AWS4-HMAC-SHA256' +
    '&X-Amz-Credential=' + encodeURIComponent(accessKey + '/' + datestamp + '/' + region + '/s3/aws4_request') +
    '&X-Amz-Date=' + timestamp +
    '&X-Amz-Expires=' + expiration.toString() +
    '&X-Amz-SignedHeaders=host';

var standardizedResource = '/' + bucket + '/' + objectKey;

var payloadHash = 'UNSIGNED-PAYLOAD';
var standardizedHeaders = 'host:' + host;
var signedHeaders = 'host';

var standardizedRequest = httpMethod + '\n' +
    standardizedResource + '\n' +
    standardizedQuerystring + '\n' +
    standardizedHeaders + '\n' +
    '\n' +
    signedHeaders + '\n' +
    payloadHash;

// assemble string-to-sign
var hashingAlgorithm = 'AWS4-HMAC-SHA256';
var credentialScope = datestamp + '/' + region + '/' + 's3' + '/' + 'aws4_request';
var sts = hashingAlgorithm + '\n' +
    timestamp + '\n' +
    credentialScope + '\n' +
    hashHex(standardizedRequest);

// generate the signature
signatureKey = createSignatureKey(secretKey, datestamp, region, 's3');
signature = hmacHex(signatureKey, sts);

// create and send the request
// the 'requests' package autmatically adds the required 'host' header
var requestUrl = endpoint + '/' +
    bucket + '/' +
    objectKey + '?' +
    standardizedQuerystring +
    '&X-Amz-Signature=' +
    signature;
/*
var request = https.get(requestUrl, function (response) {
    response.on('data', function (chunk) {
      //on receive chunk
    });
});

request.end();
*/
return requestUrl;
};
