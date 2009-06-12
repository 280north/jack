exports.testJackUtils = require("./utils-tests");
exports.testJackRequest = require("./request-tests");

if (require.main === require.id)
    require("test/runner").run(exports);
