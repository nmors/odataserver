// main.js
//------------------------------
//
// 2014-12-06, Jonas Colmsjö
//
//------------------------------
//
// Top file in the hierarchy. The architedture looks like this:
//
//      +-------------+
//      | odataserver |
//      +------+------+
//             |
//     +-------+----+
//     |            |
//     |     +--------------+
//     |     | bucketserver |
//     |     +------+-------+
//     |            |
//     | +----------+
//     | |          |
//  +--+-+--+  +---------+
//  | mysql |  | leveldb |
//  +-------+  +---------+
//
//
// Using Google JavaScript Style Guide:
// http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
//
//------------------------------
//
// Install with: `npm install`
// Run with: `npm start`


var http = require("http");
var url = require('url');
var test = require('tape');

var CONFIG = require('./config.js');
var odata = require('./odataserver.js');
var h = require('./helpers.js');

var log = new h.log0(CONFIG.mainLoggerOptions);

var rdbms = require(CONFIG.ODATA.RDBMS_BACKEND);
//var buckets = require(CONFIG.ODATA.BUCKET_BACKEND);

var server;



//
// Start the OData server
// ---------------------

exports.start = function() {

  // handle request with odata server
  var odataServer = new odata.ODataServer();


  // start http server
  // -----------------

  server = http.createServer(function(request, response) {

    var parsedURL = url.parse(request.url, true, false);
    var a = parsedURL.pathname.split("/");

    var str = "Processing request: " +
      JSON.stringify(request.method) + " - " +
      JSON.stringify(request.url) + " - " +
      JSON.stringify(request.headers);

    // log and fire dtrace probe
    log.log(str);
    h.fireProbe(str);

    // Parse the Uri
    var uriParser = new odata.ODataUri2Sql();
    var odataRequest = uriParser.parseUri(request.url, request.method);

    // Check the MySQL credentials have been supplied, not required when
    // creating a new account ore resetting password though
    if (odataRequest.query_type != 'create_account' &&
      odataRequest.query_type != 'reset_password' &&
      !h.checkCredentials(request, response)) {

      h.writeError(response, "Invalid credentials, user or password missing. " +
        "URL: " + request.url +
        ", headers: " + JSON.stringify(request.headers) + " TYPE:" + odataRequest.query_type);

      return;
    }

    // Only GET, POST, PUT and DELTE supported
    if (!(request.method == 'GET' ||
        request.method == 'POST' ||
        request.method == 'DELETE')) {

      h.writeError(response, request.method + ' not supported.');
    }


    // Handle the request
    odataServer.main(request, response, rdbms, odataRequest);


    // NOTE: The response object should not be closed explicitly here

  });

  server.listen(CONFIG.ODATA.PORT);

  log.log("Server is listening on port " + CONFIG.ODATA.PORT);

};


//
// Stop the OData server
// ---------------------

exports.stop = function() {
  server.close();
};
