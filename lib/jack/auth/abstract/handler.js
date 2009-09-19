/*
 * Copyright Neville Burnell
 * See http://github.com/cloudwork/jack/lib/jack/auth/README.md for license
 *
 * Acknowledgements:
 * Inspired by Rack::Auth
 * http://github.com/rack/rack
 */

var update = require("hash").Hash.update;

var Handler = exports.Handler = function(params) {
    if (params) update(this, params);
};

Handler.prototype = {
    
    Unauthorized: function(challenge) {
        return {
            status: 401,
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length' : '0',
                'WWW-Authenticate': challenge || this.issueChallenge()
            },
            body: []
        };
    },

    BadRequest: function() {
        return {
            status: 400,
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length' : '0'
            },
            body: []
        };
    },

    isValid: function() {
        throw "jack.auth.abstract.handler.isValid(): override required!";
    }
};