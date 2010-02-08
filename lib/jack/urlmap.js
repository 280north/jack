var utils = require("./utils");

var URLMap = exports.URLMap = function(map, options) {
    var options = options || { longestMatchFirst : true },
        mapping = [];
        
    for (location in map) {
        var app = map[location],
            host = null,
            match;
        
        if (match = location.match(/^https?:\/\/(.*?)(\/.*)/))
        {
            host = match[1];
            location = match[2];
        }
            
        if (location.charAt(0) != "/")
            throw new Error("paths need to start with / (was: " + location + ")");
        
        mapping.push([host, location.replace(/\/+$/,""), app]);
    }
    // if we want to match longest matches first, then sort
    if (options.longestMatchFirst) {
        mapping = mapping.sort(function(a, b) {
            return (b[1].length - a[1].length) || ((b[0]||"").length - (a[0]||"").length);
        });
    }
    
    return function(env) {
        var path  = env.pathInfo ? env.pathInfo.squeeze("/") : "",
            hHost = env['HTTP_HOST'], sName = env['SERVER_NAME'], sPort = env['SERVER_PORT'];

        for (var i = 0; i < mapping.length; i++)
        {
            var host = mapping[i][0], location = mapping[i][1], app = mapping[i][2];

            if ((host === hHost || host === sName || (host === null && (hHost === sName || hHost === sName+":"+sPort))) &&
                (location === path.substring(0, location.length)) &&
                (path.charAt(location.length) === "" || path.charAt(location.length) === "/"))
            {
                // FIXME: instead of modifying these, create a copy of "env"
                env["SCRIPT_NAME"] += location;
                env.pathInfo    = path.substring(location.length);

                return app(env);
            }
        }
        return exports.notFound(env);
    }
}

exports.notFound = function (env) {
    return utils.responseForStatus(404, env.pathInfo);
};
