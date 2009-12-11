// a short url shortener. no persistance.
exports.app=function(r){return r.pathInfo!='/'?{status:301,headers:{'location':d[r.pathInfo.substr(1)]},body:[]}:{status:200,headers:{'content-type':'text/html'},body:[r.queryString?''+(d.push(decodeURIComponent(r.queryString.substr(2)))-1):'<form><input name="u"/></form>']}};d=[]
