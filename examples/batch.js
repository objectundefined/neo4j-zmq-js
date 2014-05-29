var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');

neo.createConnection("tcp://localhost:47474",{poolSize:10},function(err,graph){
  var batch1 = graph.batch();
  var batch2 = graph.batch();
  _.range(10).forEach(function(i){
    var name = format("test_user_%s",i);
    batch1.createNode(["User"],{name:name},function(err,user){
      if (err) return console.error('ERROR1:',err);
      console.log("RESULT1",user)
    });
  })
  batch1.submit(function(err,results){
    if (err) return console.error('ERROR2:',err);
    console.log("RESULT2:",JSON.stringify(results));
  });
  
  // batch with self-referential pointers
  
  var usr1 = batch2.createNode(["User"],{name:"batch_user_1"});
  var usr2 = batch2.createNode(["User"],{name:"batch_user_2"});
  batch2.createRel(usr1, usr2, "LOVES", { since: 2005 });
  batch2.submit(function(err,results){
    if (err) return console.error('ERROR3:',err);
    console.log("RESULT3",JSON.stringify(results));
  })
  
})