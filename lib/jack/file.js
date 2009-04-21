var Utils = require("./utils"),
    Mime = require("./mime").Mime,
    file = require("file"),
    fread = file.read,
    Path = file.Path;

var Jack_File = exports.File = function(root) {
    return function(env) {
        var pathInfo = Utils.unescape(env["PATH_INFO"]);

        if (pathInfo.indexOf("..") >= 0)
            return Jack_File.forbidden();

        var path = pathInfo ? root + pathInfo : root; // don't want to append a "/" if PATH_INFO is empty

        try {
            if (file.isReadable(path)) {
                // efficiently serve files if the server supports "X-Sendfile"
                if (false && env["HTTP_X_ALLOW_SENDFILE"]) {
                    return [200, {
                        "X-Sendfile"        : path,
                        "Content-Type"      : Mime.mimeType(Path.extname(path), "text/plain"),
                        "Content-Length"    : "0"//String(file.size(path))
                    }, []];
                } else {
                    var contents = fread(path);
                    if (contents)
                        return Jack_File.serve(path, contents);
                }
            }
        } catch(e) {
            env["jack.errors"].puts("Jack.File error: " + e);
        }

        return Jack_File.notFound(path);
    }
}

Jack_File.serve = function(path, contents) {
    var body = contents,
        size = contents.getLength();

    return [200, {
        //"Last-Modified"  : file.mtime(path).httpdate(),
        "Content-Type"   : Mime.mimeType(Path.extname(path), "text/plain"),
        "Content-Length" : String(size)
    }, body];
}

Jack_File.notFound = function(path) {
    var body = "File not found: "+path+"\n";
    
    return [404, {
        "Content-Type"   : "text/plain",
        "Content-Length" : String(body.length)
    }, body];
}

Jack_File.forbidden = function() {
    var body = "Forbidden\n";
    
    return [403, {
        "Content-Type"   : "text/plain",
        "Content-Length" : String(body.length)
    }, body];
}
