var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var uuid = require('node-uuid');
var assert = require('assert');

neo.createConnection("tcp://localhost:47474",{poolSize:10},function(err,graph){
  var totalNodes = 10000;
  var iterations = 10;
  console.log('checking unique constraint');
  graph.query("CREATE CONSTRAINT ON (u:User) ASSERT u._id IS UNIQUE",{},function(err){
    if (err) throw err;
    runSingleIterations(graph,totalNodes,iterations,function(){
      process.exit();
    });    
  });
})


function runSingleIterations ( graph, totalNodes, iterations, cb ) {
  var t1 = Date.now();
  var timeout_time = 1000;
  async.eachSeries(_.range(iterations),function(n,cb){
    singleIteration((totalNodes/iterations),graph,function(err){
      if (err) return cb(err);
      setTimeout(cb,timeout_time);
    });
  },function(err){
    if (err) throw err;
    var t2 = Date.now();
    var totTime = t2-t1-(iterations*timeout_time);
    var nodesPerSec = (totalNodes/totTime)*1000;
    console.log("Took %sms to create %s nodes w/ unique constraint.",totTime,totalNodes)
    console.log("Inserted %s nodes per second",nodesPerSec);
    cb()
  })
}

function singleIteration(times,graph,cb) {
  console.log("Running Iteration: %s Write Transactions (Create Node w/ Unique Constraint)",times)
  var t1 = Date.now();
  async.times(times,function(n,cb){
    var itemId = /*(n==45) ? "BADID" :*/ uuid.v4();
    graph.createNode(["User"],{_id:itemId},function(err,node){
      if (err) {
       //return cb(err);
       console.log(err); 
      }
      //assert.equal(itemId,node.properties._id,"Wrong node returned!!");
      cb(null,node);
    });
  },function (err){
    if (err) return cb(err);
    var t2 = Date.now();
    var totTime = (t2-t1);
    var perCycle = totTime/times
    console.log("Iteration Time (%s individual inserts): %sms, Per Txn: %sms",times,totTime,perCycle)
    cb();
  })
}

/*

var query = ([
  "MATCH (root {  _id: 'abc123'  })-[old:MOMENT_LINK]->(after)",
  "CREATE UNIQUE (root)-[:MOMENT_LINK { date: timestamp() }]->(m:Moment { _id: round(rand() * 1000000000000000000), date: timestamp() })-[:MOMENT_LINK { date: after.date }]->(after)",
  "DELETE old",
  "RETURN m"
]).join("\n");


neo.createConnection("tcp://localhost:47474",{poolSize:1},function(err,graph){
  var t1 = Date.now();
  var times = 1000;
  async.times(times,function(n,cb){
    graph.query(query,{},cb);
  },function (err){
    if (err) throw err;
    var t2 = Date.now();
    var totTime = (t2-t1);
    var perCycle = totTime/times
    console.log("Total Time: %sms, Per Cycle: %sms",totTime,perCycle)
    process.exit();
  })
})

*/