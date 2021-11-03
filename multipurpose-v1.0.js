
var express = require('express');
var cookieSession = require('cookie-session')
var slashes = require("connect-slashes");
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var bodyParser = require('body-parser');
var path = require('path');
var cons = require('./constants.js');

var fs = require('fs');
var iosPushArray = JSON.parse(fs.readFileSync(path.resolve(__dirname,'push_iOS.json'), 'utf8'));
for (var i = 0; i < iosPushArray.length; i++) {
  var obj = iosPushArray[i];
  obj.pfx = path.resolve(__dirname, './p12/'+obj.pfx)
}

var androidPushArray = JSON.parse(fs.readFileSync(path.resolve(__dirname,'push_android.json'), 'utf8'));
var push = {}
if(androidPushArray.length>0){
  if(androidPushArray.length>1)
    push.android = androidPushArray
  else{
    push.android = androidPushArray[0]
  }
}
if(iosPushArray.length>0){
  if(iosPushArray.length>1)
    push.ios = iosPushArray
  else{
    push.ios = iosPushArray[0]
  }
}




var api = new ParseServer({
  databaseURI: cons.DATABASE_URI,
  cloud: cons.CLOUD_DIR_PATH,
  appId: cons.APP_ID,
  masterKey: cons.MASTER_KEY,
  serverURL: cons.SERVER_URL,
  publicServerURL:cons.SERVER_URL,
  verbose: cons.VERBOSE,
  maxUploadSize : '1000mb',
  push: push
});

var app = express();

app.use (function (req, res, next) {

  if(req.headers['x-parse-application-id'] === cons.APP_ID && !req.headers['ignore_me']){
    Parse.Cloud.httpRequest({
      url: cons.BASE_URL_LOCAL_Functions+"addHit",
      headers: {
          'X-Parse-Application-Id': cons.APP_ID,
          'ignore_me':true
      },
      method:'POST',
      body: {}
    }).then(function(httpResponse){
        next();
    },function(error){
      response.error(error)
    })
  }else{
    next();
  }
});

app.use(slashes(false));
app.use(cookieSession({
  name: 'session',
  secret: cons.SESSION_SECRET
}))
app.use(bodyParser.urlencoded({ extended: true}));

var rawBodySaver = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString('base64');
  }
}
var rawBodySaver2 = function (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.body = buf;
  }
}

app.use(bodyParser.raw({ verify: rawBodySaver, type: 'admin/file',limit:'1000mb' }));
app.use(bodyParser.raw({ verify: rawBodySaver2, type: 'admin/tar',limit:'1000mb' }));
app.use(bodyParser.raw({ verify: rawBodySaver2, type: 'admin/p12',limit:'1000mb' }));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

app.use('/',require('./routes/admin'));

app.get('/', function (req, res) {
  res.status(403).send()
});

app.use(cons.API_ROUTE, api);

app.use(cons.FILES_ROUTE, express.static(path.join(__dirname, cons.FILES_DIRECTORY)));

var config = {
  "allowInsecureHTTP": cons.INSECURE_HTTP,
  "apps": cons.apps
  ,"users": [
    {
      "user":cons.CMS_USER,
      "pass":cons.CMS_PASSWORD
    }
  ]
};
var dashboard = new ParseDashboard(config,config.allowInsecureHTTP);
app.use(cons.CMS_ROUTE, dashboard);


var httpServer = require('http').createServer(app);

httpServer.listen(cons.PORT, function() {
    Parse.Cloud.run("addDefaultAdmin", {}).then(function(results) {})
});








