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
    graph.query(str,function(err,d){
      if(err) return cb(err);
      var t2 = Date.now()
      d.forEach(function(item,i){
        Object.keys(item).forEach(function(key,ii){
          var rowNum = ii==0 ? i+1 : "";
          console.log("%s\t%s\t%s",rowNum,key,JSON.stringify(item[key]));
        })
      });
      console.log("query took %sms",t2-t1);
      cb();
    });
  }
  
});
