exports.testJackUtils = require("./utils-tests");
exports.testJackRequest = require("./request-tests");
exports.testJackSessionCookie = require("./session-cookie-tests");

if (require.main === module.id)
    require("test/runner").run(exports);
