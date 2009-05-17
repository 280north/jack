var sandbox = require("sandbox").sandbox;

exports.Reloader = function(moduleName, appName) {
    return function(env) {
        var module = sandbox(moduleName, system, { loader : require.loader });
        return module[appName](env);
    }
}
