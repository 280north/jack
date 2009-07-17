
var util = require("util");

exports.Directory = function (paths, notFound) {
    if (!paths)
        paths = {};
    if (!notFound)
        notFound = exports.notFound;
    return function (env) {
        if (!/^\//.test(env.PATH_INFO)) {
            var location = 
                (env['jsgi.url_scheme'] || 'http') +
                '://' + 
                (env.HTTP_HOST || (
                    env.SERVER_NAME +
                    (env.SERVER_PORT == "80" ? "" : ":" + env.SERVER_PORT)
                )) +
                (env.SCRIPT_NAME || '') +
                env.PATH_INFO + "/";
            return [
                301,
                {
                    "Location": location,
                    "Content-type": "text/plain"
                },
                ['Permanent Redirect: ' + location]
            ];
        }
        var path = env.PATH_INFO.substring(1);
        var parts = path.split("/");
        var part = parts.shift();
        if (util.has(paths, part)) {
            env.SCRIPT_NAME = env.SCRIPT_NAME + "/" + part;
            env.PATH_INFO = path.substring(part.length);
            return paths[part](env);
        }
        return notFound(env);
    };
};

exports.notFound = function (env) {
    return [
        404,
        {"Content-type": "text/plain"},
        ["404 - Not Found - " + env.PATH_INFO],
    ];
};

if (require.main == module.id) {
    var jack = require("jack");
    var app = exports.Directory({
        "a": exports.Directory({
            "": function () {
                return [200, {"Content-type": "text/plain"}, ["Hello, World!"]];
            }
        })
    });
    exports.app = jack.ContentLength(app);
    require("jackup").main(["jackup", module.path]);
}

