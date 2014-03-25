var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var uuid = require('node-uuid');
var assert = require('assert');

neo.createConnection("tcp://localhost:47474",{poolSize:10},function(err,graph){
  var totalNodes = 100000;
  var iterations = 250;
  runSingleIteration(graph,totalNodes,iterations,function(){
    process.exit();
  });
})


function runSingleIteration ( graph, totalNodes, iterations, cb ) {
  var t1 = Date.now();
  async.each(_.range(iterations),function(n,cb){
    singleIteration((totalNodes/iterations),graph,cb);
  },function(err){
    if (err) throw err;
    var t2 = Date.now();
    var totTime = t2-t1;
    var nodesPerSec = (totalNodes/totTime)*1000;
    console.log("Took %sms to create %s nodes w/ unique constraint.",totTime,totalNodes)
    console.log("Inserted %s nodes per second",nodesPerSec);
    cb()
  })
}

function runBatchIteration ( graph, totalNodes, iterations, cb ) {
  var t1 = Date.now();
  async.eachLimit(_.range(iterations),10,function(n,cb){
    batchIteration((totalNodes/iterations),graph,cb);
  },function(err){
    if (err) throw err;
    var t2 = Date.now();
    var totTime = t2-t1;
    var nodesPerSec = (totalNodes/totTime)*1000;
    console.log("Took %sms to create %s nodes w/ unique constraint.",totTime,totalNodes)
    console.log("Inserted %s nodes per second",nodesPerSec);
    cb()
  })
}

function batchIteration(size,graph,cb) {
  var t1 = Date.now();
  var batch = graph.batch();
  for (var i=0;i<size;i++){
    batch.mergeNodeByLabelAndProperty("User","_id",uuid());
  }
  batch.submit(function (err){
    if (err) return cb(err);
    var t2 = Date.now();
    var totTime = (t2-t1);
    var perCycle = totTime/size;
    setImmediate(cb,err);
    setImmediate(function(){
      console.log("Batch Time (%s inserts): %sms, Per-item: %sms",size,totTime,perCycle)
    })
  })
}

function singleIteration(times,graph,cb) {
  console.log("Running Iteration: %s Write Transactions (Create Node w/ Unique Constraint)",times)
  var t1 = Date.now();
  async.times(times,function(n,cb){
    var itemId = uuid();
    graph.createNode(["User"],{_id:itemId},function(err,node){
      if (err) return cb(err);
      assert.equal(itemId,node.properties._id,"Wrong node returned!!");
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