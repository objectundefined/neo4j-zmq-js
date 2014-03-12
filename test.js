var neo = require('./index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var graph;

async.waterfall([
  function (cb) {
    neo.createConnection("tcp://localhost:47474",cb)
  },
  function (g, cb) {
    graph = g;
    
    var start = Date.now();
    var times = 100;
    
    async.times(times,function(n,cb){
      //var query = "MATCH p=allShortestPaths((n1:User)-->(n2:User)) return nodes(p) LIMIT 10" ;
      var query = "MATCH (u:User) RETURN u LIMIT 1000";
      graph.query(query,{},cb)
    },function(err){
      if (err) return cb(err);
      var end = Date.now();
      var avgTime = (end-start)/times;
      console.log('average_time_taken: %sms', avgTime);
      cb(null);
    })
    
    /*
    console.log('parity_test');
    var start = Date.now();
    var times = 10;
    async.times(times,function(n,cb){
      var batch = graph.batch();
      _.range(1000).forEach(function(i){
        var name = format("test_user_%s_%s",n,i);
        batch.createNode(["User"],{name:name},function(err,user){
          //var props = user.toJSON().properties;
          //console.log(name,props.name)
        });
      })
      batch.submit(cb);
    },function(err){
      if (err) return cb(err);
      var end = Date.now();
      var avgTime = (end-start)/times;
      console.log('average_time_taken', avgTime);
    })
    */
  },
  /*
  function (results, cb) {
    async.times(1000,function(n,cb){
      var batch = graph.batch();
      var usr1 = batch.createNode(["User"],{name:"Gabe"+n});
      var usr2 = batch.createNode(["User"],{name:"Karen"+n});
      batch.createRel(usr1, usr2, "LOVES", { since: 2005 });
      batch.submit(cb)
    },cb)


    async.parallel({
      jack: function (cb) {
        graph.createNode(["User"],{name:"Jack"},cb);
      },
      jill: function (cb) {
        graph.createNode(["User"],{name:"Jill"},cb);
      }
    },cb)
  }
  function (results, cb) {
    graph.createRel(results.jack, results.jill, "LOVES", { since: 1999 },cb);
  }
  */
],function(err, results){
  if (err) throw err;
//  console.log(JSON.stringify(results,null,4))
})

