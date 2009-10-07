// Similar in structure to Rack's Mongrel handler.
// All generic Java servlet code should go in here.
// Specific server code should go in separate handlers (i.e. jetty.js, etc)

var IO = require("io").IO,
    file = require("file"),
    jackup = require("jackup"),
    when = require("promise").when,
    HashP = require("hashp").HashP;

var Servlet = exports.Servlet = function(app) {
    this.app = app;
}
onstart = function(options){
	try{
		jackup.start(options);
	}
	catch(e){
		print("Jack application failed to start for worker: " + String((e.rhinoException && e.rhinoException.printStackTrace()) || (e.name + ": " + e.message)));
	}
};
exports.run = function(app, options) {
	onrequest = function(env, response) {
	    var res = app(env);
		print("called app");
	    var finished;
	    var output, responseStarted = false;
	    // use the promise manager to determine when the app is done
	    // in a normal sync request, it will just execute the fulfill
	    // immediately
	    when(res, function(res){
		print("success;");
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
			env._jettyContinuation.resume();
			print("should be closed now");
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
			res.headers[key].split("\n").forEach(function(value) {
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
		if(!finished && typeof org.mortbay.util.ajax.ContinuationSupport.getContinuation == "function"){
			org.mortbay.util.ajax.ContinuationSupport.getContinuation(request, null).suspend(request.getSession().getMaxInactiveInterval() * 500);
		}
	}
	};
};