var ports = [];
onconnect = function(event){
	var port = event.port;
	// connect to this port, listening for any messages
	ports.push(port);
	port.onmessage = function(event){

		// got a message, send it to everyone!
		for(var i = 0; i < ports.length; i++){
			var port = ports[i];
			port.postMessage(event.data);
		}
	};
};