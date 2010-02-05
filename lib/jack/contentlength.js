var utils = require("./utils");

// Sets the Content-Length header on responses with fixed-length bodies.
var ContentLength = exports.ContentLength = function(app) {
    return function(request) {
        var response = app(request);
        if (!utils.STATUS_WITH_NO_ENTITY_BODY(response.status) &&
            !response.headers["content-length"] &&
            !response.headers["transfer-encoding"] !== "identity" && 
            typeof response.body.forEach === "function")
        {
            var newBody = [],
                length = 0;
                
            response.body.forEach(function(part) {
                var binary = part.toByteString();
                length += binary.length;
                newBody.push(binary);
            });
            
            //response.body = newBody;
            response.headers["content-length"] = String(length);
        }
        
        return response;
    };
};
