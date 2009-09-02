exports.run = function(app, request, response) {
    var env = {};
    
    // copy CGI variables
    for (var key in request._headers)
        env[key] = request._headers[key];

    env["HTTP_VERSION"]         = env["SERVER_PROTOCOL"];
    
    env["jack.version"]         = [0,1];
    env["jack.input"]           = null; // FIXME
    env["jack.errors"]          = system.stderr;
    env["jack.multithread"]     = false;
    env["jack.multiprocess"]    = true;
    env["jack.run_once"]        = true;
    env["jack.url_scheme"]      = "http"; // FIXME
    
    // call the app
    var res = app(env);
    
    // set the status
    response.status(res.status);
    
    // set the headers
    response.header(res.headers);
    
    // output the body
    res.body.forEach(function(bytes) {
        response.write(bytes.toByteString("UTF-8").decodeToString("UTF-8"));
    });
}
