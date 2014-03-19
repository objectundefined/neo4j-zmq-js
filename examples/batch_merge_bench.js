var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var uuid = require('node-uuid').v4;

neo.createConnection("tcp://localhost:47474",{poolSize:10},function(err,graph){
  var batch = graph.batch();
  var amt = 1000;
  async.times(10,function(n,cb){
    var t1 = Date.now();
    _.range(amt).forEach(function(i){
      batch.mergeNodeByLabelAndProperty("User","_id",10000+i);
    });
    batch.submit(function(err,results){
      if (err) return cb(err);
      var t2 = Date.now()
      //console.log(JSON.stringify(results,null,4));
      console.log("MERGE(%s) took %sms", amt, t2-t1);
      cb();
    });
  },function(err){
    if (err) console.error('ERROR:',err);
    process.exit();
  })
})