// Similar in structure to Rack's Mongrel handler.
// All generic Java servlet code should go in here.
// Specific server code should go in separate handlers (i.e. jetty.js, etc)

var delegator = require("./worker-delegator"),
    HashP = require("hashp").HashP,
    IO = require("io").IO;

var Servlet = exports.Servlet = function(app) {
    this.app = app;
}

Servlet.prototype.process = function(request, response) {
    Servlet.process(this.app, request, response);
}
var getContinuation = org.mortbay.util.ajax.ContinuationSupport.getContinuation;
Servlet.process = function(request, response) {
	var continuation = getContinuation(request, null);
	if(continuation.isResumed()){
		print("continuation is resumed, finishing");
		return;
	}
	    var env = {headers:{}};

	    // copy HTTP headers over, converting where appropriate
	    for (var e = request.getHeaderNames(); e.hasMoreElements();)
	    {
		var name = String(e.nextElement()),
		    value = String(request.getHeader(name)), // FIXME: only gets the first of multiple
		    key = name.toLowerCase();


		env.headers[key] = value;
	    }

	    env.scriptName         = String(request.getServletPath() || "");
	    env.pathInfo            = String(request.getPathInfo() || "");

	    env.method       = String(request.getMethod() || "");
	    env.serverName          = String(request.getServerName() || "");
	    env.serverPort          = String(request.getServerPort() || "");
	    env.queryString         = String(request.getQueryString() || "");
	    env.httpVersion         = String(request.getProtocol() || "");

	    env.remoteHost          = String(request.getRemoteHost() || "");
	    env.body           = new IO(request.getInputStream(), null),
	    env.jsgi = {
		"version": [0,2],
		"errors":  system.stderr,
		"multithread": false,
		"multiprocess": true,
		"run_once": false,
		"url_scheme": request.isSecure() ? "https" : "http"};

	    env["x-sendfile"] = "yes";
		print("call app");
	    // call the app
	env._jettyContinuation = continuation;
	if(!delegator.enqueue(env, response)){
		response.setStatus(503);
		var stream = response.setOutputStream();
		stream.close();
		return;
	}
	continuation.suspend(request.getSession().getMaxInactiveInterval() * 500);
};
exports.run = function(options){
	delegator.createQueue(options);
	// can't use this thread, it must return
	(new java.lang.Thread(function(){
		delegator.createWorkers("servlet-worker", options);
	})).start();
}

