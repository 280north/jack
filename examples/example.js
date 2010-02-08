var Jack = require("jack");

var map = {};

// an extremely simple Jack application
map["/hello"] = function(request) {
    return {
        status : 200,
        headers : {"content-type":"text/plain"},
        body : ["Hello from " + request.scriptName]
    };
}

// 1/6th the time this app will throw an exception
map["/httproulette"] = function(env) {
    // if you have the ShowExceptions middleware in the pipeline it will print the error.
    // otherwise the server/handler will print something
    if (Math.random() > 5/6)
        throw new Error("bam!");
    
    return {
        status : 200,
        headers : {"content-type":"text/html"},
        body : ['whew!<br /><a href="httproulette">try again</a>']
    };
}

var form = '<form action="" method="get"><input type="text" name="name" value="" id="some_name"><input type="submit" value="go"></p></form>';

// an index page demonstrating using a Response object
map["/"] = function(request) {
    var req = new Jack.Request(request),
        res = new Jack.Response();
    res.headers["content-type"] = "text/html";

    res.write('hello ' + (req.GET("name") || form) +"<br />");
    
    res.write('<a href="hello">hello</a><br />');
    res.write('<a href="httproulette">httproulette</a><br />');
    res.write('<a href="narwhal">narwhal</a><br />');
    res.write('<a href="stream">stream</a><br />');
    res.write('<a href="stream1">stream1</a><br />');
    res.write('<a href="cookie">cookie</a><br />');
    res.write('<a href="examples">examples</a><br />');
    res.write('<a href="info">info</a><br />');

    return res.finish();
}

map["/narwhal"] = Jack.Narwhal;

// use the JSONP middleware on this one
map["/jsontest"] = Jack.JSONP(function(request) {
    return {
        status : 200,
        headers : { "content-type" : "application/json" },
        body : ["{ \"hello\" : \"world\" }"]
    };
});

map["/files"] = Jack.File(".");

map["/stream"] = function(request) {
    return {
        status : 200,
        headers : {"content-type":"text/html", "transfer-encoding":"chunked"},
        body : { forEach : function(write) {
            for (var i = 0; i < 50; i++) { 
                java.lang.Thread.currentThread().sleep(100); 
                write("hellohellohellohellohellohellohellohellohellohellohellohellohello<br />"); 
            }
        }}
    };
}


map["/stream1"] = function(request) {
    var res = new Jack.Response(200, {"transfer-encoding":"chunked"});
    return res.finish(function(response) {
        for (var i = 0; i < 50; i++) { 
            java.lang.Thread.currentThread().sleep(100); 
            response.write("hellohellohellohellohellohellohellohellohellohellohellohellohello<br />"); 
        }
    });
}

map["/cookie"] = function(request) {
    request = new Jack.Request(env);
    var response = new Jack.Response();
    
    var name = request.POST("name");
    
    if (typeof name === "string") {
        response.write("setting name: " + name + "<br />");
        response.setCookie("name", name);
    }
    
    var cookies = request.cookies();
    if (cookies["name"])
        response.write("previously saved name: " + cookies["name"] +"<br />")
        
    response.write('<form action="cookie" method="post" enctype="multipart/form-data">');
    response.write('<input type="text" name="name" value="" id="some_name">');
    response.write('<input type="submit" value="go"></form>');
    
    return response.finish();
}

map["/info"] = function(request) {
    var response = new Jack.Response(200, {"content-type" : "text/plain"});
    
    var params = new Jack.Request(request).params();
    
    response.write("========================= params =========================\n");
    
    for (var i in params)
        response.write(i + "=>" + params[i] + "\n")
    
    response.write("========================= env =========================\n");
    
    for (var i in request)
        response.write(i + "=>" + request[i] + "\n")
    
    response.write("========================= system.env =========================\n");
    
    for (var i in system.env)
        response.write(i + "=>" + system.env[i] + "\n")

    return response.finish();
}

map["/examples"] = Jack.Directory(".");

// middleware:

// apply the URLMap
exports.app = Jack.ContentLength(Jack.URLMap(map));
