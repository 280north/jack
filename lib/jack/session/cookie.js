var util = require("util"),
    Request = require("jack/request").Request,
    Response = require("jack/response").Response,
    sha = require("sha"),
    HashP = require("hashp").HashP;

function Cookie(app, options){
    options = options || {};
    this.app = app;
    this.key = options.key || "jsgi.session";
    this.secret = options.secret;

    util.update(options, /* default options */ {
        domain: null,
        path: "/",
        expire_after: null
    });

    this.options = options;
}

var loadSession = function(env){
    var req = new Request(env);
    var cookie = req.cookies()[this.key];

    if (cookie){
        var cookieParts = decodeURIComponent(cookie).split("--");
        var digest = cookieParts[1];
        var sessionData = cookieParts[0];

        if (digest == sha.hash(sessionData + this.secret).decodeToString(64))  {
            return JSON.parse(sessionData);
        }
    }

    return {};
}

var commitSession = function(env, jsgiResponse){
    var session = env["jsgi.session"];

    if (!session) return jsgiResponse;

    var sessionData = JSON.stringify(session);

    if (this.secret){
        var digest = sha.hash(sessionData + this.secret).decodeToString(64);
        sessionData = sessionData + "--" + digest;
    }

    if (sessionData.length > 4096) {
        env["jsgi.errors"] += "Session Cookie data size exceeds 4k!  Content dropped";
    }
    else {
        var options = env["jsgi.session.options"];
        var cookie = {};
        cookie.value = sessionData;
        if (options["expires_after"])
            cookie.expires = new Date() + options["expires_after"];

        var headers = jsgiResponse[1];

        Response.prototype.setCookie.call({
            addHeader: function(key, value){
                return Response.prototype.addHeader.call({ headers: headers}, key, value);
            }
        }, this.key, cookie);

        jsgiResponse[1] = headers;
    }

    return jsgiResponse;
}

Cookie.prototype.run = function(env){
    try {
        env["jsgi.session"] = loadSession.call(this, env);
    } catch (err) {
        env["jsgi.session"] = {};
    }
    env["jsgi.session.options"] = this.options;

    var jsgiResponse = this.app(env);

    return commitSession.call(this, env, jsgiResponse);
}

exports.Cookie = Cookie;