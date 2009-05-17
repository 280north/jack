#!/usr/bin/env jackup

exports.app = function(env) {
    return [200, {"Content-Type":"text/plain"}, "Hello world!"];
}

exports.development = function(app) {
    return require("jack/commonlogger").CommonLogger(
        require("jack/showexceptions").ShowExceptions(
            require("jack/lint").Lint(
                require("jack/contentlength").ContentLength(app))));
}
