var assert = require("test/assert"),
    Request = require("jack/request").Request,
    Response = require("jack/response").Response,
    MockRequest = require("jack/mock").MockRequest,
    Cookie = require("jack/session/cookie").Cookie;

exports.testCreatesNewCookie = function(){
    var env = MockRequest.envFor(null, "", {});

    var cookie = new Cookie(function(env) {
        env["jsgi.session"]["mykey"] = "myval";
        return new Response(env).finish();
    }, { secret: "secret" });

    var response = new MockRequest(function(env) {
        return cookie.run(env);
    }).GET("/");

    assert.isTrue(response.headers["Set-Cookie"] != undefined, "Should have defined 'Set-Cookie'");
    assert.isTrue(response.headers["Set-Cookie"].match(/jsgi.session=/g) != null, "Should have created a new cookie");
}

exports.testRetrieveSessionValue = function(){
    var retrievedVal = null;

    new MockRequest(function(env){
        return new Cookie(function(env) {
            retrievedVal = env["jsgi.session"]["mykey"];
            return new Response(env).finish();
        },{ secret: "secret" }).run(env);
    }).GET("/", { "HTTP_COOKIE": "jsgi.session=%7B%22mykey%22%3A%22myval%22%7D--2m6GuCKsHcPfqaI2Yezhy7kdo%2Fg%3D" });

    assert.isEqual("myval", retrievedVal);
}

