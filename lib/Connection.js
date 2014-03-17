var zmq = require('zmq');
var format = require('util').format;
var _ = require('underscore');

module.exports = ConnectionPool ;

function ConnectionPool ( host, opts ) {
  var self = this;
  var poolSize = opts && opts.poolSize || 2 ;
  var pool = [];
  Object.defineProperty(self,"poolSize",{value:poolSize});
  Object.defineProperty(self,"host",{value:host});
  Object.defineProperty(self,"pool",{value:pool});  
}

ConnectionPool.prototype.connect = function (cb) {
  var self = this ;
  if ( self._connected || self._connecting ) {
    return false ;
  } else {
    self._connecting = true;
  }
  var conn = new Connection( self.host );
  conn.connect(function(err){
    if (!err) {
      self.pool.push(conn);
    }
    self._connected = true;
    self._connecting = false;
    cb(err);
  })
}

ConnectionPool.prototype.connectSync = function (cb) {
  var self = this ;
  if ( self._connected || self._connecting ) {
    return false ;
  } else {
    self._connecting = true;
  }
  var conn = new Connection( self.host );
  conn.connectSync();
  self.pool.push(conn);
  self._connected = true;
  self._connecting = false;
}

ConnectionPool.prototype.disconnect = function () {
  var self = this;
  var oldConnections = self.pool.splice(0,Infinity); // empty the array and reallocate local
  self._connected = false;
  oldConnections.forEach(function(conn){
    conn.disconnect();
  })
};

ConnectionPool.prototype.obtain = function (cb) {
  var self = this;
  if ( ! self._connected ) return cb(new Error("Not Connected"));
  if ( self.pool.length < self.poolSize ) {
    var c = new Connection(self.host);
    self.pool.push(c);
    c.connect(function(err){
      if (err) {
        var cIndex = self.pool.indexOf(c);
        self.pool.splice(cIndex,1);
        cb (new Error("Error Adding Connection To Pool"))
      } else {
        cb(null,c);
      }
    })
  } else {
    var activeConnections = self.pool.filter(function(conn){
      return conn._connected;
    });
    var randConnection = _.sample(activeConnections,1)[0];
    if ( randConnection ) {
      cb(null,randConnection);
    } else {
      setImmediate(self.obtain.bind(self),cb);
    }
  }
};

ConnectionPool.prototype.request = function(payload,cb) {
  var self = this ;
  self.obtain(function(err,conn){
    if (err) return cb(err);
    conn.request(payload,cb);
  })
}

function Connection ( host ) { 
  var self = this ;
  var socket = zmq.socket('req');
  var pending = [];
  self._connected = false;
  Object.defineProperty(self,"socket",{value:socket});
  Object.defineProperty(self,"host",{value:host});
  Object.defineProperty(self,"_pending",{value:pending});
  socket.on("error",function(err){
    var cb = pending.shift();
    if (cb) cb(err);
  });
  socket.on("message",function(){
    var responseArray = Array.prototype.slice.call(arguments);
    var cb = pending.shift();
    if (cb) cb(null,responseArray);
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
  this.socket.close();
}

Connection.prototype.request = function ( payload, cb ) {
  var reqCb = (typeof cb == "function") ? cb : null ; // preserve order even if no cb is passed in
  this._pending.push(reqCb);
  this.socket.send(payload);
}