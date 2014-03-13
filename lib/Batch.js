var Single = require("./Single");
var Pointer = require('./Pointer');

module.exports = Batch;

function Batch ( connection ) {
  Single.call(this, connection);
}

Batch.prototype = new Single();

Batch.prototype.submit = Single.prototype._flush ;

Batch.prototype._flush = function () {
  return new Pointer(this._pending.length-1) ;
};

