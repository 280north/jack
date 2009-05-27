// a short url shortener. no persistance.
exports.app=function(e){return e.PATH_INFO!='/'?[301,{'Location':d[e.PATH_INFO.substr(1)]},[]]:[200,{'Content-Type':'text/html'},[e.QUERY_STRING?''+(d.push(decodeURIComponent(e.QUERY_STRING.substr(2)))-1):'<form><input name="u"/></form>']]};d=[]
