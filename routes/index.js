var express = require('express');
var router = express.Router();
var cons = require('../constants.js');
var fs = require('fs')
var pm2 = require('pm2');

var cron = require('node-cron');

router.route('/')
    .get(function(req, res) {
        res.redirect('admin/home')
    });
// required for slection of app from Index.ejs    
router.route('/select_app_home')
    .post(function(req, res) {
        if (!req.session.objectId) {
            res.redirect('login')
        } else {
            var app =JSON.parse(req.body.app)
            var json = {objectId:app.objectId,name:app.name,fakeData:app.fakeData,defaultType:app.defaultType,facebookPostPath:app.facebookPostPath,facebookAccessToken:app.facebookAccessToken}
            req.session.app = json
            res.redirect('home')
        }
    });

router.route('/restart')
    .get(function(req, res) {
        if(level(1,req) || (req.body.sepcialCase && JSON.parse(req.body.sepcialCase) == true)){
            Parse.Cloud.run('appToJson', {}).then(function(results){
                var ios = results.ios;
                var finalArray = []
                for (var i = 0; i < ios.length; i++) {
                    var obj = ios[i];
                    if(obj.get("bundleIdentifier")&&(obj.get("p12Pro") || obj.get("p12Dev"))){
                        if(obj.get("p12Pro")){
                            var pushObject = {}
                            pushObject.bundleId = obj.get("bundleIdentifier")
                            pushObject.pfx = obj.get("p12Pro")
                            pushObject.production = true
                            finalArray.push(pushObject)
                        }
                        if(obj.get("p12Dev")){
                            var pushObject = {}
                            pushObject.bundleId = obj.get("bundleIdentifier")
                            pushObject.pfx = obj.get("p12Dev")
                            pushObject.production = false
                            finalArray.push(pushObject)
                        }
                    }
                }
                var android = results.android;
                var finalArrayAndroid = []
                for (var i = 0; i < android.length; i++) {
                    var obj = android[i];
                    var pushObject = {}
                    pushObject.senderId = obj.get("senderId")
                    pushObject.apiKey = obj.get("apiKey")
                    finalArrayAndroid.push(pushObject)
                }
                fs.writeFile(__dirname+'/../push_iOS.json', JSON.stringify(finalArray, null, 2), 'utf-8', function(err){
                    if(err)
                        res.status(403).send(err)
                    else{
                        fs.writeFile(__dirname+'/../push_android.json', JSON.stringify(finalArrayAndroid, null, 2), 'utf-8', function(err){
                            if(err)
                                res.status(403).send(err)
                            else{
                                var task = cron.schedule('* * * * *', function() {
                                    res.status(200).send("done")
                                    var date = new Date()
                                    Parse.Cloud.httpRequest({url: "http://localhost:"+cons.PORT+"/api/jobs/restarted",
                                      headers: {'X-Parse-Application-Id': cons.APP_ID,'X-Parse-Master-Key':cons.MASTER_KEY},
                                      method:'POST',
                                      body: {status:"Restarting "+date}
                                    }).then(function(httpResponse) {},function(error){});

                                    pm2.connect(function(err) {
                                        pm2.restart('multipurpose-v1.0', function(err, apps) {
                                            task.destroy()
                                        });
                                    });
                                }, true);
                                task.start();
                            }
                        })
                    }
                })
            },function(error){
                res.status(403).send(error.message)
            })
        }else{
            res.status(403).send()
        }
    });
router.route('/home')
    .get(function(req, res) {
         var user,statistics;
         req.headers['app-id'] = req.session.app.objectId
         Parse.Cloud.run('fetchUser', {objectId:req.session.objectId,appId:req.session.app.objectId}).then(function(object) {
            if (object && object.get("type") === "admin" && (object.get("adminAccess") === true || object.get("superAdminAccess") === true || object.get("editorAccess") === true)) {
                user = object

                if(object.get("adminAccess") === true || object.get("superAdminAccess") === true ){
                    return Parse.Cloud.httpRequest({
                      url: cons.BASE_URL_LOCAL_Functions+'statistics',
                      headers: {
                          'X-Parse-Application-Id': cons.APP_ID,
                          'app-id':req.session.app.objectId
                      },
                      method:'POST',
                      body: {}
                    })
                }else if(object.get("editorAccess") === true){
                    return Parse.Cloud.httpRequest({
                      url: cons.BASE_URL_LOCAL_Functions+'statisticsEditor',
                      headers: {
                          'X-Parse-Application-Id': cons.APP_ID,
                          'app-id':req.session.app.objectId
                      },
                      method:'POST',
                      body: {userId:user.id}
                    })
                }else{
                    res.status(403).send()
                }
            } else{
                req.session = null
                res.redirect('login')
            }
        }).then(function(httpResponse){
            if(httpResponse){
                statistics = httpResponse.data.result
                return Parse.Cloud.run('app', {})
            }
        }).then(function(objects){
            if(objects){
                for (var i = 0; i < objects.length; i++) {
                    var app = objects[i]
                    if(app.id === req.session.app.objectId){
                        var json = {objectId:app.id,name:app.get("name"),fakeData:app.get("fakeData"),defaultType:app.get("defaultType"),facebookPostPath:app.get("facebookPostPath"),facebookAccessToken:app.get("facebookAccessToken")}
                        req.session.app = json
                        break;
                    }
                }
                req.session.superAdminAccess = user.get("superAdminAccess")
                req.session.adminAccess = user.get("adminAccess")
                req.session.editorAccess = user.get("editorAccess")
                if(user.get("adminAccess") === true || user.get("superAdminAccess") === true || user.get("editorAccess") === true){
                    var ejs = 'index_editor' 
                    if(user.get("adminAccess") === true || user.get("superAdminAccess") === true){
                        ejs = 'index'
                    }
                    res.render(ejs, {
                        title: cons.DEVELOPER_NAME_BOLD,
                        user:user,
                        superAdminAccess:req.session.superAdminAccess,
                        adminAccess:req.session.adminAccess,
                        editorAccess:req.session.editorAccess,
                        statistics:statistics,
                        app:req.session.app,
                        apps:objects,
                        devNameBold:cons.DEVELOPER_NAME_BOLD,
                        devNameThin:cons.DEVELOPER_NAME_THIN
                    });
                }else{
                    res.status(403).send()
                }
            }
        }, function(error) {
            req.session = null
            res.redirect('login')
        });
    });

router.route('/category_list')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Categories",undefined,{},"categories","category.ejs",false,undefined)
        }
        else{
            res.status(403).send()
        }
    });

router.route('/add_category')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"add_category","Add Category",undefined,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_category')
    .post(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"edit_category","Add Category",req.body,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/user_list')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Users",undefined,{},"users","user.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/installations')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Installations",undefined,{},"installation","installation.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/requests')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Requests",undefined,{},"requestedPostList","request.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });    

router.route('/admin_list')
    .get(function(req, res) {
        if(level(0,req)){
            renderEjs(req,res,"list_controller","Admins",undefined,{},"admins","admin.ejs",false,undefined)
        }
        else{
            res.status(403).send()
        }
    });    
router.route('/add_admin')
    .get(function(req, res) {
        if(level(0,req)){
            renderEjs(req,res,"add_admin","Add Admin",undefined,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_admin')
    .post(function(req, res) {
        if(level(0,req)){
            renderEjs(req,res,"edit_admin","Edit Admin",req.body,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });
router.route('/database')
    .get(function(req, res) {
        if(level(0,req)){
            Parse.Cloud.run("dbStats", {}).then(function(categories) {
                renderEjs(req,res,"database","Database",undefined,undefined,undefined,undefined,false,categories)
            },function(error){
                res.status(403).send(error.message)
            });
        }else{
            res.status(403).send()
        }
    });

router.route('/api_hits')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","API Hits",undefined,{},"hits","api_hit.ejs",false,undefined)
        }else{
            res.status(403).send()
        }
    });
router.route('/backup_list')
    .get(function(req, res) {
        if(level(0,req)){
            renderEjs(req,res,"list_controller","Backups",undefined,{},"dbBackups","backup.ejs",false,undefined)
        }else{
            res.status(403).send()
        }
    });    
router.route('/settings')
    .get(function(req, res) {
        if(level(1,req)){
            Parse.Cloud.httpRequest({
              url: cons.BASE_URL_LOCAL_Functions+'static',
              headers: {
                  'X-Parse-Application-Id': cons.APP_ID,
                  'app-id':req.session.app.objectId
              },
              method:'POST',
              body: {}
            }).then(function(httpResponse) {
                renderEjs(req,res,"settings","Settings",undefined,undefined,undefined,undefined,false,httpResponse.data.result)
            },function(error){
                res.status(403).send(error.message)
            });
        }else{
            res.status(403).send()
        }
    });
router.route('/app_list')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Applications",undefined,{},"app","app.ejs",false,undefined)
        }else{
            res.status(403).send()
        }
    });    
router.route('/add_app')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"add_app","Add Application",undefined,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_app')
    .post(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"edit_app","Edit Application",req.body,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/certificates_list')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Certificates",undefined,{},"pushCertificatesIOS","certificate.ejs",false,undefined)
        }else{
            res.status(403).send()
        }
    });    
router.route('/add_certificates')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"add_certificates","Add Certificate",undefined,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_certificates')
    .post(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"edit_certificates","Edit Certificate",req.body,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/android_push_list')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Android Pushes",undefined,{},"androidPushList","android_push.ejs",false,undefined)
        }else{
            res.status(403).send()
        }
    });    
router.route('/add_android_push')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"add_android_push","Add Android Push",undefined,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_android_push')
    .post(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"edit_android_push","Edit Android Push",req.body,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/configuration_list')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"list_controller","Configurations",undefined,{},"remoteControlList","configuration.ejs",false,undefined)
        }else{
            res.status(403).send()
        }
    });    
router.route('/add_configuration')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"add_configuration","Add Configuration",undefined,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_configuration')
    .post(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"edit_configuration","Edit Configuration",req.body,undefined,undefined,undefined,false,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/post_list')
    .get(function(req, res) {
        if(level(1,req)){
            var params = {"type":"admin","limit":"12"}
            if(req.query.categoryId && !(req.query.categoryId==='undefined'))
                params.categoryId = req.query.categoryId
            if(req.query.publishedAt && !(req.query.publishedAt==='undefined'))
                params.publishedAt = req.query.publishedAt
            renderEjs(req,res,"list_controller","Posts",undefined,params,"posts","post.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/post_list_editor')
    .get(function(req, res) {
        if(level(1,req)){
            var params = {"type":"admin","status":"pending"}
            if(req.query.categoryId && !(req.query.categoryId==='undefined'))
                params.categoryId = req.query.categoryId
            if(req.query.publishedAt && !(req.query.publishedAt==='undefined'))
                params.publishedAt = req.query.publishedAt
            renderEjs(req,res,"list_controller","Posts",undefined,params,"postsEditor","post_editor_approval.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/post_list_user')
    .get(function(req, res) {
        if(level(1,req)){
            var params = {"type":"admin","status":"new","allApps":"yes"}
            if(req.query.categoryId && !(req.query.categoryId==='undefined'))
                params.categoryId = req.query.categoryId
            if(req.query.publishedAt && !(req.query.publishedAt==='undefined'))
                params.publishedAt = req.query.publishedAt
            renderEjs(req,res,"list_controller","Posts",undefined,params,"posts","post.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/add_post')
    .get(function(req, res) {
        if(level(1,req)){
            Parse.Cloud.httpRequest({
              url: cons.BASE_URL_LOCAL_Functions+'categories',
              headers: {
                  'X-Parse-Application-Id': cons.APP_ID,
                  'app-id':req.session.app.objectId
              },
              method:'POST',
              body: {}
            }).then(function(httpResponse){
                var categories =httpResponse.data.result
                if(categories.length === 0){
                    res.redirect('add_category')
                }else{
                    Parse.Cloud.run('app', {objectId:req.session.app.objectId}).then(function(app){
                        var json = {objectId:app.id,name:app.get("name"),fakeData:app.get("fakeData"),defaultType:app.get("defaultType"),facebookPostPath:app.get("facebookPostPath"),facebookAccessToken:app.get("facebookAccessToken")}
                        req.session.app = json
                        renderEjs(req,res,"add_post","Add Post",undefined,undefined,undefined,undefined,false,categories)
                    });
                }
            },function(error){
                res.status(403).send(error.message)
            });
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_post')
    .get(function(req, res) {
        if(level(1,req)){
            var categories;
            Parse.Cloud.httpRequest({
              url: cons.BASE_URL_LOCAL_Functions+'categories',
              headers: {
                  'X-Parse-Application-Id': cons.APP_ID,
                  'app-id':req.session.app.objectId
              },
              method:'POST',
              body: {}
            }).then(function(httpResponse) {
                categories = httpResponse.data.result
                return Parse.Cloud.httpRequest({
                  url: cons.BASE_URL_LOCAL_Functions+'fetchPost',
                  headers: {
                      'X-Parse-Application-Id': cons.APP_ID,
                      'app-id':req.session.app.objectId
                  },
                  method:'POST',
                  body: {objectId:req.query.postId}
                })
            }).then(function(httpResponse){
                if(categories.length === 0){
                    res.redirect("add_category")
                }else{
                    renderEjs(req,res,"edit_post","Edit Post",httpResponse.data.result,undefined,undefined,undefined,false,categories)
                }
            },function(error){
                res.status(403).send(error.message)
            });
        }else{
            res.status(403).send()
        }
    });

router.route('/post_list_editor_pending')
    .get(function(req, res) {
        if(level(1,req)){
            res.redirect('post_list_editor')
        }
        else if(level(2,req)){
            var params = {"status":"pending","userId":req.session.objectId}
            if(req.query.categoryId && !(req.query.categoryId==='undefined'))
                params.categoryId = req.query.categoryId
            if(req.query.publishedAt && !(req.query.publishedAt==='undefined'))
                params.publishedAt = req.query.publishedAt
            renderEjs(req,res,"list_controller","Posts",undefined,params,"postsEditor","post_editor.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/post_list_editor_approved')
    .get(function(req, res) {
        if(level(2,req)){
            var params = {"status":"approved","userId":req.session.objectId}
            if(req.query.categoryId && !(req.query.categoryId==='undefined'))
                params.categoryId = req.query.categoryId
            if(req.query.publishedAt && !(req.query.publishedAt==='undefined'))
                params.publishedAt = req.query.publishedAt
            renderEjs(req,res,"list_controller","Posts",undefined,params,"postsEditor","post_editor.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/post_list_editor_rejected')
    .get(function(req, res) {
        if(level(2,req)){
            var params = {"status":"rejected","userId":req.session.objectId}
            if(req.query.categoryId && !(req.query.categoryId==='undefined'))
                params.categoryId = req.query.categoryId
            if(req.query.publishedAt && !(req.query.publishedAt==='undefined'))
                params.publishedAt = req.query.publishedAt
            renderEjs(req,res,"list_controller","Posts",undefined,params,"postsEditor","post_editor.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });    

router.route('/add_post_editor')
    .get(function(req, res) {
        if(level(2,req)){
            Parse.Cloud.httpRequest({
              url: cons.BASE_URL_LOCAL_Functions+'categories',
              headers: {
                  'X-Parse-Application-Id': cons.APP_ID,
                  'app-id':req.session.app.objectId
              },
              method:'POST',
              body: {}
            }).then(function(httpResponse){
                var categories =httpResponse.data.result
                if(categories.length === 0){
                    res.status(403).send("Ask Admin to add Category")
                }else{
                    renderEjs(req,res,"add_post_editor","Add Post",undefined,undefined,undefined,undefined,false,categories)
                }
            },function(error){
                res.status(403).send(error.message)
            });
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_post_editor')
    .get(function(req, res) {
        if(level(2,req)){
        	var categories;
            Parse.Cloud.httpRequest({
              url: cons.BASE_URL_LOCAL_Functions+'categories',
              headers: {
                  'X-Parse-Application-Id': cons.APP_ID,
                  'app-id':req.session.app.objectId
              },
              method:'POST',
              body: {}
            }).then(function(httpResponse) {
                categories = httpResponse.data.result
                return Parse.Cloud.httpRequest({
                  url: cons.BASE_URL_LOCAL_Functions+'fetchPostEditor',
                  headers: {
                      'X-Parse-Application-Id': cons.APP_ID,
                      'app-id':req.session.app.objectId
                  },
                  method:'POST',
                  body: {objectId:req.query.postId}
                })
            }).then(function(httpResponse){
                if(categories.length === 0){
                    res.status(403).send("Ask Admin to add Category")
                }else{
                    renderEjs(req,res,"edit_post_editor","Edit Post",httpResponse.data.result,undefined,undefined,undefined,false,categories)
                }
            },function(error){
                res.status(403).send(error.message)
            });
        }else{
            res.status(403).send()
        }
    });
router.route('/push_list')
    .get(function(req, res) {
        if(level(1,req)){
            var params = {"post":0,'onlyPost':0,"deviceType":"both"}
            renderEjs(req,res,"list_controller","Pushes",undefined,params,"push","push.ejs",true,undefined)
        }else{
            res.status(403).send()
        }
    });

router.route('/add_push')
    .get(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"add_push","Add Push",undefined,undefined,undefined,undefined,false,cons.pushTypes)
        }else{
            res.status(403).send()
        }
    });

router.route('/edit_push')
    .post(function(req, res) {
        if(level(1,req)){
            renderEjs(req,res,"edit_push","Edit Push",req.body,undefined,undefined,undefined,false,cons.pushTypes)
        }else{
            res.status(403).send()
        }
    });

router.route('/loadData')
    .post(function(req, res) {
        if(level(2,req)){
            Parse.Cloud.httpRequest({
              url: cons.BASE_URL_LOCAL_Functions+req.query.functionName,
              headers: {
                  'X-Parse-Application-Id': cons.APP_ID,
                  'app-id':req.session.app.objectId
              },
              method:'POST',
              body: req.body
            }).then(function(httpResponse) {
                res.send(httpResponse.data.result)
            },function(error){
                console.log("************************           EROR        *******************************************")
                console.log(error.message)
                res.status(403).send(error.message)
            });
        }else{
            res.status(403).send()
        }
    });

router.post("/upload/:name", function(req, res) {
    var contype = req.headers['content-type']
    if(contype === "admin/file"){
        var dataObj = {
            base64: req.rawBody
        };
        var file = new Parse.File(req.params.name, dataObj);
        console.log('test 1')
        file.save().then(function(file){
            res.send(file)
        },function(error){
            res.status(403).send(error.message)
        });    
    }else{
        res.status(403).send("Please specify the content-type=admin/file")
    }
});
router.post("/upload_db_file", function(req, res) {
    if(level(0,req)){
        var dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '')
        dateStr = dateStr.replace(/:/g,'.')
        dateStr = dateStr+"_"+(0|Math.random()*9e6).toString(36)+".tar"
        dateStr = cons.DATABASE_NAME+"_"+dateStr
        var path = __dirname+'/../public/db_backups/'+dateStr
        fs.writeFile(path, req.body, function(err){
            if(err)
                res.status(403).send(err)
            else{
                var mongoose = require('mongoose');
                mongoose.connect(cons.DATABASE_URI,function(){
                    mongoose.connection.db.dropDatabase();
                    mongoose.connection.close()
                    var restore = require('mongodb-restore')
                    restore({
                      uri: cons.DATABASE_URI,
                      root: __dirname+'/../public/db_backups',
                      tar: dateStr,
                      callback: function(err) {
                        if (err) {
                          res.status(403).send(err)
                        } else {
                            fs.unlink(path,function(err){
                                res.send("done")
                            });
                        }
                      }
                    });
                });
            }
        })
    }else{
        res.status(403).send()
    }
});
router.post("/upload_p12_file", function(req, res) {
    if(level(1,req)){
        var dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '')
        dateStr = dateStr.replace(/:/g,'')
        dateStr = dateStr.replace(/-/g,'')
        // dateStr = dateStr+"_"+(0|Math.random()*9e6).toString(36)+".p12"
        dateStr = req.query.name+"_"+dateStr
        dateStr = dateStr.replace(/\.p12/g,'')
        dateStr = dateStr.replace(/\.P12/g,'')
        dateStr += ".p12"
        dateStr = dateStr.replace(/ /g,'_')
        fs.writeFile(__dirname+'/../p12/'+dateStr, req.body, function(err){
            if(err)
                res.status(403).send(err)
            else{
                res.send(dateStr)
            }
        })
    }else{
        res.status(403).send()
    }
});

function renderEjs(req,res,ejs,title,object,params,functionName,cell,isPaging,categories){
    if(params)
        params.appId = req.session.app.objectId
    res.render(ejs, {
            superAdminAccess:req.session.superAdminAccess,
            adminAccess:req.session.adminAccess,
            editorAccess:req.session.editorAccess,
            app:req.session.app,
            sessionObjectId:req.session.objectId,
            title:title,
            object:object,
            params:params,
            cell:"/cells/"+cell,
            isPaging:isPaging,
            url: 'loadData?functionName='+functionName,
            categories:categories,
            devNameBold:cons.DEVELOPER_NAME_BOLD,
            devNameThin:cons.DEVELOPER_NAME_THIN
        });
}
function level(level,req){
    if(req.session.superAdminAccess === true){
        return true
    }else if(level === 1 ){
        if(req.session.adminAccess === true){
            return true
        }else{
            return false
        }   
    }else if(level === 2 ){
        if(req.session.adminAccess === true || req.session.editorAccess === true){
            return true
        }else{
            return false
        }   
    }else{
        return false
    }
}
module.exports = router;