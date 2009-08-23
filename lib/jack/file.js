var file = require("file"),
    utils = require("./utils"),
    mime = require("./mime");

exports.File = function(root) {
    return function(env) {
        var pathInfo = utils.unescape(env["PATH_INFO"]);
        
        if (pathInfo.indexOf("..") >= 0)
            return utils.responseForStatus(403);

        var path = file.join(root, pathInfo); // don't want to append a "/" if PATH_INFO is empty

        try {
            if (file.isFile(path) && file.isReadable(path)) {
                // efficiently serve files if the server supports "X-Sendfile"
                if (env["HTTP_X_ALLOW_SENDFILE"]) {
                    return [200, {
                        "X-Sendfile"        : path,
                        "Content-Type"      : mime.mimeType(file.extension(path), "text/plain"),
                        "Content-Length"    : "0"//String(file.size(path))
                    }, []];
                } else {
                    var contents = file.read(path, { mode : "b" });
                    if (contents)
                        return exports.serve(path, contents);
                }
            }
        } catch(e) {
            env["jack.errors"].print("Jack.File error: " + e);
        }

        return utils.responseForStatus(404, pathInfo);
    }
}

exports.serve = function(path, body) {
    // TODO: once we have streams that respond to forEach, just return the stream
    return [200, {
        "Last-Modified"  : file.mtime(path).toUTCString(),
        "Content-Type"   : mime.mimeType(file.extension(path), "text/plain"),
        "Content-Length" : String(body.length)
    }, [body]];
}
