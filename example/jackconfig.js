var Jack = require("jack");

exports.app = function(env) {
    return [200, {"Content-Type":"text/plain"}, "Hello world!"];
}

exports.development = function(app) {
    return Jack.CommonLogger(Jack.ShowExceptions(Jack.Lint(Jack.ContentLength(app))));
}
