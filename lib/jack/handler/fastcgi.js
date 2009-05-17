var FastCGI = require("./fastcgi-"+system.platform);

for (var property in FastCGI)
    exports[property] = FastCGI[property];
