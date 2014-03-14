var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');

neo.createConnection("tcp://localhost:47474",function(err,graph){
  //var query = "MATCH (u:User) RETURN u LIMIT 1000";
  var query = "MATCH p = (u:User{name:{firstUser}})-->(u1:User) RETURN p";
  graph.query(query,{firstUser:"batch_user_1"},function(err,results){
    console.log(JSON.stringify(results,null,4));
  });
});
