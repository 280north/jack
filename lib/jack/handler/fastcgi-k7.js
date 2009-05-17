var ByteString = require("bytestring").ByteString;

exports.run = function(app) {
    var f = new net.http.server.fcgi.FCGI();

    while (f.accept() >= 0) {
        var fcgiEnv = f.getEnv(),
            env = {};
            
        for (var key in fcgiEnv) {
            var newKey = key
            if (newKey === "HTTP_CONTENT_LENGTH")
                newKey = "CONTENT_LENGTH";
            else if (newKey === "HTTP_CONTENT_TYPE")
                newKey = "CONTENT_TYPE";
            env[newKey] = fcgiEnv[key];
        }
        
        if (env["SCRIPT_NAME"] === "/") {
            env["SCRIPT_NAME"] = "";
            env["PATH_INFO"] = "/";
        }
        
        env["jack.version"]         = [0,1];
        
        var input = f.getRawRequest(),
            offset = 0;
        env["jack.input"]           = {
            read : function(length) {
                var read;
                if (typeof length === "number")
                    read = input.substring(offset, offset+length);
                else
                    read = input.substring(offset);
                offset += read.length;
                return new ByteString(read);
            },
            close : function(){}
        }
        
        env["jack.errors"]          = system.stderr;
        env["jack.multithread"]     = false;
        env["jack.multiprocess"]    = true;
        env["jack.run_once"]        = true;
        env["jack.url_scheme"]      = "http"; // FIXME
        
        var result = app(env),
            status = result[0], headers = result[1], body = result[2];

    	for (var key in headers) {
    	    if (headers[key] !== null) {
    		    f.putstr(key + ": " + headers[key] + "\r\n");
    	    }
    	}
    	f.putstr("\r\n");

        body.forEach(function(chunk) {
            f.putstr(chunk);
        });
    }

    f.free();
}
