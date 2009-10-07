// handler for Simple (http://simpleweb.sourceforge.net/) based on the servlet handler

var Worker = require("worker").Worker,
    HTTP_STATUS_CODES = require("../utils").HTTP_STATUS_CODES;
var requestQueue;
exports.enqueue = function(request, response){
	// just puts them in the queue
	return requestQueue.offer([request, response]);

}

exports.createQueue = function(options){
	var workerPoolSize = options.workerPoolSize || 2;
	var requestQueueCapacity = options.requestQueueCapacity || 20;
	// our request queue for delegating requests to workers
	requestQueue = new java.util.concurrent.LinkedBlockingQueue(requestQueueCapacity);
};
exports.createWorkers = function(workerModule, options) {
	var workerPoolSize = options.workerPoolSize || 2;
	options.server = workerModule;
	// create all are workers for servicing requests
	var workers = [];
	var workerThread = new java.lang.Thread(function(){
		for(var i = 0; i < workerPoolSize; i++){
			workers[i] = new Worker("jack/handler/" + workerModule);
			workers[i].__enqueue__("onstart", [options]);
		}
	});
	workerThread.start();


	// our event queue
	var eventQueue = require("event-queue");

	requestProcess:
	while(true){
		print("waiting for next request");
		var requestResponse = requestQueue.take(); // get the next request
		while(true){
			for(var i = 0; i < workerPoolSize; i++){
				var worker = workers[i];
				if(worker && worker.isIdle()){
					worker.__enqueue__("onrequest", requestResponse);
					print("enqueued" + i);
					continue requestProcess;
				}
			}
			// no available workers, block for events (only waiting for onidle events)
			print("waiting for next onidle");
			eventQueue.nextEvent();
		}
	}

}

