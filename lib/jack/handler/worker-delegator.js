// handler for Simple (http://simpleweb.sourceforge.net/) based on the servlet handler

var SharedWorker = require("worker").SharedWorker,
    HTTP_STATUS_CODES = require("../utils").HTTP_STATUS_CODES,
    spawn = require("worker-engine").spawn,
    requestQueue;
exports.enqueue = function(request, response){
    // just puts them in the queue
    return requestQueue.offer([request, response]);

}

exports.createQueue = function(options){
    var workerPoolSize = options.workerPoolSize || 5;
    var requestQueueCapacity = options.requestQueueCapacity || 20;
    // our request queue for delegating requests to workers
    requestQueue = new java.util.concurrent.LinkedBlockingQueue(requestQueueCapacity);
};
exports.createWorkers = function(workerModule, options) {
    var maxWorkerPoolSize = options.maxWorkerPoolSize || 5;
    options.server = workerModule;
    // create all are workers for servicing requests
    var workers = [];
    var workerIds = [];
    var workerListeners = [];
    function addWorker(){
        var i = workers.length;
        workers[i] = null;
        var workerThread = spawn(function(){
            var worker = (new SharedWorker("jack/handler/" + workerModule, workerIds[i] = "Jack worker " + Math.random())).port;
            worker.__enqueue__("onstart", [options]);
            workers[i] = worker;
            workerListeners.forEach(function(listener){
            	listener([workerIds[i]]);
            });
        });
    }
    addWorker(); // create at least one to start with
    
    // our event queue
    var eventQueue = require("event-queue");
    
	onmessage = function(e){
		if(typeof e.data == "object"){
			if(e.data.method === "get" && e.data.pathInfo === "/workers"){
				workerListeners.push(newWorkers);
				newWorkers(workerIds);
				function newWorkers(workerIds){
					e.port.postMessage({
	            		source: "/workers",
						body:workerIds
					});
				}
			}
		}
	};
	
    requestProcess:
    while(true){
        var requestResponse = requestQueue.take(); // get the next request
        while(true){
            for(var i = 0; i < workers.length; i++){
                var worker = workers[i];
                if(worker && !worker.hasPendingEvents()){
                    worker.__enqueue__("onrequest", requestResponse);
                    continue requestProcess;
                }
            }
            // no available workers, 
            // create another worker if we are under our limit
            if(workers.length < maxWorkerPoolSize){
                addWorker();
            }
            // block for events (only waiting for onidle events)
            eventQueue.processNextEvent(true);
        }
    }

}

