var zmq = require('zmq');
var format = require('util').format;

exports.Node = Node ;
exports.Rel = Rel ;
exports.Entity = Entity;

function Entity ( raw ) {
  var entType = this._hint && this._hint.match(/\w+/)[0] || "Entity" ;
  Object.defineProperty(this,"_raw",{ value: raw })
  Object.defineProperty(this,"_data",{ value: raw && JSON.parse(raw.replace(this._hint,""))||{id:null,properties:{}} })
  this.descriptor = format("%s<%s>",entType,JSON.stringify(this.toJSON()));
}

Entity.prototype._hint = "" ;
Entity.prototype.toString = function () {
  return this._raw;
}
Entity.prototype.properties = function () {
  return this._data.properties;
}
Entity.prototype.toJSON = function () {
  return this._data;
}
Entity.prototype.id = function () {
  return this._data.id;
}
Entity.prototype.encode = function () {
  return this.id();
}
Entity.prototype.toEntity = function () {
  return this._raw;
}
Entity.prototype.getClassName = function(){
  return this.constructor.name
};

function Node(raw){ Entity.call(this,raw) }

Node.prototype = new Entity();
Node.prototype._hint = "/*Node*/";

function Rel(raw){ Entity.call(this,raw) }

Rel.prototype = new Entity();
Rel.prototype._hint = "/*Rel*/";