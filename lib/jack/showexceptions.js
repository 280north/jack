var ShowExceptions = exports.ShowExceptions = function(app) {
    return function(request) {
        try {
            return app(request);
        } catch (e) {
            var backtrace = "<html><body><pre>" + e.name + ": " + e.message;
            if (e.rhinoException) {
                //TODO we need a narwhal stack trace abstraction
                backtrace += "\n" + e.rhinoException.getScriptStackTrace();
            }
            backtrace += "</body></html>";
            return {
                status : 500,
                headers : {"content-type":"text/html","content-length":String(backtrace.length)},
                body : [backtrace]
            };
        }
    }
}
