var Client = require("./Client");
var Single = require("./Single");
var Batch = require("./Batch");

module.exports = SingleBatcher;

function SingleBatcher ( connection ) {
  Client.call(this, connection);
  //this._batch = new Batch(connection);
  this._num_running = 0;
  this._max_running = 10;
  this._max_bulk = 50;
}

SingleBatcher.prototype = new Client();

/*
Batch.prototype.submit = function (cb) {
  return this._callPending(cb);
};
*/


SingleBatcher.prototype._addPending = function (call, cb) {
  var self = this;
  var wrapped_cb = function (err) {
    if (err) {
      var my_single = new Single(self._connection);
      my_single._addPending(call, cb);
    } else {
      cb.apply(null, arguments);
    }
  }
  self._pending.push([call, wrapped_cb]);
  self._flush();
};


SingleBatcher.prototype._flush = function () {
  var self = this;
  if ( self._num_running > self._max_running ) return ;
  var to_batch = self._pending.splice(0,self._max_bulk);
  var my_batch = new Batch(self._connection);
  to_batch.forEach(function(item){
    my_batch._pending.push(item);
  });
  self._num_running += 1;
  my_batch.submit(function(){
    self._num_running -= 1;
    self._flush();
  });
}
