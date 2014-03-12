
module.exports = Pointer ;

function Pointer(addr){
  this._address = "/*Pointer*/" + addr 
};

Pointer.prototype.encode = function (){ return this._address; }
