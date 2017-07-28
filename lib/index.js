/*
ThrottledRequest module.

Usage
====================================
var request = require("request"); //https://github.com/request/request
request.defaults(options);

//Instantiate a new `throttledRequest`.
//Pass along a `request` instance to be used
var throttledRequest = require("./throttled-request")(request);

//Configure 10 requests per second
throttledRequest.configure({
  requests: 10,
  milliseconds: 1000
});

//Now you can use `throttledRequest` just as you use https://github.com/request/request
//Using callback
throttledRequest(options, function (error, response, body) {
  //...
});
//Or as a stream
someReadStream.pipe(throttledRequest(options)).pipe(someWriteStream);
*/
'use strict';

var ThrottledRequest = require("./throttled-request");

module.exports = function (request, redisConfig, redisKey) {
  let redisClient,
      key;
  if (redisConfig) {
    redisClient = require("./getRedisClient")(redisConfig);
    //use the provided key or if not provided generate a random 8 character string
    key = redisKey || Math.round(Math.pow(36, 8 + 1) - Math.random() * Math.pow(36, 8)).toString(36).slice(1);
  }
  
  if (!request) throw new Error("A request (https://github.com/request/request) instance must be provided");
  return new ThrottledRequest(request, redisClient, key);
};