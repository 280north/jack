---
layout: default
title: getting started with jack
---

Getting Started With Jack
=========================

Jack currently supports the Jetty (and other servlet containers) and Simple webservers using Rhino, and it should be easy to integrate with other JavaScript interpreters and web servers. It also has preliminary support for v8cgi.

The current Jack implementation uses Narwhal for support. Narwhal is a JavaScript standard library (based on the ServerJS standard: https://wiki.mozilla.org/ServerJS) and is located at [http://github.com/tlrobinson/narwhal/](http://github.com/tlrobinson/narwhal/)

To start working with Jack, checkout the Jack and Narhwal repositories into the same directory (they currently use relative path symlinks to integrate) and add narwhal/bin to your PATH environment variable (e.x. "export PATH=$PATH:narwhal/bin").

Run one of the following examples:

    jackup jack/example/example.js
    jackup jack/example/comet.js
    
Or if the current directory contains "jackconfig.js" you can just run "jackup"

    jackup

This is equivalent to:

    jackup ./jackconfig.js

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
