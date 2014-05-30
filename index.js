var Connection = require('./lib/ConnectionPool');
var Graph = require('./lib/Graph');

exports.createConnection = function ( host , o, f ) {
  var cb = typeof o == "function" ? o : f ;
  var options = typeof o == "function" ? {} : o ;
  var conn = new Connection(host,options);
  conn.connect(function(err){
    if (err) return cb(err);
    cb(null,new Graph(conn,options));
  });
}

exports.createConnectionSync = function ( host , options ) {
  var conn = new Connection(host,options);
  conn.connectSync();
  return new Graph(conn,options);
}
