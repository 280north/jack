var util = require("util"),
        Request = require("jack/request").Request,
        Response = require("jack/response").Response,
        sha = require("sha"),
        HashP = require("hashp").HashP;

var loadSession = function(env, key, secret){
    var req = new Request(env);
    var cookie = req.cookies()[key];

    if (cookie){
        var cookieParts = decodeURIComponent(cookie).split("--");
        var digest = cookieParts[1];
        var sessionData = cookieParts[0];

        if (digest == sha.hash(sessionData + secret).decodeToString(64))  {
            return JSON.parse(sessionData);
        }
    }

    return {};
}

var commitSession = function(env, jsgiResponse, key, secret){
    var session = env["jsgi.session"];

    if (!session) return jsgiResponse;

    var sessionData = JSON.stringify(session);

    if (secret){
        var digest = sha.hash(sessionData + secret).decodeToString(64);
        sessionData = sessionData + "--" + digest;
    }

    if (sessionData.length > 4096) {
        env["jsgi.errors"] += "Session Cookie data size exceeds 4k!  Content dropped";
        return jsgiResponse;
    }
    
    var options = env["jsgi.session.options"];

    var cookie = { value: sessionData };
    if (options["expires_after"])
        cookie.expires = new Date() + options["expires_after"];

    var response = new Response(jsgiResponse.status, jsgiResponse.headers, jsgiResponse.body);
    response.setCookie(key, cookie);

    return response;
}

var Cookie = exports.Cookie = function(app, options) {
    options = options || {};
    util.update(options, /* default options */ {
        domain: null,
        path: "/",
        expire_after: null
    });

    var key = options.key || "jsgi.session",
            secret = options.secret;

    return function(env) {
        try {
            env["jsgi.session"] = loadSession(env, key, secret);
        } catch (err) {
            env["jsgi.session"] = {};
        }
        env["jsgi.session.options"] = options;

        var jsgiResponse = app(env);

        return commitSession(env, jsgiResponse, key, secret);
    }
}