var Client = require("./Client");

module.exports = Single;

function Single ( connection ) {
  Client.call(this, connection);
}

Single.prototype = new Client();

Single.prototype._addPending = function (call, cb) {
  this._pending.push([call, cb]);
  this._callPending();
};

