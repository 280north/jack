Jack: a minimal webserver interface for JavaScript
==================================================

Jack is a webserver interface inspired by Ruby's Rack (http://rack.rubyforge.org/) and Python's WSGI (http://www.wsgi.org/), with adjustments to suit JavaScript where appropriate.

It provides a common interface between web servers and web applications or frameworks written in JavaScript. At it's core, Jack is simply a protocol that defines an interface servers and applications can conform to. It also consists of an implementation of a set of handlers (to connect to web servers), adapters (to connect to JavaScript frameworks and applications), middleware (to intercept and manipulate requests or responses), and utilities (to make using Jack easier) implemented in JavaScript.

### Homepage:

* http://jackjs.org/

### Source & Download:

* http://github.com/tlrobinson/jack/
* http://github.com/tlrobinson/narwhal/

### Mailing list:

* http://groups.google.com/group/jack-js

### IRC:

* \#jack-js on irc.freenode.net
* \#serverjs on irc.freenode.net (unofficial)


Getting Started
---------------

Jack currently supports the Jetty (and other servlet containers) and Simple webservers using Rhino, and it should be easy to integrate with other JavaScript interpreters and web servers. It also has preliminary support for v8cgi.

The current Jack implementation uses Narwhal for support. Narwhal is a JavaScript standard library (based on the ServerJS standard: https://wiki.mozilla.org/ServerJS) and is located at http://github.com/tlrobinson/narwhal/

To start working with Jack, checkout the Jack and Narhwal repositories into the same directory (they currently use relative path symlinks to integrate) and add narwhal/bin to your PATH environment variable (e.x. "export PATH=$PATH:narwhal/bin").

Run one of the following examples:

    jackup jack/example/example.js
    jackup jack/example/comet.js
    
Or if the current directory contains "jackconfig.js" you can just run "jackup"

    jackup

A Jackup configuration file is simply a normal module that exports a function called "app":

    exports.app = function(env) {
        return [200, {"Content-Type":"text/plain"}, ["Hello world!"]];
    }
    
If the module also exports a function with the same name as the chosen environment (using the "-E" command line option, "development" by default) that function will be used to add middleware to your application. This allows you to define custom sets of middleware for different environments. For example:

    exports.development = function(app) {
        return Jack.CommonLogger(Jack.ShowExceptions(Jack.Lint(Jack.ContentLength(app))));
    }

To see other options of Jackup, use the "-h" option:

    jackup -h


Writing Jack Applications
-------------------------

A Jack application is simply a JavaScript function. It takes an environment argument, and it should return an array containing three elements: the status code (an integer), the headers values (a hash), and a body object (anything that responds to the "forEach" method which yields objects that have a "toBinary()" method).

We have extended JavaScript String, and Binary respond to "toBinary" (so they are valid "body" responses), thus the following is a valid Jack application:

    function(env) {
        return [200, {"Content-Type":"text/plain"}, ["Hello world!"]];
    }

If you need something more complex with extra state, you can provide a "constructor" in the form of a function

    MyApp = function(something) {
        return function(env) {
            return [200, {"Content-Type":"text/plain"}, ["Hello " + this.something + "!"]];
        }
    }

    app = MyApp("Fred");

Be careful to ensure your application and middleware is thread-safe if you plan to use a multithreaded server like Jetty and Simple.

The first (and only) argument to the application method is the "environment" object, which contains a number of properties. Many of the standard CGI environment variables are included, as well as some Jack specific properties which are prefixed with "jack.".

The Request and Response objects are not part of the Jack specification, but may be helpful in parsing request parameters, and building a valid response. They are used as follows:

    var req = new Jack.Request(env);
    var name = req.GET("name");

    var resp = new Jack.Response();
    resp.setHeader("Content-Type", "text/plain");
    resp.write("hello ");
    resp.write(name);
    resp.write("!");
    return resp.finish(); // equivalent to returning [200, {"Content-Type" : "text/plain"}, "hello "+name+"!"]


Writing Jack Middleware
-----------------------

Jack middleware performs pre or post processing on requests and responses, such as logging, authentication, etc. Most Jack middleware, by convention, is a function that takes in one argument, "app" (which will be a Jack application) and creates a Jack application (i.e. another function that takes in an "env" argument and returns a three element array). In the returned Jack application it will typically optionally do some preprocessing on the request, followed by calling the "app" that was provided, optionally followed by some post processing.

For example, the "Head" middleware calls the original "app", then checks to see if the request HTTP method was "HEAD". If so, it clears the body of response before returning it, since HEAD requests shouldn't have a response body:

    function Head(app) {
        return function(env) {
            var result = app(env);
            if (env["REQUEST_METHOD"] === "HEAD")
                result[2] = [];
            return result;
        }
    }

This style of middleware makes use of a closure to "remember" the original app.

A more complicated middleware might need to perform post-processing on the body contents. A common pattern is to call the app, then store the body as a property of a "context" and return the context itself in place of the body. It defines a "forEach" method on the context, which proxies to the stored body property. It is important to proxy the response body rather than buffer the entire response when dealing with streaming applications, otherwise the middleware will prevent the app from streaming. A good example of this pattern is the CommonLogger middleware, which does this in order to calculate the body length for logging.


Caveats
-------

### Thread safety:

Jack is simply a protocol, which is inherently thread safe. Additionally, all these components should be thread-safe.

### Completeness:

The basic functionality of the handlers and middleware is complete. Some things are missing though.

### API stability:

The Jack protocol will likely not change significantly, but some of the details may. Keep up to date on the mailing list mentioned above.


Jack vs. Rack
-------------

Jack applications are simply functions, rather than objects that respond to the "call" method.


Jack vs. WSGI
-------------

WSGI uses a "start_response" function to set the HTTP status code and headers, rather than returning them in an array. Jack is similar to WSGI 2.0: http://www.wsgi.org/wsgi/WSGI_2.0


Component Status
----------------

The following components essentially match those in Rack.

### Handlers:

* Servlet: complete (?), for use with Jetty on Rhino, or other servlet container.
* Jetty: complete (?), simple wrapper for Jetty using Servlet handler (http://www.mortbay.org/jetty/)
* Simple: complete (?), for use with the Simple webserver (http://www.simpleframework.org/)
* V8CGI: complete (?), for use with the v8cgi project (http://code.google.com/p/v8cgi/)

### Middleware:

* Cascade: complete
* CommonLogger: complete
* ContentLength: complete
* Deflater: missing
* Directory: missing
* File: complete
* Head: complete
* JSONP: complete
* Lint: mostly complete (needs stream wrappers)
* MethodOverride: complete
* Mock: missing
* Recursive: missing
* ShowExceptions: simple version complete, needs better HTML output
* ShowStatus: missing
* Static: complete
* URLMap: complete

### Utilities:

* jackup: complete (?)
* Request: mostly complete
* Response: mostly complete


Contributors
------------

* Tom Robinson
* Kris Kowal
* George Moschovitis


Acknowledgments
---------------

This software was influenced by Rack, written by Christian Neukirchen.

http://rack.rubyforge.org/


License
-------

Copyright (c) 2009 Thomas Robinson <tlrobinson.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

