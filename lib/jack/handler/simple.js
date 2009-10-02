// handler for Simple (http://simpleweb.sourceforge.net/) based on the servlet handler

var Worker = require("worker").__WorkerWithArgs__,
    HTTP_STATUS_CODES = require("../utils").HTTP_STATUS_CODES;

exports.run = function(app, options) {
    var options = options || {};
    
    // need to use JavaAdapter form when using module scoping for some reason
    var handler = new Packages.org.simpleframework.http.core.ContainerServer(new JavaAdapter(Packages.org.simpleframework.http.core.Container, {
        handle : function(request, response) {
            try {
                process(request, response);
            } catch (e) {
                print("ERROR: " + e + " ["+e.message+"]");
                if (e.rhinoException)
                    e.rhinoException.printStackTrace();
                else if(e.javaException)
                    e.javaException.printStackTrace();
                throw e;
            }
        }
    }), 1); // specify that only only thread will be used since the 
    // request handing is only delegating the requests onto a queue for distribution to workers
    
    // different version
    var port = options["port"] || 8080,
        address = options["host"] ? new Packages.java.net.InetSocketAddress(options["host"], port) : new Packages.java.net.InetSocketAddress(port),
        connection;
        
    if (typeof Packages.org.simpleframework.transport.connect.SocketConnection === "function")
        connection = new Packages.org.simpleframework.transport.connect.SocketConnection(handler);
    else if (typeof Packages.org.simpleframework.http.connect.SocketConnection === "function")
        connection = new Packages.org.simpleframework.http.connect.SocketConnection(handler);
    else
        throw new Error("Simple SocketConnection not found, missing .jar?");
    
    print("Jack is starting up using Simple on port " + port);
    
    connection.connect(address);

	var workerPoolSize = 2;
	var requestQueueCapacity = 20;

	// create all are workers for servicing requests
	var workers = [];
	for(var i = 0; i < workerPoolSize; i++){
		workers[i] = new Worker("jack/handler/simple-worker", require("system").originalArgs.concat("-s","simple-worker"));
		workers[i].onidle = function(){
		print("onidle");}; // make sure the event is being triggered
	};
	// our request queue for delegating requests to workers
	var requestQueue = new java.util.concurrent.LinkedBlockingQueue(requestQueueCapacity);

	var process = function(request, response) {
		// the actual simpleframework request handler, just puts them in the queue
		if(!requestQueue.offer([request, response])){
			response.setCode(503);
			response.setText("Service Unavailable");
			var stream = response.setOutputStream();
			stream.close();
		}
	};

	// our event queue
	var eventQueue = require("event-queue");

	requestProcess:
	while(true){
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
			eventQueue.nextEvent();		
		}
	}

}

