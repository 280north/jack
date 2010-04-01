exports.testJack = require("./jack/all-tests");

if (require.main === module)
    require("test/runner").run(exports);
