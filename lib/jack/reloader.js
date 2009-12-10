var Sandbox = require("sandbox").Sandbox;

exports.Reloader = function(id, appName) {
    appName = appName || 'app';
    return function(env) {
        var sandbox = Sandbox({
            "system": system,
            modules: {
            	"event-queue": require("event-queue"),
            	"packages": require("packages")
            },
            "loader": require.loader,
            "debug": require.loader.debug
        });
        var module = sandbox(id); // not as main, key
        return module[appName](env);
    }
}
