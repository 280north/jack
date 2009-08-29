var utils = require("./utils"),
    Hash = require("hash").Hash;

var Request = exports.Request = function(env) {
    if (env["jack.request"])
        return env["jack.request"];
        
    this.env = env;
    this.env["jack.request"] = this;
}

Request.prototype.body            = function() { return this.env["jack.input"];                };
Request.prototype.scheme          = function() { return this.env["jack.url_scheme"];           };
Request.prototype.scriptName      = function() { return this.env["SCRIPT_NAME"];               };
Request.prototype.pathInfo        = function() { return this.env["PATH_INFO"];                 };
Request.prototype.port            = function() { return parseInt(this.env["SERVER_PORT"], 10); };
Request.prototype.requestMethod   = function() { return this.env["REQUEST_METHOD"];            };
Request.prototype.queryString     = function() { return this.env["QUERY_STRING"];              };
Request.prototype.referer         = function() { return this.env["HTTP_REFERER"];              };
Request.prototype.referrer        = Request.prototype.referer;
Request.prototype.contentLength   = function() { return parseInt(this.env["CONTENT_LENGTH"], 10); };
Request.prototype.contentType     = function() { return this.env["CONTENT_TYPE"];              };

Request.prototype.host = function() {
    // Remove port number.
    return (this.env["HTTP_HOST"] || this.env["SERVER_NAME"]).replace(/:\d+\z/g, "");
}
    
Request.prototype.isGet           = function() { return this.requestMethod() === "GET";        };
Request.prototype.isPost          = function() { return this.requestMethod() === "POST";       };
Request.prototype.isPut           = function() { return this.requestMethod() === "PUT";        };
Request.prototype.isDelete        = function() { return this.requestMethod() === "DELETE";     };
Request.prototype.isHead          = function() { return this.requestMethod() === "HEAD";       };

Request.prototype.GET = function() {
    // cache the parsed query:
    if (this.env["jack.request.query_string"] !== this.queryString()) {
        this.env["jack.request.query_string"] = this.queryString();
        this.env["jack.request.query_hash"] = utils.parseQuery(this.queryString());
    }
    
    if (arguments.length > 0)
        return this.env["jack.request.query_hash"][arguments[0]];
        
    return this.env["jack.request.query_hash"];
}

Request.prototype.POST = function() {
    var hash = {};
    if (this.env["jack.request.form_input"] === this.env["jack.input"])
        hash = this.env["jack.request.form_hash"];
    // TODO: implement hasFormData
    else if (true || this.hasFormData()) {
        this.env["jack.request.form_input"] = this.env["jack.input"];
        this.env["jack.request.form_hash"] = utils.parseMultipart(this.env);
        if (!this.env["jack.request.form_hash"]) {
            this.env["jack.request.form_vars"] = this.env["jack.input"].read().decodeToString("utf-8");
            this.env["jack.request.form_hash"] = utils.parseQuery(this.env["jack.request.form_vars"]);
            //this.env["jack.input"].rewind();
        }
        hash = this.env["jack.request.form_hash"];
    }
    
    if (arguments.length > 0)
        return hash[arguments[0]];
    
    return hash;
}

Request.prototype.params = function() {
    if (!this.env["jack.request.params_hash"])
        this.env["jack.request.params_hash"] = Hash.merge(this.GET(), this.POST());

    if (arguments.length > 0)
        return this.env["jack.request.params_hash"][arguments[0]];
            
    return this.env["jack.request.params_hash"];
}

Request.prototype.cookies = function() {
    if (!this.env["HTTP_COOKIE"]) return {};

    if (this.env["jack.request.cookie_string"] != this.env["HTTP_COOKIE"])  {
        this.env["jack.request.cookie_string"] = this.env["HTTP_COOKIE"]
        // According to RFC 2109:
        // If multiple cookies satisfy the criteria above, they are ordered in
        // the Cookie header such that those with more specific Path attributes
        // precede those with less specific. Ordering with respect to other
        // attributes (e.g., Domain) is unspecified.
        var hash = this.env["jack.request.cookie_hash"] = utils.parseQuery(this.env["HTTP_COOKIE"], /[;,]/g);
        for (var k in hash)
            if (Array.isArray(hash[k]))
                hash[k] = hash[k][0];
    }

    return this.env["jack.request.cookie_hash"];
}

Request.prototype.relativeURI = function() {
    var qs = this.queryString();
    
    if (qs) {
        return this.pathInfo() + "?" + qs;
    } else {
        return this.pathInfo();
    }
}

Request.prototype.uri = function() {
    var scheme = this.scheme(),
        port = this.port(),
        uri = scheme + "://" + this.host();

    if ((scheme == "https" && port != 443) || (scheme == "http" && port != 80)) {
        url = uri + port;
    }

    return uri + this.relativeURI();
}

var XHR_RE = new RegExp("XMLHttpRequest", "i");

/**
 * http://www.dev411.com/blog/2006/06/30/should-there-be-a-xmlhttprequest-user-agent
 */
Request.prototype.isXHR = Request.prototype.isXMLHTTPRequest = function() {
    return XHR_RE.test(this.env["HTTP_X_REQUESTED_WITH"]);
}
