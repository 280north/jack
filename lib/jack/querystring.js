// Query String Utilities

var QSUtils = exports;

// PRIVATE
var OptS = Object.prototype.toString;

var DEFAULT_SEP = /[&;] */g;
	

// duck typing
function isA (thing, canon) {
	return (
		// truthiness. you can feel it in your gut.
		(!thing === !canon)
		// typeof is usually "object"
		&& typeof(thing) === typeof(canon)
		// check the constructor
		&& OptS.call(thing) === OptS.call(canon)
	);
};
function isNumber (thing) {
	return typeof(thing) === "number" && isFinite(thing);
};
function isString (thing) {
	return typeof(thing) === "string";
};
// END PRIVATE

QSUtils.unescape = function(str) {
    // unclear whether plusses are reserved in the URI path
    return decodeURIComponent(str.replace(/\+/g, " "));
}


QSUtils.toQueryString = function (obj, name) {
	if (isA(obj, null) || isA(obj, undefined)) {
		return name ? encodeURIComponent(name) + '=' : '';
	}
	if (isNumber(obj) || isString(obj)) {
		return encodeURIComponent(name) + '=' + encodeURIComponent(obj);
	}
	if (isA(obj, [])) {
		var s = [];
		name = name+'[]';
		for (var i = 0, l = obj.length; i < l; i ++) {
			s.push( QSUtils.toQueryString(obj[i], name) );
		}
		return s.join('&');
	}
	// now we know it's an object.
	var s = [];
	var begin = name ? name + '[' : '';
	var end = name ? ']' : '';
	for (var i in obj) if (obj.hasOwnProperty(i)) {
		var n = begin + i + end;
		s.push(QSUtils.toQueryString(obj[i], n));
	}
	return s.join("&");
};

QSUtils.parseQuery = (function () {
		
	// Parse a key=val string.
	// These can get pretty hairy
	// example flow:
	// parse(foo[bar][][bla]=baz)
	// return parse(foo[bar][][bla],"baz")
	// return parse(foo[bar][], {bla : "baz"})
	// return parse(foo[bar], [{bla:"baz"}])
	// return parse(foo, {bar:[{bla:"baz"}]})
	// return {foo:{bar:[{bla:"baz"}]}}
	function parsePiece (key, val) {
		if (arguments.length !== 2) {
			// key=val, called from the map/reduce
		 	key = key.split('=');
			return parsePiece(QSUtils.unescape(key.shift()), QSUtils.unescape(key.join('=')));
		}
		var sliced = /(.*)\[([^\]]*)\]$/.exec(key);
		if (!sliced) {
			var ret = {};
			if (key) ret[key] = val;
			return ret;
		}
		// ["foo[][bar][][baz]", "foo[][bar][]", "baz"]
		var tail = sliced[2], head = sliced[1];
		
		// array: key[]=val
		if (!tail) return parsePiece(head, [val]);
		
		// obj: key[subkey]=val
		var ret = {};
		ret[tail] = val;
		return parsePiece(head, ret);
	};
	
	
	// the reducer function that merges each query piece together into one set of params
	function mergeParams (params, addition) {
		return (
			// if it's uncontested, then just return the addition.
			(!params) ? addition
			// if the existing value is an array, then concat it.
			: (isA(params, [])) ? params.concat(addition)
			// if the existing value is not an array, arrayify it.
			: (!isA(params, {}) || !isA(addition, {})) ? [params].concat(addition)
			// else merge them as objects, which is a little more complex
			: mergeObjects(params, addition)
		)
	};
	
	// Merge two *objects* together. If this is called, we've already ruled
	// out the simple cases, and need to do the for-in business.
	function mergeObjects (params, addition) {
		for (var i in addition) if (i && addition.hasOwnProperty(i)) {
			params[i] = mergeParams(params[i], addition[i]);
		}
		return params;
	};
	
	var DEFAULT_SEP = "&;";
	return function parseQueryString (qs, sep) {
		return qs
			.split(new RegExp("["+(sep||DEFAULT_SEP)+"] *", "g"))
			.map(parsePiece)
			.reduce(mergeParams);
	};
})();

