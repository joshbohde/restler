var vows = require('vows');
var assert = require('assert');
var helper = require ('./test_helper'),
    rest = require('../lib/restler'),
    sys  = require('sys');

var takesURLs = function(path){
    var host = helper.echoServer()[0];
    var context = {
        topic: function(){
            var r = rest.get(host + path);
            r.addListener('complete', this.callback);
        }
    };
    context['should access '+ (path || '/')] = function(data, response){
            var path = path || '/';
            assert.ok(new RegExp('^GET ' + path).test(data), 'should hit ' + path);
        };
    return context;
};

var handlesMethod = function(method){
    var host = helper.echoServer()[0];
    var context = {
        topic: function(){
            var r = rest[this.context.name.split(/ +/)[5].toLowerCase()](host);
            r.addListener('complete', this.callback);
        }
    };
    context['request should be a ' + method] = function(data, response){
      assert.ok(new RegExp('^' + method).test(data));
    };
    return context;    
};

vows.describe('Basic Tests').addBatch({
    'request can take a path': takesURLs('/thing'),
    'request can take an empty path': takesURLs(''),
    'request preserves query string': takesURLs('/thing?boo=yah'),
    'request should be able to GET': handlesMethod('GET'),
    'request should be able to PUT': handlesMethod('PUT'),
    'request should be able to POST': handlesMethod('POST'),
    'request should be able to DEL': handlesMethod('DELETE')
}).export(module)
