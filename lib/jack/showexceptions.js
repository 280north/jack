var ShowExceptions = exports.ShowExceptions = function(app) {
    return function(env) {
        try {
            return app(env);
        } catch (e) {
            var backtrace = String((e.rhinoException && e.rhinoException.printStackTrace()) || (e.name + ": " + e.message));
            return {
                status : 500,
                headers : {"Content-Type":"text/html","Content-Length":String(backtrace.length)},
                body : [backtrace]
            };
        }
    }
}
