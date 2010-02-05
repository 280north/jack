var Request = require("jack/request").Request,
    Response = require("jack/response").Response,
    AsyncResponse = require("jack/response").AsyncResponse;

var sessions = [];

var map = {};

map["/"] = function(request) {
    var res = new Response();
    
    res.write('<input type="text" id="m" value="hello">');
    res.write('<input type="button" value="Send" onclick="document.getElementById(\'r\').src=\'send?message=\'+encodeURIComponent(document.getElementById(\'m\').value);">');
    res.write('<iframe id="r"></iframe>');
    res.write('<a href="listen" target="_blank">listen</a>');
    res.write('<input value="listener" type="button" onclick="var f = document.createElement(\'iframe\'); f.src = \'listen\'; document.body.appendChild(f);">');
    
    return res.finish();
}

map["/send"] = function(request) {
    var res = new Response(),
        message = new Request(request).params("message");
        
    var total = sessions.length;
    sessions = sessions.filter(function(session) {
        try {
            session.write("received: " + message + "<br />");
        } catch (e) {
            return false;
        }
        return true;
    });
    
    res.write("sent '" + message + "' to " + sessions.length + " clients, " + (total - sessions.length) + " closed.");
        
    return res.finish();
}

map["/listen"] = function(env) {
    var response = new AsyncResponse({
        status : 200,
        headers : {"transfer-encoding" : "chunked"},
        body : [Array(1024).join(" ")]
    });
    
    sessions.push(response);
    
    return response;
}

// apply the URLMap
exports.app = require("jack/urlmap").URLMap(map);
