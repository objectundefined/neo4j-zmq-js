var Client = require("./Client");
var Pointer = require('./Pointer');

module.exports = Batch;

function Batch ( connection ) {
  Client.call(this, connection);
}

Batch.prototype = new Client();

Batch.prototype.submit = function (cb) {
  return this._callPending(cb);
};

Batch.prototype._addPending = function (call, cb) {
  this._pending.push([call, cb]);
  return new Pointer(this._pending.length-1) ;
};

