var Request = require("./request").Request,
    HashP = require("hashp").HashP;

// Wraps a response in a JavaScript callback if provided in the "callback" parameter,
// JSONP style, to enable cross-site fetching of data. Be careful where you use this.
// http://bob.pythonmac.org/archives/2005/12/05/remote-json-jsonp/
var JSONP = exports.JSONP = function(app, callbackParameter) {
    return function(env) {
        var response = app(env),
            request = new Request(env);
            
        var callback = request.params(callbackParameter || "callback");
        
        if (callback) {
            var body = response.body;
        
            HashP.set(result.headers, "Content-Type", "application/javascript");
            
            response.body = { forEach : function(block) {
                block(callback+"(");
                body.forEach(block);
                block(")");
            }};
        }
        
        return result;
    }
}
