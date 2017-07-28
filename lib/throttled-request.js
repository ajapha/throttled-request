/*
ThrottledRequest class
*/
'use strict';

var RequestMiddleware = require("./request-middleware")
,   EventEmitter = require("events").EventEmitter
,   util = require("util");

util.inherits(ThrottledRequest, EventEmitter);

function ThrottledRequest (request, redisClient, redisKey) {
  EventEmitter.call(this);

  var self = this;

  this.startTime;
  this.reqNumber = 0;

  this.redis = redisClient;
  this.redisKey = redisKey;

  this.request = request;

  this.config = {
    requests: Infinity,
    milliseconds: Infinity
  };

  this.sentRequests = 0;
  this.startedAt = null;

  function _request () {
    return self.throttleRequest.apply(self, arguments);
  }

  _request.configure = function (config) {
    self.configure(config);
  }

  _request.set = function (key, value) {
    self[key] = value;
  }

  _request.get = function (key) {
    return self[key];
  }

  _request.on = function (event, handler) {
    self.on(event, function () {
      handler.apply(_request, arguments);
    });
  }

  return _request;
};

ThrottledRequest.prototype.configure = function (config) {
  if (!config) throw new Error("A config object must be provided");

  config.requests ? this.config.requests = config.requests : void 0;
  config.milliseconds ? this.config.milliseconds = config.milliseconds : void 0;
};

ThrottledRequest.prototype.throttleDelay = function() {
  if (isFunction(this.config.milliseconds)) {
    return this.config.milliseconds();
  }

  return this.config.milliseconds;
};

ThrottledRequest.prototype.throttleRequest = function () {
  var self = this
  ,   args = arguments
  ,   requestMiddleware
  ,   request;

  if (!this.milliseconds) this.milliseconds = this.throttleDelay();
  if (!this.redis) {
    //Start counting time if hasn't started already
    if (!this.startedAt) this.startedAt = Date.now();
    
    if (Date.now() - this.startedAt >= this.milliseconds) {
      this.sentRequests = 0;
      this.startedAt = Date.now();
      this.milliseconds = this.throttleDelay();
    };

    if (this.sentRequests < this.config.requests) {
      this.sentRequests++;

      if (args[args.length - 1] instanceof RequestMiddleware) {
        requestMiddleware = args[args.length - 1];
        args[--args.length] = undefined;

        request = this.request.apply(null, args);
        requestMiddleware.use(request);
      } else {
        request = this.request.apply(null, args);
      };

      this.emit("request", args[0]);
      return request;
    };

    if (!(args[args.length - 1] instanceof RequestMiddleware)) {
      requestMiddleware = new RequestMiddleware();
      args[args.length++] = requestMiddleware;
    }

    setTimeout(function () {
      self.throttleRequest.apply(self, args);
    }, this.milliseconds - (Date.now() - this.startedAt));

    return requestMiddleware;
  }
      this.startTime = this.startTime || Date.now();
      const luaScript = `local cnt = redis.call('INCR', ARGV[1])
          if cnt == 1 then 
            redis.call('EXPIRE', ARGV[1], ARGV[3]) 
          end   
          if cnt > tonumber(ARGV[2]) then 
            local wait = redis.call('TTL', ARGV[1])      
            return '{\"limited\": true, \"wait\":' .. wait .. '}' 
          else
              return '{\"limited\": false}' 
          end`;
      return this.redis.eval([luaScript, 0, this.redisKey, this.config.requests, this.milliseconds / 1000])
      .then(resp => {
          const respObj = JSON.parse(resp);
          if (!respObj.limited) {
            if (args[args.length - 1] instanceof RequestMiddleware) {
              requestMiddleware = args[args.length - 1];
              args[--args.length] = undefined;

              request = this.request.apply(null, args);
              requestMiddleware.use(request);
            } else {
              request = this.request.apply(null, args);
            };
            this.emit("request", args[0]);
            return request;
          } else {
            if (!(args[args.length - 1] instanceof RequestMiddleware)) {
              requestMiddleware = new RequestMiddleware();
              args[args.length++] = requestMiddleware;
            }
            setTimeout(function () {
                self.throttleRequest.apply(self, args);
            }, respObj.wait * 1000);
          }
      });


};


function isFunction(value) {
  return typeof value == 'function';
}

module.exports = ThrottledRequest;