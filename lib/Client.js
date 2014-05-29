var format = require('util').format;
var Pointer = require('./Pointer');

// ABSTRACT CLIENT - MUST BE WRAPPED AND IMPLEMENT _addPending


module.exports = Client;

function Client ( connection ) {
  var pending = [];
  var callbacks = [];
  this._connection = connection;
  this._pending = pending;
  this._callbacks = callbacks;
}

Client.prototype._addPending = function (call, cb) {
  
};

Client.prototype._callPending = function (cb) {
  var pending = this._pending.splice(0,Infinity);
  var calls = pending.map(function(call){ return call[0]; });
  var callbacks = pending.map(function(call){ return call[1]; });
  this._connection.request(calls, function(err, responseArray){
    var response;
    var results = [];
    if (!err) {
      try {
        response = parseResponse(responseArray) || [];
        err = response.error;
        results = response.results;
      } catch(e) {
        err = e ;
        results = [];
      }      
    }
    callbacks.forEach(function(itemCb,i){
      if(itemCb) itemCb(err,results[i]);
    })
    if (cb) cb(err,results);
  });
}

Client.prototype.query = function ( query, p , c ) {
  var cb, params;
  if (typeof p == 'function') {
    cb = p;
    params = {};
  } else {
    cb = c;
    params = p || {};
  }
  var call = compose("POST", "cypher", [query, params] );
  var wrapped_cb = function(err,results){
    if (err && cb) return cb(err);
    if (cb) {
      var cols = results.shift();
      info = results.pop() ;
      cols = cols[0] || [];
      var d = results.map(function(rowArr){
        var obj = {};
        var rowArr = rowArr[0] || [];
        cols.forEach(function(col,i){
          obj[col] = rowArr[i];
        });
        return obj;
      });
      cb(null, d, info&&info[0]||null); 
    }
  };
  return this._addPending( call, wrapped_cb );
};

Client.prototype.getNode = function ( node, cb ) {
  var call = compose("GET", "node", [ extractNode(node) ]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.putNode = function ( node, labels, properties, cb ) {
  var call = compose("PUT", "node", [extractNode(node), labels, properties]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.patchNode = function ( node, labels, properties, cb ) {
  var call = compose("PATCH", "node", [extractNode(node), labels, properties]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.createNode = function ( labels, properties, cb ) {
  var call = compose("POST", "node", [labels, properties]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.deleteNode = function ( node, cb ) {
  var call = compose("DELETE", "node", [extractNode(node)]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.findNodesByLabelAndProperty = function ( label, key, value, cb ) {
  var call = compose("GET", "nodeset", [label, key, value]);
  return this._addPending(call, cbMulti(cb));
}

Client.prototype.mergeNodeByLabelAndProperty = function ( label, key, value, cb ) {
  var call = compose("PUT", "nodeset", [label, key, value]);
  return this._addPending(call, cbSingle(cb));
}

Client.prototype.deleteNodesByLabelAndProperty = function ( label, key, value, cb ) {
  var call = compose("DELETE", "nodeset", [label, key, value]);
  return this._addPending(call, cbSingle(cb));
}

Client.prototype.getRel = function ( rel, cb ) {
  var call = compose("GET", "rel", [extractRel(rel)]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.putRel = function ( rel, properties, cb ) {
  var call = compose("PUT", "rel", [extractRel(rel), properties]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.patchRel = function ( rel, properties, cb ) {
  var call = compose("PATCH", "rel", [extractRel(rel), properties]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.createRel = function ( start_node, end_node, type, properties, cb ) {
  var call = compose("POST", "rel", [extractNode(start_node), extractNode(end_node), type, properties]);
  return this._addPending(call, cbSingle(cb));
};

Client.prototype.deleteRel = function ( rel, cb ) {
  var call = compose("DELETE", "rel", [extractRel(rel)]);
  return this._addPending(call, cbSingle(cb));
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
    var responseItem = parseResponseItem(ri);
    var status = parseInt(responseItem.status);
    if (status <= 201) {
      lastResult.push(responseItem.results);
    }
    if (status == 200 || status == 201){
      results.push(lastResult.splice(0,Infinity));
    }
  })
  var hasErr = batchResult.status > 200;
  var err = hasErr ? 
              typeof batchResult.results[0] == "string" ? 
                new Error("TransactionFailed - " +  batchResult.results[0] ) : 
                  new Error("TransactionFailed") :
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
    if (cb) cb(err, results && results.map(function(item){return item[0]})[0] );
  }
} 
function cbMulti (cb) {
  return function (err, results ) {
    var results = results && results.map(function(item){return item[0]})
    var stats = results.pop();
    if (cb) cb(err, results, stats );
  }
} 

function extractNode ( item ) {
  if (item instanceof Pointer || !isNaN(item)) return item ;
  else if ( item["$neo_type"]=="NODE" && item.hasOwnProperty("id") ) return item.id;
  else throw new Error(format("item %s is not a Node",JSON.stringify(item)))
}

function extractRel ( item ) {
  if (item instanceof Pointer || !isNaN(item)) return item ;
  else if ( item["$neo_type"]=="REL" && item.hasOwnProperty("id") ) return item.id;
  else throw new Error(format("item %s is not a Relationship",JSON.stringify(item)))
}