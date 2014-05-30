var zmq = require('zmq');
var format = require('util').format;
var _ = require('underscore');
var uuid = require('node-uuid');
var uuidCounter = 0;
var async = require('async');
var uuidBase = uuid.v4().substring(0, 24);
var MAX_PENDING = 100000;

module.exports = Connection ;

function Connection ( host, o ) { 
  var self = this ;
  var socket = zmq.socket('dealer');
  var pending = {};
  var options = _.extend({
    heartbeat_timeout: 60000
  },o||{});
  
  self.host = host;
  self.options = options;
  self.connected = false;
  var heartbeat_timer;
  var resetHeartbeatTimer = function (){
    if (! options.heartbeat_timeout) return;
    clearTimeout(heartbeat_timer);
    heartbeat_timer = setTimeout(function(){
      resetHeartbeatTimer();
      Object.keys(pending).forEach(function(envelope){
        self.callPending(envelope,{error: new Error("HeartbeatTimeout")})
      });
    }, options.heartbeat_timeout);
  };
  var initializeHeartbeatTimer = _.once(resetHeartbeatTimer);
  
  Object.defineProperty(self,"_socket",{value:socket});
  Object.defineProperty(self,"_pending",{value:pending});
  Object.defineProperty(self,"_pending_ct",{value:0, writable:true});
  Object.defineProperty(self,"_initTimers",{value:initializeHeartbeatTimer});
  
  socket.on("message",function(){
    var response_array = Array.prototype.slice.call(arguments);
    var envelope = response_array.shift().toString();
    self.callPending(envelope,{
      response: response_array
    })
    resetHeartbeatTimer();
  });
  
}

Connection.prototype.callPending = function (envelope,data) {
  var self = this;
  var pending = self._pending;
  var error = data && data.error;
  var response = data && data.response;
  var cb = typeof pending[envelope]=='function' ? pending[envelope] : null ;
  delete pending[envelope];
  if (cb) cb(error,response);
  if (cb) self._pending_ct -= 1 ;
}

Connection.prototype.connect = function ( cb ) {
  var self = this ;
  var socket = self._socket;
  var host = self.host;
  if (parseInt(zmq.version) >=3) {
    socket.monitor();
    socket.connect(host);
    var couldNotConnect = function () {
      cb(new Error("Could Not Establish Connection"));
      socket.unmonitor();
      socket.disconnect(host)
      self.connected = false;
    };
    socket.once("close",couldNotConnect);
    socket.once("connect",function(){
      socket.removeListener("close",couldNotConnect);
      socket.unmonitor();
      self.connected = true;
      cb(null);
    });
  } else {
    self.connectSync();
    cb(null);
  }
}

Connection.prototype.connectSync = function () {
  var self = this ;
  var socket = self._socket;
  var host = self.host;
  socket.connect(host);
  self.connected = true;
}

Connection.prototype.disconnect = function (){
  var self = this;
  var host = self.host;
  self._socket.disconnect(host);
  self.connected = false;
}

Connection.prototype.close = function (){
  var self = this;
  self._socket.setsockopt(zmq.options.linger, 0); // do not maintain enqueued messages after the sock is closed.
  self._socket.close();
}

Connection.prototype.request = function ( payload, cb ) {
  var self = this;
  var socket = self._socket;
  var pending = self._pending;
  var pending_ct = self._pending_ct;
  var envelope = fastUUID();
  var msg = ([ envelope , new Buffer(0) ]).concat(payload);
  setImmediate(function(){
    pending[envelope] = (typeof cb == "function") ? cb : undefined ;
    pending_ct += 1;
    socket.send(msg);
    self._initTimers();
  });
}

function fastUUID() {
    var counter = uuidCounter++;
    if(uuidCounter > 0xFFFFFFFFFFFF) {
      uuidBase = uuid.v4().substring(0, 24);
      uuidCounter = 0;
    }
    return uuidBase + ("000000000000" + counter.toString(16)).slice(-12);
}
