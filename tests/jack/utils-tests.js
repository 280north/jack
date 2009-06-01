var assert = require("test/assert"),
    Utils = require("jack/utils"),
    MockRequest = require("jack/mock").MockRequest,
    File = require("file"),
    BinaryIO = require("binary").BinaryIO;

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

// specify "should return nil if content type is not multipart" do
exports.testNotMultipart = function() {
    var env = MockRequest.envFor(null, "/", { "CONTENT_TYPE" : "application/x-www-form-urlencoded" });
    assert.isNull(Utils.parseMultipart(env));
}

// specify "should parse multipart upload with text file" do
exports.testMultipart = function() {
    var env = MockRequest.envFor(null, "/", multipart_fixture("text"));
    var params = Utils.parseMultipart(env);
    
    assert.isEqual("Larry", params["submit-name"]);
    assert.isEqual("text/plain", params["files"]["type"]);
    assert.isEqual("file1.txt", params["files"]["filename"]);
    assert.isEqual(
        "Content-Disposition: form-data; " +
        "name=\"files\"; filename=\"file1.txt\"\r\n" +
        "Content-Type: text/plain\r\n",
        params["files"]["head"]);
    assert.isEqual("files", params["files"]["name"]);
    //assert.isEqual("contents", params["files"]["tempfile"]);
}

//specify "should parse multipart upload with nested parameters" do
/*
exports.testMultipartNested = function() {
    var env = MockRequest.envFor(null, "/", multipart_fixture("nested"))
    var params = Utils.parseMultipart(env);
    
    assert.isEqual("Larry", params["foo"]["submit-name"]);
    assert.isEqual("text/plain", params["foo"]["files"]["type"]);
    assert.isEqual("file1.txt", params["foo"]["files"]["filename"]);
    assert.isEqual(
        "Content-Disposition: form-data; " +
        "name=\"foo[files]\"; filename=\"file1.txt\"\r\n" +
        "Content-Type: text/plain\r\n",
        params["foo"]["files"]["head"]);
    assert.isEqual("foo[files]", params["foo"]["files"]["name"]);
    assert.isEqual("contents", File.read(params["foo"]["files"]["tempfile"]));
}
//*/

// specify "should parse multipart upload with binary file" do
exports.testMultipartBinaryFile = function() {
    var env = MockRequest.envFor(null, "/", multipart_fixture("binary"));
    var params = Utils.parseMultipart(env);
    
    assert.isEqual("Larry", params["submit-name"]);
    assert.isEqual("image/png", params["files"]["type"]);
    assert.isEqual("rack-logo.png", params["files"]["filename"]);
    assert.isEqual(
        "Content-Disposition: form-data; " +
        "name=\"files\"; filename=\"rack-logo.png\"\r\n" +
        "Content-Type: image/png\r\n",
        params["files"]["head"]);
    assert.isEqual("files", params["files"]["name"]);
    assert.isEqual(26473, File.read(params["files"]["tempfile"], "b").length);
}

// specify "should parse multipart upload with empty file" do
exports.testMultipartEmptyFile = function() {
    var env = MockRequest.envFor(null, "/", multipart_fixture("empty"));
    var params = Utils.parseMultipart(env);
    
    assert.isEqual("Larry", params["submit-name"]);
    assert.isEqual("text/plain", params["files"]["type"]);
    assert.isEqual("file1.txt", params["files"]["filename"]);
    assert.isEqual(
        "Content-Disposition: form-data; " +
        "name=\"files\"; filename=\"file1.txt\"\r\n" +
        "Content-Type: text/plain\r\n",
        params["files"]["head"]);
    assert.isEqual("files", params["files"]["name"]);
    assert.isEqual("", File.read(params["files"]["tempfile"]));
}

// specify "should not include file params if no file was selected" do
exports.testMultipartNoFile = function() {
    var env = MockRequest.envFor(null, "/", multipart_fixture("none"));
    var params = Utils.parseMultipart(env);
    
    assert.isEqual("Larry", params["submit-name"]);
    assert.isNull(params["files"]);
    //params.keys.should.not.include "files"
}

// specify "should parse IE multipart upload and clean up filename" do
exports.testMultipartIEFile = function() {
    var env = MockRequest.envFor(null, "/", multipart_fixture("ie"));
    var params = Utils.parseMultipart(env);
    
    assert.isEqual("text/plain", params["files"]["type"]);
    assert.isEqual("file1.txt", params["files"]["filename"]);
    assert.isEqual(
        "Content-Disposition: form-data; " +
        "name=\"files\"; " +
        'filename="C:\\Documents and Settings\\Administrator\\Desktop\\file1.txt"' +
        "\r\nContent-Type: text/plain\r\n",
        params["files"]["head"]);
    assert.isEqual("files", params["files"]["name"]);
    assert.isEqual("contents", File.read(params["files"]["tempfile"], "b").decodeToString());
}

function multipart_fixture(name) {
    var file = multipart_file(name);
    var data = File.read(file, 'rb');
    
    var type = "multipart/form-data; boundary=AaB03x";
    var length = data.length;

    return {
        "CONTENT_TYPE" : type,
        "CONTENT_LENGTH" : length.toString(10),
        "jack.input" : new BinaryIO(data)
    }
}

function multipart_file(name) {
    return File.join(File.dirname(require.fileName), "multipart", name);
}