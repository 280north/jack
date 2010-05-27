
// -- tlrobinson Tom Robinson

// NOTE: This currently forks a process per request, buffers the response, and writes/reads to the file system
// e.g. it's horribly inefficient and shouldn't be used in production, only for testing.

var OS = require("os");
var FILE = require("file");

// tries to follow rfc2616 sect 14.3
function parseAcceptEncoding(value) {
    value = value || "identity";
    var encodings = {};
    value.split(/,\s*/g).forEach(function(encodingString) {
        var parts = encodingString.split(/;\s*/, 2);
        var name = parts[0];

        var match;
        if (parts.length === 2 && (match = parts[1].match(/q=(.*)/)))
            encodings[name] = parseInt(match[1], 10);
        else
            encodings[name] = true;
    });

    if (encodings["identity"] === undefined && encodings["*"] !== 0.0)
        encodings["identity"] = true;

    return encodings;
}

exports.Gzip = function(app) {
    return function(env) {
        var response = app(env);

        var encodings = parseAcceptEncoding(env["HTTP_ACCEPT_ENCODING"]);

        // TODO: obey qvalues?
        if (encodings["gzip"] || encodings["*"] !== 0.0) {

            var originalLength = 0;

            // HACK: hacky hack hack. use a gzip library in-process
            var tmpPath = FILE.path("/tmp/gzip-"+Math.round(Math.random()*Math.pow(2, 32)).toString(16));
            var p = OS.popen("gzip > " + tmpPath);
            response.body.forEach(function(chunk) {
                var original = chunk.toByteString();
                originalLength += original.length;
                p.stdin.raw.write(original);
            });
            p.stdin.raw.close();
            if (p.wait() !== 0)
                throw new Error("Gzip error");

            var gzipped = tmpPath.read("rb");
            tmpPath.remove();

            response.headers["Content-Encoding"] = "gzip";
            response.headers["Content-Length"] = gzipped.length.toString(10);

            response.headers["X-Original-Content-Length"] = originalLength.toString(10); // for testing

            response.body = [gzipped];
        }

        return response;
    }
}