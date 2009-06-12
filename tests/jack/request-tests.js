var assert = require("test/assert"),
    Request = require("jack/request").Request,
    MockRequest = require("jack/mock").MockRequest;

exports.testParseCookies = function() {
    var req = new Request(MockRequest.envFor(null, "", { "HTTP_COOKIE" : "foo=bar;quux=h&m" }));
    
    assert.isSame({"foo" : "bar", "quux" : "h&m"}, req.cookies());
    assert.isSame({"foo" : "bar", "quux" : "h&m"}, req.cookies());
    delete req.env["HTTP_COOKIE"];
    assert.isSame({}, req.cookies());
}

exports.testParseCookiesRFC2109 = function() {
    var req = new Request(MockRequest.envFor(null, "", { "HTTP_COOKIE" : "foo=bar;foo=car" }));
    
    assert.isSame({"foo" : "bar"}, req.cookies());
}
