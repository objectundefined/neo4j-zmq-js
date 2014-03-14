var format = require('util').format;
var Pointer = require('./Pointer');

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

Single.prototype.query = function ( query, p , c ) {
  var cb, params = {};
  if (typeof p == 'function') {
    cb = p;
  } else {
    cb = c;
    params = p;
  }
  var call = compose("POST", "cypher", [query, params] );
  this._pending.push([call, function(err,results){
    if (err) return cb(err);
    var cols = results.shift();
    var foot = results.pop();
    cols = cols[0] || [];
    var d = results.map(function(rowArr){
      var obj = {};
      var rowArr = rowArr[0] || [];
      cols.forEach(function(col,i){
        obj[col] = rowArr[i];
      });
      return obj;
    });
    cb(null,d);
  }]);
  return this._flush();
};

Single.prototype.getNode = function ( node, cb ) {
  var call = compose("GET", "node", [ extractNode(node) ]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.putNode = function ( node, labels, properties, cb ) {
  var call = compose("PUT", "node", [extractNode(node), labels, properties]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.patchNode = function ( node, labels, properties, cb ) {
  var call = compose("PATCH", "node", [extractNode(node), labels, properties]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.createNode = function ( labels, properties, cb ) {
  var call = compose("POST", "node", [labels, properties]);
  this._pending.push([call, cbSingle(cb)]);
  return this._flush();
};

Single.prototype.deleteNode = function ( node, cb ) {
  var call = compose("DELETE", "node", [extractNode(node)]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.findNodesByLabelAndProperty = function ( label, key, value, cb ) {
  var call = compose("GET", "nodeset", [label, key, value]);
  this._pending.push([call,cbMulti(cb)]);
  return this._flush();  
}

Single.prototype.mergeNodeByLabelAndProperty = function ( label, key, value, cb ) {
  var call = compose("PUT", "nodeset", [label, key, value]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();  
}

Single.prototype.deleteNodesByLabelAndProperty = function ( label, key, value, cb ) {
  var call = compose("DELETE", "nodeset", [label, key, value]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();  
}

Single.prototype.getRel = function ( rel, cb ) {
  var call = compose("GET", "rel", [extractRel(rel)]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.putRel = function ( rel, properties, cb ) {
  var call = compose("PUT", "rel", [extractRel(rel), properties]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.patchRel = function ( rel, properties, cb ) {
  var call = compose("PATCH", "rel", [extractRel(rel), properties]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.createRel = function ( start_node, end_node, type, properties, cb ) {
  var call = compose("POST", "rel", [extractNode(start_node), extractNode(end_node), type, properties]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

Single.prototype.deleteRel = function ( rel, cb ) {
  var call = compose("DELETE", "rel", [extractRel(rel)]);
  this._pending.push([call,cbSingle(cb)]);
  return this._flush();
};

function compose (method,resource,args) {
  return ([method,resource]).concat(args.map(function(arg){
    if ( arg instanceof Pointer ) return arg.encode();
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
    var response = results.map(JSON.parse);
    return {
      status : status,
      results : response
    }
}

function cbSingle (cb) {
  return function (err, results ) {
    if (cb) cb(err, results.map(function(item){return item[0]})[0] );
  }
} 
function cbMulti (cb) {
  return function (err, results ) {
    if (cb) cb(err, results.map(function(item){return item[0]}) );
  }
} 

function extractNode ( item ) {
  if (item instanceof Pointer || !isNaN(item)) return item ;
  else if ( item["$neo_type"]=="NODE" && item.id ) return item.id;
  else throw new Error(format("item %s is not a Node",JSON.stringify(item)))
}

function extractRel ( item ) {
  if (item instanceof Pointer || !isNaN(item)) return item ;
  else if ( item["$neo_type"]=="REL" && item.id ) return item.id;
  else throw new Error(format("item %s is not a Relationship",JSON.stringify(item)))
}