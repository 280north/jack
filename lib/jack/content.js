
exports.Content = function (content, contentType) {
    return function (env) {
        return [
            200,
            {"Content-type": contentType || "text/html"},
            [content]
        ];
    };
};

