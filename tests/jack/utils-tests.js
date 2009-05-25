var assert = require("test/assert"),
    Utils = require("jack/utils");

exports.testUnescape = function() {
    assert.isEqual("fo<o>bar", Utils.unescape("fo%3Co%3Ebar"));
    assert.isEqual("a space", Utils.unescape("a+space"));
    assert.isEqual("a space", Utils.unescape("a%20space"));
    assert.isEqual("q1!2\"'w$5&7/z8)?\\", Utils.unescape("q1%212%22%27w%245%267%2Fz8%29%3F%5C"));
}

exports.testParseQuery = function() {
    assert.isSame({"foo" : "bar"}, Utils.parseQuery("foo=bar"));
    assert.isSame({"foo" : ["bar", "quux"]}, Utils.parseQuery("foo=bar&foo=quux"));
    assert.isSame({"foo" : "1", "bar" : "2"}, Utils.parseQuery("foo=1&bar=2"));
    assert.isSame({"my weird field" : "q1!2\"'w$5&7/z8)?"}, Utils.parseQuery("my+weird+field=q1%212%22%27w%245%267%2Fz8%29%3F"));
    assert.isSame({"foo=baz" : "bar"}, Utils.parseQuery("foo%3Dbaz=bar"));
}
