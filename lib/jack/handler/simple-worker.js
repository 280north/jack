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
        var env = {headers:{}};

        // copy HTTP headers over, converting where appropriate
        for (var e = request.getNames().iterator(); e.hasNext();)
        {
        var name = String(e.next()),
            value = String(request.getValue(name)), // FIXME: only gets the first of multiple
            key = name.toLowerCase();

        env.headers[key] = value;
        }

        var address = request.getAddress();

        if (env["HTTP_HOST"])
        {
        var parts = env["HTTP_HOST"].split(":");
        if (parts.length === 2)
        {
            env.serverName = parts[0];
            env.serverPort = parts[1];
        }
        }

        var uri = URI.parse(String(request.getTarget()));

        env.serverName = env.serverName || String(address.getDomain() || "");
        env.serverPort = env.serverPort || String(address.getPort() || "");

        env.scriptName          = "";
        env.pathInfo            = uri.path || "";

        env.method       = String(request.getMethod() || "");
        env.queryString         = uri.query || "";
        env["HTTP_VERSION"]         = "HTTP/"+request.getMajor()+"."+request.getMinor();

        var cAddr, addr;
        if (cAddr = request.getClientAddress())
        env["REMOTE_ADDR"]      = String(cAddr.getHostName() || cAddr.getAddress() || "");

        env.body           = new IO(request.getInputStream(), null);
        env.jsgi={version: [0,3],
            errors: system.stderr,
            multithread: false,
            multiprocess: true,
            async: true,
            run_once: false};
        env.scheme = String(address.getScheme() || "http");

        // efficiently serve files if the server supports it
        env["x-sendfile"] = "yes";
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