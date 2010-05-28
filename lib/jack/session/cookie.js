
// -- gmosx George Moschovitis
// -- hns Hannes Wallnöfer
// -- nrstott Nathan Stott
// -- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License

var UTIL = require("util");
var SHA = require("sha");
var BASE64 = require("base64");

var Request = require("jack/request").Request;
var Response = require("jack/response").Response;
var Session = require("jack/session").Session;

function loadSession(env) {
    var options = env["jsgi.session.options"];

    var req = new Request(env);
    var cookie = req.cookies()[options.key];

    if (cookie) {
        var parts = decodeURIComponent(cookie).split("--");
        var digest = env["jsgi.session.digest"] = parts[1];
        var sessionData = parts[0];

        if (digest === BASE64.encode(SHA.hash(sessionData + options.secret))) {
            return JSON.parse(sessionData);
        }
    }

    return {};
}

function commitSession(env, jsgiResponse, key, secret) {
    var session = env["jsgi.session"];

    if (!session)
        return jsgiResponse;

    var sessionData = JSON.stringify(session);

    var digest = BASE64.encode(SHA.hash(sessionData + secret));

    // do not serialize if the session is not dirty.
    if (digest === env["jsgi.session.digest"])
        return jsgiResponse;

    sessionData = sessionData + "--" + digest;

    if (sessionData.length > 4096) {
        env["jsgi.errors"] += "Session Cookie data size exceeds 4k!  Content dropped";
        return jsgiResponse;
    }

    var options = env["jsgi.session.options"];

    var cookie = { path: "/", value: sessionData };
    if (options["expires_after"])
        cookie.expires = new Date() + options["expires_after"];

    var response = new Response(jsgiResponse.status, jsgiResponse.headers, jsgiResponse.body);
    response.setCookie(key, cookie);

    return response;
}

/**
 * Cookie Session Store middleware.
 * Does not implicitly deserialize the session, only serializes the session if
 * dirty.
 */
var Cookie = exports.Cookie = function(app, options) {
    options = options || {};
    UTIL.update(options, /* default options */ {
        key: "jsgi.session",
        domain: null,
        path: "/",
        expire_after: null
    });

    if (!options.secret)
        throw new Error("Session secret not defined");

    return function(env) {
        env["jsgi.session.options"] = options;
        env["jsgi.session.loadSession"] = loadSession;
        env["jsgi.session.load"] = function() { return Session(env); };

        var jsgiResponse = app(env);

        return commitSession(env, jsgiResponse, options.key, options.secret);
    }
}
