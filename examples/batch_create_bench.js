var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var uuid = require('node-uuid').v4;

neo.createConnection("tcp://localhost:47474",{poolSize:10},function(err,graph){
  
  var batch = graph.batch();
  var amt = 1000;
  var t1 = Date.now();
  _.range(amt).forEach(function(i){
    batch.createNode(["User"],{_id:i,fixed:"fixed"});
  });
  batch.submit(function(err,results){
    if (err) return console.error('ERROR:',err);
    var t2 = Date.now()
    console.log("CREATE(%s) took %sms", amt, t2-t1);
    process.exit();
  });
})