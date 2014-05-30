var Client = require("./Client");
var Single = require("./Single");
var Batch = require("./Batch");
var _ = require('underscore');
var batch_ct = 0;

module.exports = SingleBatcherPool;

function SingleBatcherPool ( connection, options ) {
  var pool_size = options && options.batch_concurrency || 10;
  var batch_size = options && options.batch_size || 100;
  Client.call(this, connection);
  this.pool = _.range(pool_size).map(function(){
    return new SingleBatcher(connection, batch_size);
  })
}

SingleBatcherPool.prototype = new Client();

SingleBatcherPool.prototype.acquire = function (){
  var batcher = this.pool.shift();
  this.pool.push(batcher);
  return batcher;
}

SingleBatcherPool.prototype._addPending = function (call, cb) {
  this.acquire()._addPending(call, cb);
}

function SingleBatcher ( connection, batch_size ) {
  Client.call(this, connection);
  //this._batch = new Batch(connection);
  this._max_bulk = batch_size;
}

SingleBatcher.prototype = new Client();

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
  if ( self._running || ! self._pending.length ) return ;
  self._running = true;
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
  var id = ++batch_ct;
  var size = to_batch.length;
  //console.log('submitting batch %s of size %s', id, size);
  my_batch.submit(function(){
    //console.log('done with batch %s of size %s', id, size);
    self._running = false;
    self._flush();
  });
}
