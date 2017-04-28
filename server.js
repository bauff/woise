//
// # WOISE-SERVER
//
// Listen to user input and send osc cmds to SC server.
//
var http = require('http'); // HTTP server
var path = require('path'); // URL parser and helper stuff
var async = require('async'); 
var socketio = require('socket.io'); // BI DIRECTIONAL DATA TRANSFER BROOOO
var express = require('express'); // routing, and stuff

var osc = require('osc');

var scPort = new osc.UDPPort({
    // This is the port we're listening on.
    localAddress: "127.0.0.1",
    localPort: 57121,

    // This is where sclang is listening for OSC messages.
    remoteAddress: "127.0.0.1",
    remotePort: 57120,
    metadata: true 
});

scPort.open();

scPort.on('read', function(){
     var msg = {
      address: "/hello/from/oscjs",
      args: [
        {
            type: "f",
            value: Math.random()
        },
        {
            type: "f",
            value: Math.random()
        }
    ]
  };
  
  console.log("Sending message", msg.address, msg.args, "to", scPort.options.remoteAddress + ":" + scPort.options.remotePort);
  scPort.send(msg); 
   
});
scPort.on('error', function(error){
     console.log(error);
});



//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];


io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');
      
      if (!text)
        return;
      
      socket.get('name', function (err, name) {
        
        var data = {
          name: name,
          text: text
        };
        
      //   var msg = {
      //     address: "/hello/from/oscjs",
      //     args: [
      //       {
      //           type: "f",
      //           value: Math.random()
      //       },
      //       {
      //           type: "f",
      //           value: Math.random()
      //       }
      //   ]
      // };
      
        // console.log("Sending message", msg.address, msg.args, "to", scPort.options.remoteAddress + ":" + scPort.options.remotePort);
        // scPort.send(msg);  
        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
