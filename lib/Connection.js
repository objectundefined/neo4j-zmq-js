var zmq = require('zmq');
var format = require('util').format;
var _ = require('underscore');
var uuid = require('node-uuid');
var uuidCounter = 0;
var uuidBase = uuid.v4().substring(0, 24);

module.exports = Connection ;

function Connection ( host ) { 
  var self = this ;
  var socket = zmq.socket('dealer');
  var pending = {};
  self._connected = false;
  Object.defineProperty(self,"socket",{value:socket});
  Object.defineProperty(self,"host",{value:host});
  Object.defineProperty(self,"_pending",{value:pending});
  socket.on("message",function(){
    var responseArray = Array.prototype.slice.call(arguments);
    var envelope = responseArray.shift().toString();
    var cb = typeof pending[envelope]=='function' ? pending[envelope] : null ;
    delete pending[envelope];
    if (cb) {
      cb(null,responseArray);
    }
  });
  process.on('exit', function(){
    self.disconnect();
  });
}

Connection.prototype.connect = function ( cb ) {
  var self = this ;
  var socket = self.socket;
  var host = self.host;
  if (zmq.version >=3) {
    socket.monitor();
    socket.connect(host);
    var couldNotConnect = function () {
      cb(new Error("Could Not Establish Connection"));
      socket.unmonitor();
      socket.close();
    };
    socket.once("close",couldNotConnect);
    socket.once("connect",function(){
      socket.removeListener("close",couldNotConnect);
      socket.unmonitor();
      self._connected = true;
      cb(null);
    });
  } else {
    socket.connect(host);
    self._connected = true;
    cb(null);
  }
}

Connection.prototype.connectSync = function () {
  var self = this ;
  var socket = self.socket;
  var host = self.host;
  socket.connect(host);
}

Connection.prototype.disconnect = function (){
  this.socket.setsockopt(zmq.options.linger, 0); // do not maintain enqueued messages after the sock is closed.
  this.socket.close();
}

Connection.prototype.request = function ( payload, cb ) {
  var envelope = fastUUID();
  var msg = ([ envelope , new Buffer(0) ]).concat(payload);
  if (typeof cb == "function") {
    this._pending[envelope] = cb ;
  }  
  this.socket.send(msg);
}

function fastUUID() {
    var counter = uuidCounter++;
    if(uuidCounter > 0xFFFFFFFFFFFF) {
      uuidBase = uuid.v4().substring(0, 24);
      uuidCounter = 0;
    }
    return uuidBase + ("000000000000" + counter.toString(16)).slice(-12);
}
