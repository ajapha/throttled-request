"use strict";

let redisClient;

const redisConfig = config => {
    if (!config) config = {};
    return require('promise-redis')().createClient({
        port: config.port,
        host: config.host,
        auth_pass: config.password,
        db: config.db
    });
};

module.exports = config => {
    return redisClient || redisConfig(config);
};