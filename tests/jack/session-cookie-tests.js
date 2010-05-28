
// -- nrstott Nathan Stott
// -- paulbaumgart Paul Baumgart
// -- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License

var ASSERT = require("test/assert");

var Request = require("jack/request").Request;
var Response = require("jack/response").Response;
var Cookie = require("jack/session/cookie").Cookie;
var MockRequest = require("jack/mock").MockRequest;

function helloApp(block) {
    return function(env) {
        block(env);
        return {
            status: 200,
            headers: { 'Content-Type': 'text/html'},
            body: ["hello"]
        };
    }
};

exports.testCreatesNewCookie = function() {
    var app = helloApp(function(env) {
        env["jsgi.session.load"]();
        env["jsgi.session"]["mykey"] = "myval";
    });

    var response = new MockRequest(Cookie(app, { secret: "secret" })).GET("/");

    ASSERT.isTrue(response.headers["Set-Cookie"] != undefined, "Should have defined 'Set-Cookie'");
    ASSERT.isTrue(response.headers["Set-Cookie"].match(/jsgi.session=/g) != null, "Should have created a new cookie");
}

exports.testRetrieveSessionValue = function() {
    var retrievedVal = null;
    var app = helloApp(function(env) {
        env["jsgi.session.load"]();
        retrievedVal = env["jsgi.session"]["mykey"];
    });

    new MockRequest(Cookie(app, {secret: "secret" })).GET("/", { "HTTP_COOKIE": "jsgi.session=%7B%22mykey%22%3A%22myval%22%7D--2m6GuCKsHcPfqaI2Yezhy7kdo%2Fg%3D" });

    ASSERT.isEqual("myval", retrievedVal);
}

if (require.main === module)
    require("test/runner").run(exports);

