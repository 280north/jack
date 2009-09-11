exports.testJackUtils = require("./utils-tests");
exports.testJackRequest = require("./request-tests");
exports.testJackAuth = require("./auth/all-tests");


if (require.main === module.id)
    require("test/runner").run(exports);
