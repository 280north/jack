var HashP = require("hashp").HashP;

var Response = exports.Response = function(status, headers, body) {
    var that = this;
    
    if (typeof arguments[0] === "object") {
        headers = arguments[0].headers;
        body = arguments[0].body;
        status = arguments[0].status;
    }
    
    this.status = status || 200;
    if (this.status !== 304) {
        this.headers = HashP.merge({
            "Content-Type" : "text/html",
            "Content-Length" : "0"
        }, headers);
    } else {
        this.headers = headers || {};
    }
    
    this.body = [];
    this.length = 0;
    this.writer = function(bytes) { that.body.push(bytes); };
    
    this.block = null;
    
    if (body)
    {
        if (typeof body.forEach === "function")
        {
            body.forEach(function(part) {
                that.write(part);
            });
        }
        else
            throw new Error("iterable required");
    }
}

Response.prototype.setHeader = function(key, value) {
    HashP.set(this.headers, key, value);
}

Response.prototype.addHeader = function(key, value) {
    var header = HashP.get(this.headers, key);
    
    if (!header)
        HashP.set(this.headers, key, value);
    else if (typeof header === "string")
        HashP.set(this.headers, key, [header, value]);
    else // Array
        header.push(value);
}

Response.prototype.getHeader = function(key) {
    return HashP.get(this.headers, key);
}

Response.prototype.unsetHeader = function(key) {
    return HashP.unset(this.headers, key);
}

Response.prototype.setCookie = function(key, value) {
    var domain, path, expires, secure, httponly;
    
    var cookie = encodeURIComponent(key) + "=", 
        meta = "";
    
    if (typeof value === "object" && !Array.isArray(value)) {
        if (value.domain) meta += "; domain=" + value.domain ;
        if (value.path) meta += "; path=" + value.path;
        if (value.expires) meta += "; expires=" + value.expires.toGMTString();
        if (value.secure) meta += "; secure";
        if (value.httpOnly) meta += "; HttpOnly";
        value = value.value;
    }

    if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++)
            cookie += encodeURIComponent(value[i]);
    } else {
        cookie += encodeURIComponent(value);
    }
    
    cookie = cookie + meta;
    
    this.addHeader("Set-Cookie", cookie);
}

Response.prototype.deleteCookie = function(key) {
    this.setCookie(key, { expires: 0 });
}

Response.prototype.redirect = function(location, status) {
    this.status = status || 302;
    this.addHeader("Location", location);
    this.write('Go to <a href="' + location + '">' + location + "</a>");
    return this;
}
    
Response.prototype.write = function(object) {
    var binary = object.toByteString('utf-8');
    this.writer(binary);
    this.length += binary.length;
    
    // TODO: or
    // this.writer(binary);
    // this.length += binary.byteLength();
    
    HashP.set(this.headers, "Content-Length", this.length.toString(10));
}

Response.prototype.finish = function(block) {
    this.block = block;
    
    if (this.status == 204 || this.status == 304)
    {
        HashP.unset(this.headers, "Content-Type");
        return {
            status : this.status,
            headers : this.headers,
            body : []
        };
    }
    else
    {
        return {
            status : this.status,
            headers : this.headers,
            body : this
        };
    }
}

Response.prototype.forEach = function(callback) {
    this.body.forEach(callback);

    this.writer = callback;
    if (this.block)
        this.block(this);
}

Response.prototype.close = function() {
    if (this.body.close)
        this.body.close();
}

Response.prototype.isEmpty = function() {
    return !this.block && this.body.length === 0;
}

/**
 * Constructs a redirect (30x).
 */
Response.redirect = function(location, status) {
    return new Response().redirect(location, status);
}

/**
 * Constructs a success (200) response.
 */
Response.ok = function() {
    return new Response();
};

/**
 * Constructs a created (201) response.
 */
Response.created = function(uri) {
    return new Response(201, { "Location": uri });
};

/**
 * Constructs a plain html response.
 */
Response.html = function(html, charset) {
    charset = charset || "utf-8";
    return new Response(
        200,
        { "Content-Type": "text/html; charset=" + charset },
        [html.toByteString(charset)]
    );
}
 
/**
 * Dumps the data object as a JSON string.
 */
Response.json = function(data) {
	if (typeof data !== "string")
	    data = JSON.stringify(data);
    return new Response(
        data.status || 200,
        { "Content-Type": "application/json" },
        [data.toByteString("utf-8")]
    );
}

/**
 * Constructs a JSONP response.
 * http://en.wikipedia.org/wiki/JSON#JSONP
 */
Response.jsonp = function(data, callback) {
	if (typeof data !== "string")
	    data = JSON.stringify(data);
    return new Response(
        data.status || 200,
        { "Content-Type": "application/javascript" },
        [(callback + "(" + data + ")").toByteString("utf-8")]
    );
}

/**
 * Constructs a chunked response.
 * Useful for streaming/comet applications.
 */
Response.chunked = function(fn) {
    return new Response(200, { "Transfer-Encoding": "chunked" }).finish(block);
}

/**
 * a 304 (Not modified) response.
 */
Response.notModified = function() {
    return new Response(304);
}

/**
 * A 404 (Not found) response.
 */
Response.notFound = function(msg) {
    return new Response(404, null, [msg || "Not found"]);
}

/**
 * A 401 (Unauthorized) response.
 */
Response.unauthorized = function(msg) {
    return new Response(401, null, [msg || "Unauthorized"]);
}

var AsyncResponse = exports.AsyncResponse = function(status, headers, body) {
    // set the buffer up first, since Response's constructor calls .write()
    this._buffer = [];
    
    this._callback  = null;
    this._errback   = null;
    
    Response.apply(this, arguments);
    
    this.body = { forEach : this.forEach.bind(this) };
}

AsyncResponse.prototype = Object.create(Response.prototype);

// this "write" gets overriden later by the callback provided to forEach
AsyncResponse.prototype.write = function(chunk) {
    this._buffer.push(chunk);
}

AsyncResponse.prototype.forEach = function(callback) {
    this._buffer.forEach(callback);
    this._buffer = null;
    
    this.write = callback;

    return { then : this.then.bind(this) };
}

AsyncResponse.prototype.then = function(callback, errback) {
    this._callback = callback;
    this._errback = errback;
}

AsyncResponse.prototype.close = function() {
    this._callback();
}
