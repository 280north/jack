var IO = require("io").IO,
    file = require("file"),
    when = require("promise").when,
    HTTP_STATUS_CODES = require("../utils").HTTP_STATUS_CODES,
    HashP = require("hashp").HashP,
    URI = require("uri").URI;


exports.run = function(app, options) {

	
	onrequest = function(request, response) {
	    var env = {};

	    // copy HTTP headers over, converting where appropriate
	    for (var e = request.getNames().iterator(); e.hasNext();)
	    {
		var name = String(e.next()),
		    value = String(request.getValue(name)), // FIXME: only gets the first of multiple
		    key = name.replace(/-/g, "_").toUpperCase();

		if (key != "CONTENT_LENGTH" && key != "CONTENT_TYPE")
		    key = "HTTP_" + key;

		env[key] = value;
	    }

	    var address = request.getAddress();

	    if (env["HTTP_HOST"])
	    {
		var parts = env["HTTP_HOST"].split(":");
		if (parts.length === 2)
		{
		    env["SERVER_NAME"] = parts[0];
		    env["SERVER_PORT"] = parts[1];
		}
	    }

	    var uri = URI.parse(String(request.getTarget()));

	    env["SERVER_NAME"] = env["SERVER_NAME"] || String(address.getDomain() || "");
	    env["SERVER_PORT"] = env["SERVER_PORT"] || String(address.getPort() || "");

	    env.scriptName          = "";
	    env.pathInfo            = uri.path || "";

	    env.method       = String(request.getMethod() || "");
	    env.queryString         = uri.query || "";
	    env["HTTP_VERSION"]         = "HTTP/"+request.getMajor()+"."+request.getMinor();

	    var cAddr, addr;
	    if (cAddr = request.getClientAddress())
		env["REMOTE_ADDR"]      = String(cAddr.getHostName() || cAddr.getAddress() || "");

	    env["jsgi.version"]         = [0,2];
	    env["jsgi.input"]           = new IO(request.getInputStream(), null);
	    env["jsgi.errors"]          = system.stderr;
	    env["jsgi.multithread"]     = false;
	    env["jsgi.multiprocess"]    = true;
	    env["jsgi.honor_request_hash"]    = true;
	    env["jsgi.run_once"]        = false;
	    env["jsgi.url_scheme"]      = String(address.getScheme() || "http");

	    // efficiently serve files if the server supports it
	    env["HTTP_X_ALLOW_SENDFILE"] = "yes";
	    // call the app
	    var res = app(env);
	    var output, responseStarted = false;

	    // use the promise manager to determine when the app is done
	    // in a normal sync request, it will just execute the fulfill
	    // immediately
	    when(res, function(res){
	    		// success handler
	    		try{
				handleResponse(res);
			}
			catch(e){
				output.write(e);
			}
			
			// finished
			output.close();
		    }, function(error){
		    	// unhandled error
			handleResponse({status:500, headers:{}, body:[error.message]});
		    }, 
		    	// progress handler
		    	handleResponse);

	    function handleResponse(res){
		if(!responseStarted){
			responseStarted = true;
		    // set the status
		    response.setCode(res.status);
		    response.setText(HTTP_STATUS_CODES[res.status]);

		    // check to see if X-Sendfile was used, remove the header
		    var sendfilePath = null;
		    if (HashP.includes(res.headers, "X-Sendfile")) {
			sendfilePath = HashP.unset(res.headers, "X-Sendfile");
			HashP.set(res.headers, "Content-Length", String(file.size(sendfilePath)));
		    }

		    // set the headers
		    for (var key in res.headers) {
			res.headers[key].split("\n").forEach(function(value) {
			    response.add(key, value);
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
	}

	}
};