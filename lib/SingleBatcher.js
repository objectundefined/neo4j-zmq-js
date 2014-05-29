var Client = require("./Client");
var Single = require("./Single");
var Batch = require("./Batch");

module.exports = SingleBatcher;

function SingleBatcher ( connection ) {
  Client.call(this, connection);
  //this._batch = new Batch(connection);
  this._num_running = 0;
  this._max_running = 10;
  this._max_bulk = 100;
}

SingleBatcher.prototype = new Client();

/*
Batch.prototype.submit = function (cb) {
  return this._callPending(cb);
};
*/


SingleBatcher.prototype._addPending = function (call, cb) {
  var self = this;
  self._pending.push({
    call: call,
    cb: cb,
    num_retries: 0
  });
  self._flush();
};


SingleBatcher.prototype._flush = function () {
  var self = this;
  if ( self._num_running > self._max_running ) return ;
  var to_batch = self._pending.splice(0,self._max_bulk);
  var my_batch = new Batch(self._connection);
  to_batch.forEach(function(item, item_index){
    var wrapped_item_cb = function (err) {
      if (err) {
        if ( item_index == err.failed_at_index ) {
          item.cb(err);
        } else if (item.num_retries > 3) {
          // we've retried this guy in batches so many times.
          // lets single it once and for all
          (new Single(self._connection))._addPending(item.call, item.cb);
        } else {
          self._pending.unshift({
            call: item.call,
            cb: item.cb,
            num_retries: item.num_retries+1
          });
        }
      } else {
        item.cb.apply(null, arguments);
      }
    }    
    my_batch._addPending(item.call, wrapped_item_cb);
  });
  self._num_running += 1;
  my_batch.submit(function(){
    self._num_running -= 1;
    self._flush();
  });
}
