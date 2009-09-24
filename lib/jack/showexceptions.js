var ShowExceptions = exports.ShowExceptions = function(app) {
    return function(env) {
        try {
            return app(env);
        } catch (e) {
            var backtrace = "<html><body><pre>" + String((e.rhinoException && e.rhinoException.getScriptStackTrace()) || (e.name + ": " + e.message)) + "</pre></body></html>";
            return {
                status : 500,
                headers : {"Content-Type":"text/html","Content-Length":String(backtrace.length)},
                body : [backtrace]
            };
        }
    }
}
