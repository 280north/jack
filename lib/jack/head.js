var Head = exports.Head = function(app) {
    return function(request) {
        var response = app(request);

        if (request.method === "HEAD")
            response.body = [];
            
        return response;
    }
}
