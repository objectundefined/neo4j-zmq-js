var zmq = require('zmq');
var format = require('util').format;
var Batch = require('./Batch');
var SingleBatcher = require('./SingleBatcher');

module.exports = Graph;

function Graph ( connection, options ) {
  SingleBatcher.call(this, connection, options);
}

Graph.prototype = new SingleBatcher();

Graph.prototype.batch = function (){
  return new Batch(this._connection);
}

Graph.prototype.tx = function (){
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