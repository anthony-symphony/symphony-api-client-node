const https = require('https');
const Q = require('kew');
const PubSub = require('pubsub-js');
const SymConfigLoader = require('../SymConfigLoader');
const SymBotAuth = require('../SymBotAuth');
const SymMessageParser = require('../SymMessageParser');

var DatafeedClient = {};

DatafeedClient.registerBot = (token) => {
  DatafeedClient.psToken = token;
};

DatafeedClient.createDatafeed = () => {
  var defer = Q.defer();

  var options = {
      "hostname": SymConfigLoader.SymConfig.agentHost,
      "port": SymConfigLoader.SymConfig.agentPort,
      "path": "/agent/v4/datafeed/create",
      "method": "POST",
      "headers": {
          "sessionToken": SymBotAuth.sessionAuthToken,
          "keyManagerToken": SymBotAuth.kmAuthToken
        },
  };

  var req = https.request(options, function(res) {
      var str = '';
      res.on('data', function(chunk) {
          str += chunk;
      });
      res.on('end', function() {
          defer.resolve(JSON.parse(str));
      });
  });
  req.on('error', function (e) {
    console.log('error', e);
  });

  req.end();

  return defer.promise;
}

DatafeedClient.getEventsFromDatafeed = (datafeedId) => {
  var defer = Q.defer();

  var options = {
      "hostname": SymConfigLoader.SymConfig.agentHost,
      "port": SymConfigLoader.SymConfig.agentPort,
      "path": "/agent/v4/datafeed/" + datafeedId + "/read",
      "method": "GET",
      "headers": {
          "sessionToken": SymBotAuth.sessionAuthToken,
          "keyManagerToken": SymBotAuth.kmAuthToken
        },
  };

  var req = https.request(options, function(res) {
      var str = '';
      res.on('data', function(chunk) {
          str += chunk;
      });
      res.on('end', function() {
          if (res.statusCode == 200) {
            PubSub.publish( "MESSAGE_RECEIVED", SymMessageParser.parse(str) );
            defer.resolve( {"status": "success"} );
          } else if (res.statusCode == 204) {
            defer.resolve( {"status": "timeout"} );
          } else {
            defer.reject( {"status": "error"} );
          }
      });
  });
  req.on('error', function (e) {
    defer.reject( {"status": "error"} );
  });

  req.end();

  return defer.promise;
}

module.exports = DatafeedClient;