var Connection = require('./Connection');
var _ = require('underscore');
var async = require('async');

module.exports = ConnectionPool ;

function ConnectionPool ( host, o ) { 
  var self = this;
  var pool_size = o && o.pool_size || 5 ;
  self._host = host;
  self._opts = o;
  self.pool = _.range(pool_size).map(function(){
    return new Connection(host, o);
  });
  process.on('exit', function(){
    try{
      self.disconnect();
    } catch(e){}
  });
  
}

ConnectionPool.prototype.connect = function ( cb ) {
  var self = this;
  async.eachSeries(self.pool, function ( conn, cb ){
    conn.connect(cb);
  }, cb);
}

ConnectionPool.prototype.connectSync = function () {
  var self = this ;
  self.pool.forEach(function(conn){
    conn.connectSync()
  });
}

ConnectionPool.prototype.disconnect = function (){
  var self = this ;
  self.pool.forEach(function(conn){
    conn.disconnect();
  });
}

ConnectionPool.prototype.request = function ( payload, cb ) {
  var self = this;
  var conn = self.pool.shift();
  self.pool.push(conn);
  conn.request(payload, cb);
}