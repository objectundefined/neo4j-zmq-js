var neo = require('../index');
var async = require('async');
var format = require('util').format;
var _ = require('underscore');

neo.createConnection("tcp://localhost:47474",function(err,graph){
  var query = "MATCH (u:User) RETURN u LIMIT 1000";
  graph.query(query,{},function(err,results){
    console.log(arguments);
  });
});
