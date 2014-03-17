var repl = require('repl');
var neo = require('./index');
var Single = require('./lib/Single');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');

neo.createConnection("tcp://localhost:47474",{poolSize:1},function(err,graph){
  repl.start({
    prompt: 'graph> ',
    eval: eval,
    ignoreUndefined: true
  }).on('exit', function() {
    graph._connection.disconnect(function(err) {
      if (err) throw err;
    });
  });
  function eval(str, context, file, cb) {
    var t1 = Date.now();
    str = str.slice(1).slice(0, -2);
    graph.query(str,function(err,d,info){
      if(err) return cb(err);
      var t2 = Date.now()
      var roudTripTime = (t2-t1) + "ms";
      
      console.log("results:\n%s\n", JSON.stringify(d,null,4));
      console.log("info:\n%s\n", JSON.stringify(info,null,4));
      
      cb();
    });
  }
  
});
