var zmq = require('zmq');
var format = require('util').format;
var Single = require('./Single');
var Batch = require('./Batch');

module.exports = Graph;

function Graph ( connection ) {
  Single.call(this, connection);
}

Graph.prototype = new Single();

Graph.prototype.batch = function (){
  return new Batch(this._connection);
}

Graph.prototype.close = function (){
  this._connection.disconnect();
  return this;
}

Graph.prototype.open = function (cb){
  this._connection.connect(function(err){
    if (err && cb) return cb(err);
    if (cb) cb();
  })
  return this;
}