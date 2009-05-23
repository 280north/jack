
var ContentLength = require('jack/contentlength').ContentLength;

exports.app = new ContentLength(function (env) {
    return [200, {"content-type": "text/plain"}, ["Hello, World!"]];
});

if (require.id = require.main)
    require('jackup').main([require.id].concat(system.args));

