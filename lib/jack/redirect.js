
var url = require("url");

exports.Redirect = function (path) {
    return function (env) {
        var location = 
            (env['jsgi.url_scheme'] || 'http') +
            '://' + 
            (env.HTTP_HOST || (
                env.SERVER_NAME +
                (env.SERVER_PORT == "80" ? "" : ":" + env.SERVER_PORT)
            )) +
            (env.SCRIPT_NAME || '') +
            env.PATH_INFO;
        print(location);
        print(path);
        location = url.resolve(location, path);
        print(location);
        return [
            301,
            {
                "Location": location,
                "Content-type": "text/plain"
            },
            ['Permanent Redirect: ' + location]
        ];
    };
};

