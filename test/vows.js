var vows = require('vows');
var assert = require('assert');
var helper = require ('./test_helper'),
    rest = require('../lib/restler'),
    sys  = require('sys');

RegExp.escape = function(str)
{
  var specials = new RegExp("[.*+?|()\\[\\]{}\\\\]", "g"); // .*+?|()[]{}\
  return str.replace(specials, "\\$&");
};

var restTopic = function(method, options){
    return function(){
        var host = helper.echoServer()[0];
        var r = rest[method](host, options);
        r.addListener('complete', this.callback);
    };
};

var requestContains = function(regex){
    return function(data, response){
      assert.ok(regex.test(data));
    };
};

var takesURLs = function(path){
    var host = helper.echoServer()[0];
    var context = {
        topic: function(){
            var r = rest.get(host + path);
            r.addListener('complete', this.callback);
        }
    };
    var path = path || '/';
    context['should access '+ path] = requestContains(
        new RegExp('^GET ' + RegExp.escape(path)));
    return context;
};

var firesEvent = function(event){
    var host = helper.echoServer()[0];
    var context = {
        topic: function(){
            var status = parseInt(this.context.name.split(/ +/)[0]);
            var r = rest.get(host, {headers: {'X-Give-Me-Status': status}});
            r.addListener('error', function(data, response){});
            r.addListener(event, this.callback);
        }
    };
    context['fires event ' + event] = function(data, response){};
    return context;
}

var handlesMethod = function(method){
    var host = helper.echoServer()[0];
    var context = {
        topic: function(){
            var r = rest[this.context.name.split(/ +/)[5].toLowerCase()](host);
            r.addListener('complete', this.callback);
        }
    };
    context['request should be a ' + method] = requestContains(new RegExp('^' + method));
    return context;    
};

vows.describe('Basic Tests').addBatch({
    'request can take a path': takesURLs('/thing'),
    'request can take an empty path': takesURLs(''),
    'request preserve query string': takesURLs('/thing?boo=yah'),
    'request should be able to GET': handlesMethod('GET'),
    'request should be able to PUT': handlesMethod('PUT'),
    'request should be able to POST': handlesMethod('POST'),
    'request should be able to DEL': handlesMethod('DELETE'),
    'request should serialize query': {
        topic: restTopic('get', {query: {q: 'balls'}}),
        'should hit /?q=balls': requestContains(/^GET \/\?q\=balls/)
    },
    'request should post body': {
        topic: restTopic('post', {data: 'balls'}),
        'should have balls in the body': requestContains(/\r\n\r\nballs/)
    },
    'request should serialize post body': {
        topic: restTopic('post', { data: { q: 'balls' } }),
        'should set content-type': requestContains(/content-type\: application\/x-www-form-urlencoded/),
        'should set content-length': requestContains(/content-length\: 7/),
        'should have balls in the body': requestContains(/\r\n\r\nq=balls/)
    },
    'request should send headers': {
        topic: restTopic('get',{headers: { 'Content-Type': 'application/json' }}),
        'should have set the header': requestContains(
                /content\-type\: application\/json/)        
    },
    'request should send basic auth': {
        topic: restTopic('post', { username: 'danwrong', password: 'flange' }),
        'should set the auth header': requestContains(
                /authorization\: Basic ZGFud3Jvbmc6Zmxhbmdl/)
    },
    '200 fires 2XX': firesEvent('2XX'),
    '200 fires 200': firesEvent('200'),
    '404 fires error': firesEvent('error'),
    '404 fires 4XX': firesEvent('4XX'),
    '404 fires 404': firesEvent('404'),
    'multipart request with simple vars': {
        topic: restTopic('post', {
                             data: { a: 1, b: 'thing' },
                             multipart: true
                         }),
        'should set content type': requestContains(
                /content-type\: multipart\/form-data/),
        'should send a=1': requestContains(/name="a"(\s)+1/),
        'should send b=thing': requestContains(/name="b"(\s)+thing/)
    }                                      

}).export(module)
