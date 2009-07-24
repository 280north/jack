
var util = require("util");

exports.Path = function (paths, notFound) {
    if (!paths)
        paths = {};
    if (!notFound)
        notFound = exports.notFound;
    return function (env) {
        var path = env.PATH_INFO.substring(1);
        var parts = path.split("/");
        var part = env.PATH_INFO.charAt(0) + parts.shift();
        if (util.has(paths, part)) {
            env.SCRIPT_NAME = env.SCRIPT_NAME + part;
            env.PATH_INFO = env.PATH_INFO.substring(part.length);
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
    var app = exports.Path({
        "/a": exports.Path({
            "": require("./redirect").Redirect("a/"),
            "/": function () {
                return [200, {"Content-type": "text/plain"}, ["Hello, World!"]];
            }
        })
    });
    exports.app = jack.ContentLength(app);
    require("jackup").main(["jackup", module.path]);
}

