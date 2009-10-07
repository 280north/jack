// Similar in structure to Rack's Mongrel handler.
// All generic Java servlet code should go in here.
// Specific server code should go in separate handlers (i.e. jetty.js, etc)

var delegator = require("./worker-delegator"),
    HashP = require("hashp").HashP;

var Servlet = exports.Servlet = function(app) {
    this.app = app;
}

Servlet.prototype.process = function(request, response) {
    Servlet.process(this.app, request, response);
}
Servlet.process = function(request, response) {
	if(!delegator.enqueue([request, response])){
		response.setStatus(503);
		var stream = response.setOutputStream();
		stream.close();
	}

};
exports.run = function(options){
	delegator.createQueue(options);

	// can't use this thread, it must return
	(new java.lang.Thread(function(){
		delegator.createWorkers("servlet-worker", options);
	})).start();
}

