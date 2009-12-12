// handler for Simple (http://simpleweb.sourceforge.net/) based on the servlet handler

var IO = require("io").IO,
    file = require("file"),
    HashP = require("hashp").HashP,
    URI = require("uri").URI,
    HTTP_STATUS_CODES = require("../utils").HTTP_STATUS_CODES;

exports.run = function(app, options) {
    options = options || {};
    
    // need to use JavaAdapter form when using module scoping for some reason
    var handler = new JavaAdapter(Packages.org.simpleframework.http.core.Container, {
        handle : function(request, response) {
            try {
                process(app, request, response);
            } catch (e) {
                print("ERROR: " + e + " ["+e.message+"]");
                if (e.rhinoException)
                    e.rhinoException.printStackTrace();
                else if (e.javaException)
                    e.javaException.printStackTrace();
                throw e;
            }
        }
    });
    
    // different version
    var port = options.port || 8080,
        address = options.host ? new Packages.java.net.InetSocketAddress(options.host, port) : new Packages.java.net.InetSocketAddress(port),
        connection;
        
    if (typeof Packages.org.simpleframework.transport.connect.SocketConnection === "function")
        connection = new Packages.org.simpleframework.transport.connect.SocketConnection(handler);
    else if (typeof Packages.org.simpleframework.http.connect.SocketConnection === "function")
        connection = new Packages.org.simpleframework.http.connect.SocketConnection(handler);
    else
        throw new Error("Simple SocketConnection not found, missing .jar?");
    
    print("Jack is starting up using Simple on port " + port);
    
    connection.connect(address);
}

var process = function(app, servletRequest, servletResponse) {
    var request = {
        headers: {},
        jsgi: {}
    };
    
    // copy HTTP headers over, converting where appropriate
    for (var e = servletRequest.getNames().iterator(); e.hasNext();) {
        var name = String(e.next()),
            value = String(servletRequest.getValue(name)), // FIXME: only gets the first of multiple
            key = name.toLowerCase();
        
        request.headers[key] = value;
    }
    
    var address = servletRequest.getAddress();

    if (request.headers.host) {
        var parts = request.headers.host.split(":");
        if (parts.length === 1) {
            request.serverName = parts[0];
        }
        else if (parts.length === 2) {
            request.serverName = parts[0];
            request.serverPort = parts[1];
        }
    }
    
    var name = address.getDomain(),
        port = address.getPort();
    request.serverName = request.serverName || String(name || "");
    request.serverPort = request.serverPort || String(port >= 0 ? port : "");
    
    var uri = URI.parse(String(servletRequest.getTarget()));
    request.scriptName          = "";
    request.pathInfo            = uri.path || "";
    
    request.method              = String(servletRequest.getMethod() || "");
    request.queryString         = uri.query || "";
    request.version             = [servletRequest.getMajor(), servletRequest.getMinor()];
    request.input               = new IO(servletRequest.getInputStream(), null);
    request.scheme              = String(address.getScheme() || "http");
    
    var cAddr;
    if (cAddr = servletRequest.getClientAddress())
        request.remoteAddr      = String(cAddr.getHostName() || cAddr.getAddress() || "");
    
    request.jsgi.version        = [0, 2];
    request.jsgi.errors         = system.stderr;
    request.jsgi.multithread            = true;
    request.jsgi.multiprocess   = true;
    request.jsgi.runOnce        = false;
    
    request.jsgi.ext            = {};
    request.jsgi.ext.async      = [0, 1];
    
    // efficiently serve files if the server supports it
    request.headers["x-allow-sendfile"] = "yes"; //FIXME why yes?
    
    // call the app
    var response = app(request);
    
    // set the status
    servletResponse.setCode(response.status);
    servletResponse.setText(HTTP_STATUS_CODES[response.status]);
    
    // check to see if X-Sendfile was used, remove the header
    var sendfilePath = null;
    if (response.headers["x-sendfile"]) {
        sendfilePath = HashP.unset(response.headers, "x-sendfile");
        response.headers["content-length"] = String(file.size(sendfilePath));
    }
    
    // set the headers
    for (var key in response.headers) {
        if (typeof response.headers[key].forEach === "function") {
            // header is multiple
            response.headers[key].forEach(function(value) {
                servletResponse.add(key, value);
            });
        }
        else {
            servletResponse.add(key, response.headers[key]);
        }
    }
    
    // determine if the response should be chunked (FIXME: need a better way?)
    var chunked = response.headers["transfer-encoding"] !== 'identity';
    
    var output = new IO(null, servletResponse.getOutputStream());
    
    // X-Sendfile send
    if (sendfilePath) {
        var cIn  = new java.io.FileInputStream(sendfilePath).getChannel(),
            cOut = servletResponse.getByteChannel();
            
        cIn.transferTo(0, cIn.size(), cOut);
        
        cIn.close();
        cOut.close();
    }
    
    // output the body, flushing after each write if it's chunked
    var possiblePromise = response.body.forEach(function(chunk) {
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
};
