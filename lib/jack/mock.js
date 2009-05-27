var URI = require("uri").URI,
    Hash = require("hash").Hash;

var Lint = require("jack/lint").Lint;

/**
 * MockRequest helps testing your Jack application without actually using HTTP.
 *
 * After performing a request on a URL with get/post/put/delete, it returns a 
 * MockResponse with useful helper methods for effective testing.
 */
var MockRequest = exports.MockRequest = function(app) {
    this.app = app;
}

MockRequest.prototype.GET = function(uri, opts) {
    this.request("GET", uri, opts);
}

MockRequest.prototype.POST = function(uri, opts) {
    this.request("POST", uri, opts);
}

MockRequest.prototype.PUT = function(uri, opts) {
    this.request("PUT", uri, opts);
}

MockRequest.prototype.DELETE = function(uri, opts) {
    this.request("DELETE", uri, opts);
}

MockRequest.prototype.request = function(method, uri, opts) {
    var env = MockRequest.envFor(method, uri, opts);

    if (opts.lint)
        app = new Lint(this.app);
    else
        app = this.app;

    return new MockResponse(app(env));
}
    
MockRequest.envFor = function(method, uri, opts) {
    var uri = new URI(uri);

    // DEFAULT_ENV
    var env = {
        "jack.version": [0,1],
        "jack.input": opts["jack.input"] || "",
        "jack.errors": opts["jack.errors"] || "",
        "jack.multithread": true,
        "jack.multiprocess": true,
        "jack.run_once": false
    }

    env["REQUEST_METHOD"]   = method || "GET";
    env["SERVER_NAME"]      = uri.host || "example.org";
    env["SERVER_PORT"]      = (uri.port || 80).toString(10);
    env["QUERY_STRING"]     = uri.query || "";
    env["PATH_INFO"]        = uri.path || "/";
    env["jack.url_scheme"]  = uri.scheme || "http";

    env["SCRIPT_NAME"]      = opts["SCRIPT_NAME"] || "";

    env["CONTENT_LENGTH"]   = env["jack.input"].length.toString(10);

    // FIXME: JS can only have String keys unlike Ruby, so we're dumping all opts into the env here.
    for (var i in opts)
        if (!env[i])
            env[i] = opts[i];

    // FIXME:
    //if (typeof env["jack.input"] == "string")
    //   env["jack.input"] = StringIO(env["jack.input"])

    return env;
}

/**
 * MockResponse provides useful helpers for testing your apps. Usually, you 
 * don't create the MockResponse on your own, but use MockRequest.
 */
var MockResponse = exports.MockResponse = function(response) {
    this.status = response[0];
    this.headers = response[1];
 
    this.body = "";

    for (var i in body)
        this.body = this.body + body[i];
};

MockResponse.prototype.match = function(str) {
    return this.body.match(new RegExp(str));    
}

