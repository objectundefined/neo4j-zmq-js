var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');

neo.createConnection("tcp://localhost:47474",{poolSize:10},function(err,graph){
  var batch1 = graph.batch();
  var batch2 = graph.batch();
  _.range(1000).forEach(function(i){
    var name = format("test_user_%s_%s",n,i);
    batch1.createNode(["User"],{name:name},function(err,user){
      if (err) return console.error('ERROR:',err);
      console.log("result for individual item",user.toJSON())
    });
  })
  batch1.submit(function(err,results){
    if (err) return console.error('ERROR:',err);
    console.log("result for whole batch",JSON.stringify(results,null,4));
  });
  
  // batch with self-referential pointers
  
  var usr1 = batch2.createNode(["User"],{name:"batch_user_1"});
  var usr2 = batch2.createNode(["User"],{name:"batch_user_2"});
  batch2.createRel(usr1, usr2, "LOVES", { since: 2005 });
  batch.submit(function(){
    if (err) return console.error('ERROR:',err);
    console.log("result for whole batch",JSON.stringify(results,null,4));
  })
  
})