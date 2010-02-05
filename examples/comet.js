var Jack = require("jack"),
    Promise = require("promise").Promise;


var cometWorker = new (require("worker").SharedWorker)("chat-router", "chat-router");

var map = {};
// everyone who is listening
var listeners = [];
cometWorker.port.onmessage = function(event){
    // got a message, route it to all the listeners
    var listener;
    for(var i = listeners.length; i-- > 0;){
        listener = listeners[i];
        try{
            listener(event);
        }
        catch(e){
            print(e);
            listeners.splice(i,1);
        }
    }
}

// an example of using setTimeout in our event-loop
function randomMessage(){
    setTimeout(function(){
        cometWorker.port.postMessage("This is a random number " + Math.random() + " at a random time");
        randomMessage();
    },Math.random() * 10000);
    
}
randomMessage();

map["/"] = function(request) {
    var res = new Jack.Response(),
        message = reqObj.params("message");
    
    if (message) {
        cometWorker.port.postMessage(message);

        res.write("sent '" + message + "' to clients");
    }
    res.write('<form action="" method="post">');
    res.write('<input type="text" name="message" value="'+(message||"")+'">');
    res.write('<input type="submit" value="Send">');
    res.write('</form>');
    
    res.write('<a href="listen">listen</a>');
        
    return res.finish();
}

map["/listen"] = function(request) {
    var res = new Jack.Response(200, {"Transfer-Encoding":"chunked"});
    return res.finish(function(response) {
        
        // HACK: Safari doesn't display chunked data until a certain number of bytes
        for (var i = 0; i < 10; i++)
            response.write("................................................................................................................................<br />"); 
        
        var q = new MessageQueue();
        queues.push(q);
            
        while (true) {
            var message = q.take();
            response.write("received: " + message + "<br />");
        }
    });
    response = {
        status: 200,
        headers: {"Content-Type":"text/html", "Transfer-Encoding":"chunked"},
        body: {forEach: function(callback){
            // write will be called by the listener
            write = callback;
        }}
    };
    return promise; // return a promise to indicate that it is not done yet
}


// apply the URLMap
exports.app = Jack.URLMap(map);

var timer, queue;
// This a rhino-specific impl that creates a thread that queues up timer tasks.
// Note that the tasks are still executed in the same thread asynchronously,
// the timer thread is only used for queuing
function setTimeout(callback, delay){
    timer = timer || new java.util.Timer("JavaScript timer thread", true);
    queue = queue || require("event-queue");
    
    timer.schedule(new java.util.TimerTask({
        run: function(){
            queue.enqueue(callback);
        }
    }), Math.floor(delay));
}