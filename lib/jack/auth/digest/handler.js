/*
 * Copyright Neville Burnell
 * See http://github.com/cloudwork/jack/lib/jack/auth/README.md for license
 *
 * Acknowledgements:
 * Inspired by Rack::Auth
 * http://github.com/rack/rack
 */

var update = require('hash').Hash.update,
    md5 = require('md5'),
    base16 = require("base16"),
    AbstractHandler = require('jack/auth/abstract/handler').Handler,
    DigestRequest = require("jack/auth/digest/request").Request,
    DigestParams = require('jack/auth/digest/params'),
    DigestNonce = require('jack/auth/digest/nonce');

/////////////////
// Digest helpers
/////////////////

var base16md5 = exports.base16md5 = function(s) {
    return base16.encode(md5.hash(s));
};

var H = base16md5;

var qopSupported = ['auth']; // 'auth-int'],

var A1 = function(request, password) {
    return [request.username, request.realm, password].join(':');
};

var A2 = function(request) {
    return [request.method, request.uri].join(':');
};

//var KD = function(secret, data) {
//    return H([secret, data].join(':'));
//};

var digest = exports.digest = function(request, password, passwordsHashed) {
    return H([H(A1(request, password)), request.nonce, request.nc, request.cnonce, request.qop, H(A2(request))].join(':'));

//    var passwordHash = passwordsHashed ? password : H(A1(auth, password));
//    return KD(passwordHash, [ auth.nonce, auth.nc, auth.cnonce, auth.qop, H(A2(auth)) ].join(':'));
};


/////////////////
// Digest handler
/////////////////

var Handler = exports.Handler = function(params) {
    AbstractHandler.call(this, params);
}

Handler.prototype = update(Object.create(AbstractHandler.prototype), {

    // run() is the JSGI handler
    run: function(app) {

        var self = this;

        return function(env) {

            var request = new DigestRequest(env);

            if (!request.authorizationKey()) return self.Unauthorized();
            if (!request.isDigest()) return self.BadRequest();
            if (!request.isCorrectUri()) return self.BadRequest();

            if (!self.isValidQOP(request)) return self.BadRequest();
            if (!self.isValidOpaque(request)) return self.Unauthorized();
            if (!self.isValidDigest(request)) return self.Unauthorized();

            if (!request.decodeNonce().isValid()) return self.Unauthorized();
            if (!request.decodeNonce().isFresh()) return self.Unauthorized(self.issueChallenge({stale: true}));

            env['REMOTE_USER'] = request.username;
            return app(env);
        }
    },

    params: function(options) {
        return update(options || {}, {
            realm: this.realm,
            nonce: new DigestNonce.Nonce().toString(),
            opaque: H(this.opaque),
            qop: qopSupported.join(',')
        });
    },

    issueChallenge: function(options) {
        return "Digest " + DigestParams.toString(this.params(options));
    },

    isValidQOP: function(request) {
        return qopSupported.indexOf(request.qop) != -1;
    },

    isValidOpaque: function(request) {
        return H(this.opaque) == request.opaque;
    },

    isValidDigest: function(request) {
        return digest(request, this.getPassword(request.username), this.passwordsHashed) == request.response;
    }
});

/********************************************************
 *  Basic Auth Middleware
 ********************************************************/

exports.Middleware = function(app, options) {
    return new Handler(options).run(app);
};