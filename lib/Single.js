var format = require('util').format;
var entities = require('./entities');
var Pointer = require('./Pointer');
var Entity = entities.Entity;
var Node = entities.Node ;
var Rel = entities.Rel ;

module.exports = Single;

function Single ( connection ) {
  var pending = [];
  var callbacks = [];
  Object.defineProperty(this, "_connection", { value: connection });
  Object.defineProperty(this, "_pending", { value: pending });
  Object.defineProperty(this, "_callbacks", { value: callbacks });  
}

Single.prototype._flush = function (cb) {
  var pending = this._pending.splice(0,Infinity);
  var calls = pending.map(function(call){ return call[0]; });
  var callbacks = pending.map(function(call){ return call[1]; });
  this._connection.request(calls, function(err, responseArray){
    var response, err, results;
    try {
      response = parseResponse(responseArray) || [];
      err = response.error;
      results = response.results;
    } catch(e) {
      err = e ;
      results = [];
    }
    callbacks.forEach(function(itemCb,i){
      if(itemCb) itemCb(err,results[i]);
    })
    if (cb) cb(err,results);
  });
};

Single.prototype.query = function ( query, params , cb ) {
  var call = compose("POST", "cypher", [query, params] );
  this._pending.push([call, cb]);
  return this._flush();
};

Single.prototype.getNode = function ( node_id, labels, properties, cb ) {
  var call = compose("GET", "node", [node_id, labels, properties]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.putNode = function ( node_id, labels, properties, cb ) {
  var call = compose("PUT", "node", [node_id, labels, properties]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.patchNode = function ( node_id, labels, properties, cb ) {
  var call = compose("PATCH", "node", [node_id, labels, properties]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.createNode = function ( labels, properties, cb ) {
  var call = compose("POST", "node", [labels, properties]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.deleteNode = function ( node_id, cb ) {
  var call = compose("DELETE", "node", [node_id]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.getRel = function ( rel_id, cb ) {
  var call = compose("GET", "rel", [rel_id]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.putRel = function ( rel_id, properties, cb ) {
  var call = compose("PUT", "rel", [rel_id, properties]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.patchRel = function ( rel_id, properties, cb ) {
  var call = compose("PATCH", "rel", [rel_id, properties]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.createRel = function ( start_node, end_node, type, properties, cb ) {
  var call = compose("POST", "rel", [start_node, end_node, type, properties]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.deleteRel = function ( rel_id, cb ) {
  var call = compose("DELETE", "rel", [rel_id]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

function compose (method,resource,args) {
  return ([method,resource]).concat(args.map(function(arg){
    if ( arg instanceof Pointer || arg instanceof Entity ) return arg.encode();
    else return JSON.stringify(arg);
  })).join("\t");
};

function parseResponse ( resp ) {
  var responseArray = resp.slice(0);
  var batchResult = parseResponseItem(responseArray.pop());
  var results = [] ;
  var lastResult = [];
  responseArray.forEach(function(ri){
    responseItem = parseResponseItem(ri);
    lastResult.push(responseItem.results);
    if ( parseInt(responseItem.status) >= 200 ) results.push(lastResult.splice(0,Infinity)) 
  })
  var hasErr = batchResult.status > 200;
  var err = hasErr ? 
              typeof batchResult.results[0] == "string" ? 
                new Error(batchResult.results[0]) : 
                  new Error("Transaction Failed") :
                    null;
  return {
    error: err,
    results: results
  };
}

function parseResponseItem ( responseItem ) {
    var results = responseItem.toString("utf8").split("\t");
    var status = results.shift();
    var response = results.map(function(result){
      if ( result.indexOf(Node.prototype._hint) == 0 ) return new Node(result);
      if ( result.indexOf(Rel.prototype._hint) == 0 ) return new Rel(result);
      if ( result == "?" ) return null ;
      return JSON.parse(result);
    })
    return {
      status : status,
      results : response
    }
}

function cbSingle (cb) {
  return function (err, results ) {
    var res = results && results[0] || null ;
    if (cb) cb(err, res && res[0] || res );
  }
} 
