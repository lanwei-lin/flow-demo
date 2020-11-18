const middleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');
const webpack = require('webpack');
var proxy = require('http-proxy-middleware');
const express = require('express');
const app = express();
var bodyParser = require('body-parser');
const config = require('./webpack.config.js');
const compiler = webpack(config);

/*const exampleProxy1 = proxy(function (pathname, req) {
 return (pathname.match('^/storage_baidu_exist') && req.method === 'GET');
 }, {target: 'https://statistic.csdn.net', changeOrigin: true});

 const exampleProxy2 = proxy(function (pathname, req) {
 return (pathname.match('^/v1') && req.method === 'GET');
 }, {target: 'http://10.48.65.39:8090', changeOrigin: true});

 app.use(exampleProxy1);
 app.use(exampleProxy2);*/

app.use(bodyParser.json({limit: '1mb'}));  //这里指定参数使用 json 格式
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(hotMiddleware(compiler, {
    log: false,
    heartbeat: 2000
}));

app.use(middleware(compiler, {}));

app.listen(9090, () => {

});

