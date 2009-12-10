// Similar in structure to Rack's Mongrel handler.
// All generic Java servlet code should go in here.
// Specific server code should go in separate handlers (i.e. jetty.js, etc)

// options.useEventQueueWorker set to true will start a thread for each server thread to 
// handler the event queue. This allows events to be executed at any time
// for a request thread, (while still maintaining the JS single-thread per 
// worker model)
// options.useEventQueueWorker set to false will not start threads
// and events in the queue will only be processed after request is processed.
// options.useEventQueueWorker must be false on systems like GAE
// that do not allow threads
var workerEngine = require("worker-engine"),
    worker = require("worker"),
    IO = require("io").IO,
    file = require("file"),
    when = require("promise").when,
    HashP = require("hashp").HashP;

var Servlet = exports.Servlet = function(options) {
    this.options = options;
}

Servlet.prototype.process = function(request, response) {
    Servlet.process(this.options, request, response);
}
var processors = java.lang.ThreadLocal();

Servlet.process = function(options, request, response) {
    var processor = processors.get();
    if(!processor){
        var workerGlobal = worker.createEnvironment();
        
        options.server = "servlet";
        var processor = workerGlobal.require("jackup").start(options);
        processors.set(processor);
    }
    processor(request, response);

};

var queue = require("event-queue");
// get the continuation method if available
var getContinuation = org.mortbay.util.ajax.ContinuationSupport.getContinuation;

exports.run = function(app, options){
    if(options.useEventQueueWorker){
        workerEngine.spawn(function(){
            while(true){
                var func = queue.getNextEvent();
                try{
                    sync(func)();
                }catch(e){
                    queue.defaultErrorReporter(e);
                }
            }
            
        });
    }

    return sync(function(request, response){
        if(typeof getContinuation == "function"){
            var continuation = getContinuation(request, null);
            if(continuation.isResumed()){
                return;
            }
        }

        var req = {headers:{}};

        // copy HTTP headers over, converting where appropriate
        for (var e = request.getHeaderNames(); e.hasMoreElements();)
        {
            var name = String(e.nextElement()),
                value = String(request.getHeader(name)), // FIXME: only gets the first of multiple
                key = name.toLowerCase();

            req.headers[key] = value;
        }

        req.scriptName         = String(request.getContextPath() || "");
        req.pathInfo            = request.getPathInfo();
        if(!req.pathInfo){
            // in servlet filters the pathInfo will always be null, so we have to compute it from the request URI
            var path = request.getRequestURI();
            req.pathInfo = String(path.substring(String(request.getContextPath()).length) || "");
        }
	else{
	    req.pathInfo = String(req.pathInfo);
	}
        req.method       = String(request.getMethod() || "");
        req.host          = String(request.getServerName() || "");
        req.port          = String(request.getServerPort() || "");
        req.queryString         = String(request.getQueryString() || "");
        req.version         = String(request.getProtocol() || "");
        req.scheme = request.isSecure() ? "https" : "http";
	req.env = {}; // don't know what actually goes in here

        req.remoteHost          = String(request.getRemoteHost() || "");
        req.input           = new IO(request.getInputStream(), null),
        req.jsgi = {
        "version": [0,3],
        "errors":  system.stderr,
        "async": true,
        "multithread": false,
        "multiprocess": true,
        "runOnce": false};

        req["x-sendfile"] = "yes";
        var res = app(req);
        var finished;
        var output, responseStarted = false;
        // use the promise manager to determine when the app is done
        // in a normal sync request, it will just execute the fulfill
        // immediately
        when(res, function(res){
            // success handler
            finished = true;

            try{
                handleResponse(res);
            }
            catch(e){
                print(String((e.rhinoException && e.rhinoException.printStackTrace()) || (e.name + ": " + e.message)));
                response.getOutputStream().write(e);
                response.getOutputStream().close();
            }
            // finished
            if(continuation){
                continuation.resume();
            }
         }, function(error){
            finished = true;
            // unhandled error
            handleResponse({status:500, headers:{}, body:[error.message]});
         }, 
            // progress handler
            handleResponse);

        function handleResponse(res){
        if(!responseStarted){
            responseStarted = true;
            // set the status
            response.setStatus(res.status);

            // check to see if X-Sendfile was used, remove the header
            var sendfilePath = null;
            if (HashP.includes(res.headers, "X-Sendfile")) {
            sendfilePath = HashP.unset(res.headers, "X-Sendfile");
            HashP.set(res.headers, "Content-Length", String(file.size(sendfilePath)));
            }

            // set the headers
            for (var key in res.headers) {
            ('' + res.headers[key]).split("\n").forEach(function(value) {
                response.addHeader(key, value);
            });
            }

            // determine if the response should be chunked (FIXME: need a better way?)
            var chunked = HashP.includes(res.headers, "Transfer-Encoding") && HashP.get(res.headers, "Transfer-Encoding") !== 'identity';

            output = new IO(null, response.getOutputStream());

            // X-Sendfile send
            if (sendfilePath) {
            var cIn  = new java.io.FileInputStream(sendfilePath).getChannel(),
                cOut = response.getByteChannel();

            cIn.transferTo(0, cIn.size(), cOut);

            cIn.close();
            cOut.close();
            }
        try{
            // output the body, flushing after each write if it's chunked
            res.body.forEach(function(chunk) {
                if (!sendfilePath) {
                //output.write(new java.lang.String(chunk).getBytes("US-ASCII"));
                //output.write(chunk, "US-ASCII");
                output.write(chunk);

                if (chunked)
                    output.flush();
                }
            });
        }
        catch(e){
            output.write(String((e.rhinoException && e.rhinoException.printStackTrace()) || (e.name + ": " + e.message)));
            if(chunked){
                output.flush();
            }
        }
        }
        if(finished){
            // send it off
            output.close();
        }
        // process all the events in the queue        
        if(!options.useEventQueueWorker){
            while(queue.hasPendingEvents()){
                queue.processNextEvent();
            }
        }
        if(!finished && continuation){
            continuation.suspend(request.getSession().getMaxInactiveInterval() * 500);
        }

    }
    });
}