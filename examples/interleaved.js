var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');

neo.createConnection("tcp://localhost:47474",function(err,graph){
  async.parallel({
    jack: function (cb) {
      graph.createNode(["User"],{name:"Jack"},cb);
    },
    jill: function (cb) {
      graph.createNode(["User"],{name:"Jill"},cb);
    }
  },function(err,results){
    if (err) return console.error('Error creating users',err);
    var batch = graph.batch();
    batch.createRel(results.jack, results.jill, "LOVES", { since: 1500 },function(){
      console.log('jack loves jill?',arguments)
    });
    batch.createRel(results.jack, results.jill, "KNOWS", { since: 1490 },function(){
      console.log('jack knows jill?',arguments)
    });
    batch.submit(function(err){
      if (err) throw err;
    })
  })
});