/*
 * Copyright Neville Burnell
 * See http://github.com/cloudwork/jack/lib/jack/auth/README.md for license
 *
 * Acknowledgements:
 * Inspired by Rack::Auth
 * http://github.com/rack/rack
 */

var assert = require("test/assert"),
    Hash = require("hash").Hash,
    HashP = require("hashp").HashP,
    MockRequest = require("jack/mock").MockRequest,
    BasicHandler = require("jack/auth/basic/handler"),
    DigestNonce = require("jack/auth/digest/nonce"),
    DigestHandler = require("jack/auth/digest/handler"),
    DigestRequest = require("jack/auth/digest/request").DigestRequest,
    DigestParams = require("jack/auth/digest/params");

var pp = function(o){print(require('test/jsdump').jsDump.parse(o))};

var myRealm = "WallysWorld";

var openApp = function(env) {
    return {
        status: 200,
        headers: {'Content-Type': 'text/plain'},
        body: ["Hi " + env['REMOTE_USER']]
    };
}

var digestApp = DigestHandler.Middleware(openApp, {
    realm: myRealm,
    opaque: "this-should-be-secret",
    getPassword: function(username) {
        return {'Alice': 'correct-password'}[username];
    }
});

var digestAppWithHashedPasswords = DigestHandler.Middleware(openApp, {
    realm: myRealm,
    opaque: "this-should-be-secret",
    passwordsHashed: true,
    getPassword: function(username) {
        return {'Alice': DigestHandler.base16md5(["Alice", myRealm, "correct-password"].join(":"))}[username];
    }
});

var basicApp = BasicHandler.Middleware(openApp, {
    realm: myRealm,
    isValid: function(request) { return false }
});


/**********************************
 * helpers
 *********************************/

var doRequest = function(request, method, path, headers) {
    return request[method](path, headers || {});
}


var doRequestWithDigestAuth = function(request, method, path, username, password, options) {
    if (!options) options = {};

    var headers = {};

    if (options.input) {
        headers.input = options.input;
        delete options.input;
    }

    var response = doRequest(request, method, path, headers);
    if (response.status != 401) return response;

    if (options.wait) {
        var sleep = require('os-engine').sleep;  //sleep() is exported by the rhino engine
        if (sleep) sleep(options.wait);
        delete options.wait;
    }

    var challenge = HashP.get(response.headers, 'WWW-Authenticate').match(/digest (.*)/i).pop();

    var params = DigestParams.parse({
        username:   username,
        nc:         '00000001',
        cnonce:     'nonsensenonce',
        uri:        path,
        method:     method
    }, challenge);

    Hash.update(params, options);

    params.response =  DigestHandler.digest(params, password);
    HashP.set(headers, 'HTTP_AUTHORIZATION', "Digest "+DigestParams.toString(params));

    return doRequest(request, method, path, headers);
}

/********************************************************
 * assertions
 ********************************************************/

var assertDigestAuthChallenge = function(response){
    assert.eq(401,                  response.status);
    assert.eq('text/plain',         response.headers['Content-Type']);
    assert.eq('0',                  response.headers['Content-Length']);
    assert.isFalse(response.headers['WWW-Authenticate'] === undefined);
    assert.isTrue(response.headers['WWW-Authenticate'].search(/^Digest/) != -1);
    assert.eq(0,                    response.body.length);
}

var assertBadRequest = function(response) {
    assert.eq(400,                  response.status);
    assert.isTrue(response.headers['WWW-Authenticate'] === undefined);
}

/********************************************************
 * test Basic Auth as Jack middleware
 ********************************************************/

// should return application output for GET when correct credentials given
exports.testAcceptGetWithCorrectCredentials = function() {
    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'GET', '/', 'Alice', 'correct-password');

    assert.eq(200,                  response.status);
    assert.eq("Hi Alice",           response.body.toString());
};

// should return application output for POST when correct credentials given
exports.testAcceptPostWithCorrectCredentials = function() {
    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'POST', '/', 'Alice', 'correct-password');

    assert.eq(200,                  response.status);
    assert.eq("Hi Alice",           response.body.toString());
};

// should return application output for PUT when correct credentials given
exports.testAcceptPutWithCorrectCredentials = function() {
    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'PUT', '/', 'Alice', 'correct-password');

    assert.eq(200,                  response.status);
    assert.eq("Hi Alice",           response.body.toString());
};

// should challenge when no credentials are specified
exports.testChallengeWhenNoCredentials = function() {
    var request = new MockRequest(digestApp);
    var response = doRequest(request, 'GET', '/');
    assertDigestAuthChallenge(response);
};

// should challenge if incorrect username given
exports.testChallengeWhenIncorrectUsername = function() {
    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'GET', '/', 'Fred', 'correct-password');
    assertDigestAuthChallenge(response);
};

// should challenge if incorrect password given
exports.testChallengeWhenIncorrectPassword = function() {
    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'GET', '/', 'Alice', 'incorrect-password');
    assertDigestAuthChallenge(response);
};

// should return 400 Bad Request if incorrect scheme given
exports.testReturnBadRequestWhenIncorrectScheme = function() {
    var request = new MockRequest(digestApp);
    var response = doRequest(request, 'GET', '/', {'HTTP_AUTHORIZATION': 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=='});
    assertBadRequest(response);
};

// should return 400 Bad Request if incorrect uri given
exports.testReturnBadRequestWhenIncorrectUri = function() {
    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'GET', '/', 'Alice', 'correct-password', {uri: '/foo'});
    assertBadRequest(response);
};

// should return 400 Bad Request if incorrect qop given
exports.testReturnBadRequestWhenIncorrectQop = function() {
    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'GET', '/', 'Alice', 'correct-password', {qop: 'auth-int'});
    assertBadRequest(response);
};

// should challenge if stale nonce given
exports.testChallengeWhenStaleNonce = function() {
    DigestNonce.Nonce.prototype.timeLimit = 1; // 1 millisecond

    var request = new MockRequest(digestApp);
    var response = doRequestWithDigestAuth(request, 'GET', '/', 'Alice', 'correct-password', {wait: 1});

    assertDigestAuthChallenge(response);
    assert.isTrue(response.headers['WWW-Authenticate'].search(/stale=true/) != -1);

    //delete timeLimit for future tests
    delete DigestNonce.Nonce.prototype.timeLimit;    
};
/*
  setup do
    @request = Rack::MockRequest.new(protected_app)
  end

  def partially_protected_app
    Rack::URLMap.new({
      '/' => unprotected_app,
      '/protected' => protected_app
    })
  end

  def protected_app_with_method_override
    Rack::MethodOverride.new(protected_app)
  end

  def request(method, path, headers = {}, &block)
    response = @request.request(method, path, headers)
    block.call(response) if block
    return response
  end

  class MockDigestRequest
    def initialize(params)
      @params = params
    end
    def method_missing(sym)
      if @params.has_key? k = sym.to_s
        return @params[k]
      end
      super
    end
    def method
      @params['method']
    end
    def response(password)
      Rack::Auth::Digest::MD5.new(nil).send :digest, self, password
    end
  end

  specify 'should return application output if correct credentials given (hashed passwords)' do
    @request = Rack::MockRequest.new(protected_app_with_hashed_passwords)

    request_with_digest_auth 'GET', '/', 'Alice', 'correct-password' do |response|
      response.status.should.equal 200
      response.body.to_s.should.equal 'Hi Alice'
    end
  end

  specify 'should not require credentials for unprotected path' do
    @request = Rack::MockRequest.new(partially_protected_app)
    request 'GET', '/' do |response|
      response.should.be.ok
    end
  end

  specify 'should challenge when no credentials are specified for protected path' do
    @request = Rack::MockRequest.new(partially_protected_app)
    request 'GET', '/protected' do |response|
      assert_digest_auth_challenge response
    end
  end

  specify 'should return application output if correct credentials given for protected path' do
    @request = Rack::MockRequest.new(partially_protected_app)
    request_with_digest_auth 'GET', '/protected', 'Alice', 'correct-password' do |response|
      response.status.should.equal 200
      response.body.to_s.should.equal 'Hi Alice'
    end
  end

  specify 'realm as optional constructor arg' do
    app = Rack::Auth::Digest::MD5.new(unprotected_app, realm) { true }
    assert_equal realm, app.realm
  end
end
*/



/********************************************************
 * original ruby code for reference
 ********************************************************
require 'test/spec'

require 'rack/auth/digest/md5'
require 'rack/mock'

context 'Rack::Auth::Digest::MD5' do

  def realm
    'WallysWorld'
  end

  def unprotected_app
    lambda do |env|
      [ 200, {'Content-Type' => 'text/plain'}, ["Hi #{env['REMOTE_USER']}"] ]
    end
  end

  def protected_app
    app = Rack::Auth::Digest::MD5.new(unprotected_app) do |username|
      { 'Alice' => 'correct-password' }[username]
    end
    app.realm = realm
    app.opaque = 'this-should-be-secret'
    app
  end

  def protected_app_with_hashed_passwords
    app = Rack::Auth::Digest::MD5.new(unprotected_app) do |username|
      username == 'Alice' ? Digest::MD5.hexdigest("Alice:#{realm}:correct-password") : nil
    end
    app.realm = realm
    app.opaque = 'this-should-be-secret'
    app.passwords_hashed = true
    app
  end

  def partially_protected_app
    Rack::URLMap.new({
      '/' => unprotected_app,
      '/protected' => protected_app
    })
  end

  def protected_app_with_method_override
    Rack::MethodOverride.new(protected_app)
  end

  setup do
    @request = Rack::MockRequest.new(protected_app)
  end

  def request(method, path, headers = {}, &block)
    response = @request.request(method, path, headers)
    block.call(response) if block
    return response
  end

  class MockDigestRequest
    def initialize(params)
      @params = params
    end
    def method_missing(sym)
      if @params.has_key? k = sym.to_s
        return @params[k]
      end
      super
    end
    def method
      @params['method']
    end
    def response(password)
      Rack::Auth::Digest::MD5.new(nil).send :digest, self, password
    end
  end

  def request_with_digest_auth(method, path, username, password, options = {}, &block)
    request_options = {}
    request_options[:input] = options.delete(:input) if options.include? :input

    response = request(method, path, request_options)

    return response unless response.status == 401

    if wait = options.delete(:wait)
      sleep wait
    end

    challenge = response['WWW-Authenticate'].split(' ', 2).last

    params = Rack::Auth::Digest::Params.parse(challenge)

    params['username'] = username
    params['nc'] = '00000001'
    params['cnonce'] = 'nonsensenonce'
    params['uri'] = path

    params['method'] = method

    params.update options

    params['response'] = MockDigestRequest.new(params).response(password)

    request(method, path, request_options.merge('HTTP_AUTHORIZATION' => "Digest #{params}"), &block)
  end

  def assert_digest_auth_challenge(response)
    response.should.be.a.client_error
    response.status.should.equal 401
    response.should.include 'WWW-Authenticate'
    response.headers['WWW-Authenticate'].should =~ /^Digest /
    response.body.should.be.empty
  end

  def assert_bad_request(response)
    response.should.be.a.client_error
    response.status.should.equal 400
    response.should.not.include 'WWW-Authenticate'
  end

  specify 'should challenge when no credentials are specified' do
    request 'GET', '/' do |response|
      assert_digest_auth_challenge response
    end
  end

  specify 'should return application output if correct credentials given' do
    request_with_digest_auth 'GET', '/', 'Alice', 'correct-password' do |response|
      response.status.should.equal 200
      response.body.to_s.should.equal 'Hi Alice'
    end
  end

  specify 'should return application output if correct credentials given (hashed passwords)' do
    @request = Rack::MockRequest.new(protected_app_with_hashed_passwords)

    request_with_digest_auth 'GET', '/', 'Alice', 'correct-password' do |response|
      response.status.should.equal 200
      response.body.to_s.should.equal 'Hi Alice'
    end
  end

  specify 'should rechallenge if incorrect username given' do
    request_with_digest_auth 'GET', '/', 'Bob', 'correct-password' do |response|
      assert_digest_auth_challenge response
    end
  end

  specify 'should rechallenge if incorrect password given' do
    request_with_digest_auth 'GET', '/', 'Alice', 'wrong-password' do |response|
      assert_digest_auth_challenge response
    end
  end

  specify 'should rechallenge with stale parameter if nonce is stale' do
    begin
      Rack::Auth::Digest::Nonce.time_limit = 1

      request_with_digest_auth 'GET', '/', 'Alice', 'correct-password', :wait => 2 do |response|
        assert_digest_auth_challenge response
        response.headers['WWW-Authenticate'].should =~ /\bstale=true\b/
      end
    ensure
      Rack::Auth::Digest::Nonce.time_limit = nil
    end
  end

  specify 'should return 400 Bad Request if incorrect qop given' do
    request_with_digest_auth 'GET', '/', 'Alice', 'correct-password', 'qop' => 'auth-int' do |response|
      assert_bad_request response
    end
  end

  specify 'should return 400 Bad Request if incorrect uri given' do
    request_with_digest_auth 'GET', '/', 'Alice', 'correct-password', 'uri' => '/foo' do |response|
      assert_bad_request response
    end
  end

  specify 'should return 400 Bad Request if different auth scheme used' do
    request 'GET', '/', 'HTTP_AUTHORIZATION' => 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==' do |response|
      assert_bad_request response
    end
  end

  specify 'should not require credentials for unprotected path' do
    @request = Rack::MockRequest.new(partially_protected_app)
    request 'GET', '/' do |response|
      response.should.be.ok
    end
  end

  specify 'should challenge when no credentials are specified for protected path' do
    @request = Rack::MockRequest.new(partially_protected_app)
    request 'GET', '/protected' do |response|
      assert_digest_auth_challenge response
    end
  end

  specify 'should return application output if correct credentials given for protected path' do
    @request = Rack::MockRequest.new(partially_protected_app)
    request_with_digest_auth 'GET', '/protected', 'Alice', 'correct-password' do |response|
      response.status.should.equal 200
      response.body.to_s.should.equal 'Hi Alice'
    end
  end

  specify 'should return application output if correct credentials given for POST' do
    request_with_digest_auth 'POST', '/', 'Alice', 'correct-password' do |response|
      response.status.should.equal 200
      response.body.to_s.should.equal 'Hi Alice'
    end
  end

  specify 'should return application output if correct credentials given for PUT (using method override of POST)' do
    @request = Rack::MockRequest.new(protected_app_with_method_override)
    request_with_digest_auth 'POST', '/', 'Alice', 'correct-password', :input => "_method=put" do |response|
      response.status.should.equal 200
      response.body.to_s.should.equal 'Hi Alice'
    end
  end

  specify 'realm as optional constructor arg' do
    app = Rack::Auth::Digest::MD5.new(unprotected_app, realm) { true }
    assert_equal realm, app.realm
  end
end
*/