var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');

neo.createConnection("tcp://localhost:47474",function(err,graph){
  //var query = "MATCH (u:User) RETURN u LIMIT 1000";
  var query = "CREATE p=(u:User{name:{first}})-[:FRIEND_OF]->(u1:User{name:{second}}) RETURN p";
  graph.query(query,{first:"gabe",second:"john"},function(err,results,info){
    console.log(info);
    console.log(JSON.stringify(results,null,4));
  });
});
