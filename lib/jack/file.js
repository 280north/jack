var file = require("file"),
    utils = require("./utils"),
    resource = require("packages").resourceIfExists,
    mime = require("./mime");

exports.File = function(root) {
    return function(request) {
        var pathInfo = utils.unescape(request.pathInfo);
        
        if (pathInfo.indexOf("..") >= 0)
            return utils.responseForStatus(403);

        var path = file.join(root, pathInfo); // don't want to append a "/" if PATH_INFO is empty
        path = resource(path);

        try {
            if (file.isFile(path) && file.isReadable(path)) {
                // efficiently serve files if the server supports "X-Sendfile"
                if (request["HTTP_X_ALLOW_SENDFILE"]) {
                    return {
                        status : 200,
                        headers : {
                            "X-Sendfile"        : path,
                            "Content-Type"      : mime.mimeType(file.extension(path), "text/plain"),
                            "Content-Length"    : "0"//String(file.size(path))
                        },
                        body : []
                    };
                } else {
                    var contents = file.read(path, { mode : "b" });
                    if (contents)
                        return exports.serve(path, contents);
                }
            }
        } catch(e) {
            request.jsgi.errors.print("Jack.File error: " + e);
        }

        return utils.responseForStatus(404, pathInfo);
    }
}

exports.serve = function(path, body) {
    // TODO: once we have streams that respond to forEach, just return the stream
    return {
        status : 200,
        headers : {
            "Last-Modified"  : file.mtime(path).toUTCString(),
            "Content-Type"   : mime.mimeType(file.extension(path), "text/plain"),
            "Content-Length" : String(body.length)
        },
        body : [body]
    };
}
