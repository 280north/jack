var HashP = require("hashp").HashP;

var Response = exports.Response = function(status, headers, body) {
    var that = this;
    
    this.status = status || 200;
    this.headers = HashP.merge({"Content-Type" : "text/html"}, headers);
    
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
    
    if (typeof value === "object") {
        if (value.domain) meta += "; domain=" + value.domain ;
        if (value.path) meta += "; path=" + value.path;
        if (value.expires) meta += "; expires=" + value.expires.toGMTString();
        if (value.secure) meta += "; secure";
        if (value.httpOnly) meta += "; HttpOnly";
        value = value.value;
    }

    if (Array.isArray(value)) {
        for (var i in value) cookie += encodeURIComponent(value[i]);
    } else {
        cookie += encodeURIComponent(value);
    }
    
    cookie = cookie + meta;
    
    this.addHeader("Set-Cookie", cookie);
}

Response.prototype.deleteCookie = function() {
    // FIXME: implement me!
    throw new Error("Unimplemented method: Response.prototype.deleteCookie");
}

Response.prototype.redirect = function(location, status) {
    this.status = status || 302;
    this.addHeader("Location", location);
    this.write('Go to <a href="' + location + '">' + location + "</a>");
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
        return [this.status, this.headers, []];
    }
    else
    {
        return [this.status, this.headers, this];
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

Response.redirect = function(location, status) {
    location = encodeURI(location);
    return [status || 302, { "Location": location }, ['Go to <a href="' + location + '">' + location + "</a>"]];
}
