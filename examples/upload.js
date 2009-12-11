var Request = require("jack/request").Request,
    Response = require("jack/response").Response;

exports.app = function(request) {
    var wrappedRequest = new Request(request),
        res = new Response();
    
    if (wrappedRequest.isPost())
    {
        var params = wrappedRequest.params();
        for (var i in params)
        {
            res.setHeader("content-type", "text/plain");
            if (typeof params[i] === "string")
                res.write(i + " => " + params[i] + "\n");
            else
            {
                for (var j in params[i])
                    res.write("> " + j + " => " + params[i][j] + "\n");
            }
        }
    }
    else
    {
        res.write('<form action="" method="post" enctype="multipart/form-data">')
        res.write('<input type="file" name="foo" value="">');
        res.write('<input type="text" name="bar" value="baz">');
        res.write('<input type="submit" value="Upload">');
        res.write('</form>');
    }
    
    return res.finish();
}
