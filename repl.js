var repl = require('repl');
var neo = require('./index');
var Single = require('./lib/Single');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var argv = require('optimist')
    .options('h', {
        alias: 'host',
        default: 'tcp://localhost',
        describe: 'hostname to connect to'
    })
    .options('p', {
        alias: 'port',
        default: '47474',
        describe: 'port to connect to'
    })
    .argv
;

var host = argv.host + ":" + argv.port;
console.log('connecting to %s', host);
neo.createConnection(host,{heartbeat_timeout: 1000000 },function(err,graph){
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
      var txn = graph.batch();
      txn.query(query,p,function(err,d,info){
        if(err) return cb(err);
        var t2 = Date.now()
        var roudTripTime = (t2-t1) + "ms";
      
        console.log("results:\n%s\n", JSON.stringify(d,null,4));
        console.log("info:\n%s\n", JSON.stringify(info,null,4));
      
        cb();
      });
      txn.submit();
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
