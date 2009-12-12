var CommonLogger = exports.CommonLogger = function(app, logger) {
    return function(request) {
        return (new CommonLogger.Context(app, logger)).run(request);
    }
}

CommonLogger.Context = function(app, logger) {
    this.app = app;
    this.logger = logger || this;
}

CommonLogger.Context.prototype.run = function(request) {
    this.request = request;
    this.time = new Date();
    
    var result = this.app(request);

    this.status  = result.status;
    this.headers = result.headers;
    this.body    = result.body;

    result.body = this;

    return result;
}

CommonLogger.Context.prototype.log = function(string) {
    this.request.jsgi.errors.print(string);
    this.request.jsgi.errors.flush();
}

CommonLogger.Context.prototype.forEach = function(block) {
    var length = 0;
    
    this.body.forEach(function(part) {
        length += part.toByteString().length;
        block(part);
    });

    var now = new Date();

    // Common Log Format: http://httpd.apache.org/docs/1.3/logs.html#common
    // lilith.local - - [07/Aug/2006 23:58:02] "GET / HTTP/1.1" 500 -
    //             %{%s - %s [%s] "%s %s%s %s" %d %s\n} %
    
    var address     = this.request.headers['x-forwarded-for'] || this.request.remoteAddr || "-",
        user        = this.request.remoteUser || "-",
        timestamp   = CommonLogger.formatDate(now),
        method      = this.request.method,
        path        = (this.request.scriptName||"") + (this.request.pathInfo||""),
        query       = this.request.queryString ? "?" + this.request.queryString : "",
        version     = "HTTP/" + this.request.version.join("."),
        status      = String(this.status).substring(0,3),
        size        = length === 0 ? "-" : length.toString(),
        duration    = now.getTime() - this.time.getTime();
    
    var stringToLog = address+' - '+user+' ['+timestamp+'] "'+method+' '+path+query+' '+version+'" '+status+' '+size
    //stringToLog += ' '+duration;
    
    this.logger.log(stringToLog);
}

CommonLogger.formatDate = function(date) {
    var d = date.getDate(),
        m = CommonLogger.MONTHS[date.getMonth()],
        y = date.getFullYear(),
        h = date.getHours(),
        mi = date.getMinutes(),
        s = date.getSeconds();
        
    // TODO: better formatting
    return (d<10?"0":"")+d+"/"+m+"/"+y+" "+
        (h<10?"0":"")+h+":"+(mi<10?"0":"")+mi+":"+(s<10?"0":"")+s;
}

CommonLogger.MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
