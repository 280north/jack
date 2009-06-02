exports.testJack = require("./jack/all-tests");

if (require.main === require.id)
    require("test/runner").run(exports);
