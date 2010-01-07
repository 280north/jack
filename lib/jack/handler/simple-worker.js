var IO = require("io").IO,
    file = require("file"),
    when = require("promise").when,
    HTTP_STATUS_CODES = require("../utils").HTTP_STATUS_CODES,
    HashP = require("hashp").HashP,
    jackup = require("jackup"),
    URI = require("uri").URI;

onstart = function(options){
    jackup.start(options);
};
exports.run = function(app, options) {

    
    onrequest = function(request, response) {
        var req = {headers:{}};

        // copy HTTP headers over, converting where appropriate
        for (var e = request.getNames().iterator(); e.hasNext();)
        {
            var name = String(e.next()),
                value = String(request.getValue(name)), // FIXME: only gets the first of multiple
                key = name.toLowerCase();

            req.headers[key] = value;
        }

        var address = request.getAddress();

        if (req.headers.host)
        {
            var parts = req.headers.host.split(":");
            if (parts.length === 2)
            {
                req.host = parts[0];
                req.port = parts[1];
            }
        }

        var uri = URI.parse(String(request.getTarget()));

	    req.env = {}; // don't know what actually goes in here
        req.host = req.host || String(address.getDomain() || "");
        req.port = req.port || String(address.getPort() || "");

        req.scriptName          = "";
        req.pathInfo            = uri.path || "";

        req.method       = String(request.getMethod() || "");
        req.queryString         = uri.query || "";
        req.version         = "HTTP/"+request.getMajor()+"."+request.getMinor();

        var cAddr, addr;
        if (cAddr = request.getClientAddress())
            req.remoteHost      = String(cAddr.getHostName() || cAddr.getAddress() || "");

        req.input           = new IO(request.getInputStream(), null);
        req.jsgi={version: [0,3],
            errors: system.stderr,
            multithread: false,
            multiprocess: true,
            async: true,
            runOnce: false};
        req.scheme = String(address.getScheme() || "http");

        // efficiently serve files if the server supports it
        req["x-sendfile"] = "yes";
        // call the app
        var res = app(req);
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
                response.getOutputStream().write(e);
            }
            
            // finished
            response.getOutputStream().close();
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
                var headerValue = res.headers[key];
                ('' + headerValue).split("\n").forEach(function(value) {
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
    }

    }
};