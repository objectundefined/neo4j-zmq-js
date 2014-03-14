var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');
var uuid = require('node-uuid');

neo.createConnection("tcp://localhost:47474",{poolSize:10},function(err,graph){
  var totalNodes = 100000;
  var iterations = 250;
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
    process.exit();
  })
})


function batchIteration(size,graph,cb) {
  var t1 = Date.now();
  var batch = graph.batch();
  for (var i=0;i<size;i++){
    batch.createNode(["User"],{_id:uuid()});
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
    graph.createNode(["User"],{_id:uuid()},cb);
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