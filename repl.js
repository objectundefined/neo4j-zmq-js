var repl = require('repl');
var neo = require('./index');
var Single = require('./lib/Single');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var host = process.argv[2] || "tcp://localhost:47474";
console.log('connecting to %s', host);
neo.createConnection(host,{poolSize:1},function(err,graph){
  if (err) throw err;
  repl.start({
    prompt: 'graph> ',
    eval: eval,
    ignoreUndefined: true
  }).on('exit', function() {
    process.exit();
  });
  var tmp = [];
  var params = {};
  function eval(str, context, file, cb) {
    var t1 = Date.now(),query,p;
    str = str.slice(1).slice(0, -2);
    
    if (str.indexOf(";")==str.length-1) {
      str = str.slice(0,-1);
      tmp.push(str);
      query = tmp.splice(0).join("\n");
      p = params;
      params={};
      graph.query(query,p,function(err,d,info){
        if(err) return cb(err);
        var t2 = Date.now()
        var roudTripTime = (t2-t1) + "ms";
      
        console.log("results:\n%s\n", JSON.stringify(d,null,4));
        console.log("info:\n%s\n", JSON.stringify(info,null,4));
      
        cb();
      });
    } else if (str.indexOf("$PARAMS=")==0) {
      
      try {
        params = JSON.parse(str.slice(8));
        cb();
      } catch(e){
        return cb(e);
      }
      
    } else {
      tmp.push(str);
      cb();
    }
    
  }
  
});
