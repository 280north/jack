exports.testJackUtils = require("./utils-tests");
exports.testJackRequest = require("./request-tests");

if (require.main === module.id)
    require("test/runner").run(exports);
