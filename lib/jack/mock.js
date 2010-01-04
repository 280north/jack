var URI = require("uri").URI,
    ByteString = require("binary").ByteString,
    ByteIO = require("io").ByteIO;

var Lint = require("jack/lint").Lint;

/**
 * MockRequest helps testing your Jack application without actually using HTTP.
 *
 * After performing a request on a URL with get/post/put/delete, it returns a 
 * MockResponse with useful helper methods for effective testing.
 */
var MockRequest = exports.MockRequest = function(app) {
    if(!(this instanceof MockRequest))
        return new MockRequest(app);

    this.app = app;
}

MockRequest.prototype.GET = function(uri, opts) {
    return this.request("GET", uri, opts);
}

MockRequest.prototype.POST = function(uri, opts) {
    return this.request("POST", uri, opts);
}

MockRequest.prototype.PUT = function(uri, opts) {
    return this.request("PUT", uri, opts);
}

MockRequest.prototype.DELETE = function(uri, opts) {
    return this.request("DELETE", uri, opts);
}

MockRequest.prototype.request = function(method, uri, opts) {
    opts = opts || {};

    var request = MockRequest.requestFor(method, uri, opts),
        app = this.app;
    
    if (opts.lint)
        app = Lint(app)
    
    return new MockResponse(app(request), request.jsgi.errors);
}
    
MockRequest.requestFor = function(method, uri, opts) {
    opts = opts || {};
    
    var uri = new URI(uri);

    // DEFAULT_ENV
    var request = {
        jsgi: {
        	version: [0,3],
        	input: opts["jsgi.input"] || new ByteIO(new ByteString()),
        	errors: opts["jsgi.errors"] || "",
        	multithread: false,
        	multiprocess: true,
        	runOnce: false
    	},
    	headers: {}
    };

    request.method   = method || "GET";
    request["HTTP_HOST"]        = uri.host || "example.org";
    request["SERVER_NAME"]      = uri.host || "example.org";
    request["SERVER_PORT"]      = (uri.port || 80).toString(10);
    request.queryString     = uri.query || "";
    request.pathInfo        = uri.path || "/";
    request["jsgi.url_scheme"]  = uri.scheme || "http";

    request["SCRIPT_NAME"]      = opts["SCRIPT_NAME"] || "";

    request.headers["content-length"]   = request.jsgi.input.length.toString(10);

    // FIXME: JS can only have String keys unlike Ruby, so we're dumping all opts into the request here.
    for (var i in opts)
        request[i] = opts[i];

    // FIXME:
    //if (typeof request["jsgi.input"] == "string")
    //   request["jsgi.input"] = StringIO(request["jsgi.input"])

    return request;
}

/**
 * MockResponse provides useful helpers for testing your apps. Usually, you 
 * don't create the MockResponse on your own, but use MockRequest.
 */
var MockResponse = exports.MockResponse = function(response, errors) {
	if(this === global){
		throw new Error("MockResponse must be instantiated");
	}
    if(!(this instanceof MockResponse))
        return new MockResponse(response, errors);
    
    this.status = response.status;
    this.headers = response.headers;
 
    var body = "";
    response.body.forEach(function(chunk) {
        body += chunk.toByteString().decodeToString();
    });
    this.body = body;
    
    this.errors = errors || "";
};

MockResponse.prototype.match = function(regex) {
    return this.body.match(new RegExp(regex));    
};

