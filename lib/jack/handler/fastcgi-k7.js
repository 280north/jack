exports.run = function(app) {
    var f = new net.http.server.fcgi.FCGI();

    while (f.accept() >= 0) {
        var fcgiEnv = f.getEnv(),
            jackEnv = {};
            
        for (var key in fcgiEnv)
            jackEnv[key] = fcgiEnv[key];
        
        var result = app(jackEnv),
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
