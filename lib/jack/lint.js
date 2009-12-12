var utils = require("./utils"),
    HashP = require("hashp").HashP;

var Lint = exports.Lint = function(app) {
    return function(request) {
        return (new Lint.Context(app)).run(request);
    }
}

Lint.Context = function(app) {
    this.app = app;
}

Lint.Context.prototype.run = function(request) {
    if (!request)
        throw new Error("No request environment provided");
    
    this.checkRequest(request);
    
    var response = this.app(request);
    
    this.body = response.body;
    
    if (typeof this.body === "string")
        throw new Error("Body must implement forEach, String support deprecated.");

    this.checkStatus(response.status);
    this.checkHeaders(response.headers);
    this.checkContentType(response.status, response.headers);
    this.checkContentLength(response.status, response.headers, request);
    
    return {
        status : response.status,
        headers : response.headers,
        body : this
    };
}

Lint.Context.prototype.forEach = function(block) {
    this.body.forEach(function(part) {
        if (part === null || part === undefined || typeof part.toByteString !== "function")
            throw new Error("Body yielded value that can't be converted to ByteString ("+(typeof part)+","+(typeof part.toByteString)+"): " + part);
        block(part);
    });
}

Lint.Context.prototype.close = function() {
    if (this.body.close)
        return this.body.close();
}

Lint.Context.prototype.checkRequest = function(request) {
    if (request && typeof request !== "object" || request.constructor !== Object)
        throw new Error("request is not a hash");
    
    ["method","serverName","serverPort","queryString","input","scheme","jsgi"
    ].forEach(function(key) {
        if (request[key] === undefined)
            throw new Error("request missing required key " + key);
    });
    
    ["version","errors","multithread","multiprocess","runOnce","ext"
    ].forEach(function(key) {
        if (request.jsgi[key] === undefined)
            throw new Error("request.jsgi missing required key " + key);
    })
    
    // The request environment must not contain HTTP_* keys
    for (var key in request) {
        if (key.indexOf("HTTP_") === 0)
            throw new Error("request contains 0.2 header key: " + key);
    };
    
    /* FIXME
    // The CGI keys (named without a period) must have String values.
    for (var key in request)
        if (key.indexOf(".") == -1)
            if (typeof request[key] !== "string")
                throw new Error("request variable " + key + " has non-string value " + request[key]);
    */
    //TODO request.version must be an array of Integers
    // * <tt>jsgi.version</tt> must be an array of Integers.
    if (typeof request.jsgi.version !== "object" && !Array.isArray(request.jsgi.version))
        throw new Error("request.jsgi.version must be an Array, was " + request.jsgi.version);
        
    // * <tt>request.scheme</tt> must either be +http+ or +https+.
    if (request.scheme !== "http" && request.scheme !== "https")
        throw new Error("request.scheme unknown: " + request.scheme);
    
    // * There must be a valid input stream in <tt>request.input</tt>.
    this.checkInput(request.input);
    // * There must be a valid error stream in <tt>request.jsgi.errors</tt>.
    this.checkError(request.jsgi.errors);
    
    // * The <tt>REQUEST_METHOD</tt> must be a valid token.
    if (!(/^[0-9A-Za-z!\#$%&'*+.^_`|~-]+$/).test(request.method))
        throw new Error("request.method unknown: " + request.method);

    // * The <tt>SCRIPT_NAME</tt>, if non-empty, must start with <tt>/</tt>
    if (request.scriptName && request.scriptName.charAt(0) !== "/")
        throw new Error("request.scriptName must start with /");
    
    // * The <tt>PATH_INFO</tt>, if non-empty, must start with <tt>/</tt>
    if (request.pathInfo && request.pathInfo.charAt(0) !== "/")
        throw new Error("request.pathInfo must start with /");
    
    // * The <tt>CONTENT_LENGTH</tt>, if given, must consist of digits only.
    if (request.headers["content-length"] !== undefined && !(/^\d+$/).test(request.headers["content-length"]))
        throw new Error("Invalid content-length: " + request.headers["content-length"]);

    // * One of <tt>scriptName</tt> or <tt>pathInfo</tt> must be
    //   set.  <tt>pathInfo</tt> should be <tt>/</tt> if
    //   <tt>scriptName</tt> is empty.
    if (request.scriptName === undefined && request.pathInfo === undefined)
        throw new Error("One of scriptName or pathInfo must be set (make pathInfo '/' if scriptName is empty)")
        
    //   <tt>scriptName</tt> never should be <tt>/</tt>, but instead be empty.
    if (request.scriptName === "/")
        throw new Error("scriptName cannot be '/', make it '' and pathInfo '/'")
}
Lint.Context.prototype.checkInput = function(input) {
    // FIXME:
    /*["gets", "forEach", "read"].forEach(function(method) {
        if (typeof input[method] !== "function")
            throw new Error("jsgi.input " + input + " does not respond to " + method);
    });*/
}
Lint.Context.prototype.checkError = function(error) {
    ["print", "write", "flush"].forEach(function(method) {
        if (typeof error[method] !== "function")
            throw new Error("jsgi.error " + error + " does not respond to " + method);
    });
}
Lint.Context.prototype.checkStatus = function(status) {
    if (!status >= 100)
        throw new Error("Status must be integer >= 100");
}
Lint.Context.prototype.checkHeaders = function(headers) {
    for (var key in headers) {
        var value = headers[key];
        // The header keys must be Strings.
        if (typeof key !== "string")
            throw new Error("header key must be a string, was " + key);
            
        // The header must not contain a +Status+ key,
        if (key.toLowerCase() === "status")
            throw new Error("header must not contain Status");
        // contain keys with <tt>:</tt> or newlines in their name,
        if ((/[:\n]/).test(key))
            throw new Error("header names must not contain : or \\n");
        // contain keys names that end in <tt>-</tt> or <tt>_</tt>,
        if ((/[-_]$/).test(key))
            throw new Error("header names must not end in - or _");
        // but only contain keys that consist of
        // letters, digits, <tt>_</tt> or <tt>-</tt> and start with a letter.
        if (!(/^[a-zA-Z][a-zA-Z0-9_-]*$/).test(key))
            throw new Error("invalid header name: " + key);
        // The values of the header must be a string or respond to #forEach.
        if (typeof value !== "string" && typeof value.forEach !== "function")
            throw new Error("header values must be strings or response to forEach. The value of '" + key + "' is invalid.") //FIXME
            
        value.split("\n").forEach(function(item) {
            // must not contain characters below 037.
            if ((/[\000-\037]/).test(item))
                throw new Error("invalid header value " + key + ": " + item);
        });
    }
}
Lint.Context.prototype.checkContentType = function(status, headers) {
    var contentType = headers["content-type"],
        noBody = utils.STATUS_WITH_NO_ENTITY_BODY(parseInt(status));
    
    if (noBody && contentType)
        throw new Error("A content-type header found in " + status + " response, not allowed");
    if (!noBody && !contentType)
        throw new Error("No content-type header found");
}
Lint.Context.prototype.checkContentLength = function(status, headers, request) {
    var chunked_response = (HashP.includes(headers, "transfer-encoding") && HashP.get(headers, "transfer-encoding") !== 'identity');
    
    var value = headers["content-length"];
    if (value) {
        // There must be a <tt>content-length</tt>, except when the
        // +Status+ is 1xx, 204 or 304, in which case there must be none
        // given.
        if (utils.STATUS_WITH_NO_ENTITY_BODY(parseInt(status)))
            throw new Error("A content-length header found in " + status + " response, not allowed");
        
        if (chunked_response)
            throw new Error("A content-length header should not be used if body is chunked");
        
        if (typeof value.forEach === "function")
            throw new Error("A content-length header value must be be singular")
        
        var bytes = 0,
            string_body = true;
        
        this.body.forEach(function(part) {
            if (typeof part !== "string")
                string_body = false;
            bytes += (part && part.length) ? part.length : 0;
        });
        
        if (request.method === "HEAD")
        {
            if (bytes !== 0)
                throw new Error("Response body was given for HEAD request, but should be empty");
        }
        else if (string_body)
        {
            if (value !== bytes.toString())
                throw new Error("The content-length header was " + value + ", but should be " + bytes);
        }
    }
    else {
        if (!chunked_response && (typeof this.body === "string" || Array.isArray(this.body)))
            if (!utils.STATUS_WITH_NO_ENTITY_BODY(parseInt(status)))
                throw new Error('No content-length header found');
    }
}
