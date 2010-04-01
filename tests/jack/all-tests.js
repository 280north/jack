exports.testJackUtils = require("./utils-tests");
exports.testJackRequest = require("./request-tests");
exports.testJackSessionCookie = require("./session-cookie-tests");
exports.testJackAuth = require("./auth/all-tests");

if (require.main === module)
    require("test/runner").run(exports);

