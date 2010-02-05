var IO = require("io").IO,
    file = require("file"),
    when = require("promise").when,
    HTTP_STATUS_CODES = require("../utils").HTTP_STATUS_CODES,
    HashP = require("hashp").HashP,
    jackup = require("jackup"),
    URI = require("uri").URI;

onconnect = function (e) {
    exports.httpWorker = e.port;
    onconnect = null;
};

onstart = function(options){
    exports.options = options;
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
        var name = address.getDomain(),
            port = address.getPort();
        req.serverName = request.serverName || String(name || "");
        req.serverPort = request.serverPort || String(port >= 0 ? port : "");

        req.scriptName          = "";
        req.pathInfo            = uri.path || "";

        req.method       = String(request.getMethod() || "");
        req.queryString         = uri.query || "";
        req.version         = "HTTP/"+request.getMajor()+"."+request.getMinor();

        var cAddr, addr;
        if (cAddr = request.getClientAddress())
            req.remoteHost      = String(cAddr.getHostName() || cAddr.getAddress() || "");

        req.input           = new IO(request.getInputStream(), null);
        req.jsgi={version: [0, 3],
            errors: system.stderr,
            multithread: false,
            multiprocess: true,
            ext: { async: [0, 1] },
            runOnce: false};
        req.scheme = String(address.getScheme() || "http");
        var cAddr;
        if (cAddr = request.getClientAddress())
            req.remoteAddr      = String(cAddr.getHostName() || cAddr.getAddress() || "");

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
            });

        function handleResponse(res){
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
                return;
            }
            try{
                // output the body, flushing after each write if it's chunked
                var possiblePromise = res.body.forEach(function(chunk) {
                    if (!sendfilePath) {
                        //output.write(new java.lang.String(chunk).getBytes("US-ASCII"));
                        //output.write(chunk, "US-ASCII");
                        // with async/promises, it would actually be more ideal to set the headers
                        // and status here before the first write, so that a promise could suspend
                        // and then set status when it resumed
                        
                        output.write(chunk);
                        
                        if (chunked)
                            output.flush();
                    }
                });
                
                // check to see if the return value is a promise
                // alternately we could check with if (possiblePromise instanceof require("promise").Promise)
                if (possiblePromise && typeof possiblePromise.then == "function") {
                    // its a promise, don't close the output until it is fulfilled
                    possiblePromise.then(function() {
                            // fulfilled, we are done now
                            output.close();
                        },
                        function(e) {
                            // an error, just write the error and finish
                            output.write(e.message);
                            output.close();
                        });
                }
                else {
                    // not a promise, regular sync request, we are done now
                    output.close();
                }
            }
            catch(e){
                output.write(String((e.rhinoException && e.rhinoException.printStackTrace()) || (e.name + ": " + e.message)));
                if(chunked){
                    output.flush();
                }
            }


        }
    

    }
};