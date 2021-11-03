var util = require('./util.js');
var cons = require('../constants.js');
var fs = require('fs');
Parse.Cloud.define("appToJson", function(request, response) {
    var query = new Parse.Query("Push_Certificates_iOS")
    query.exists("bundleIdentifier")
    query.limit(1000);
    query.find()
    var json ={}
    query.find().then(function(results) {
        json.ios = results
        var query = new Parse.Query("Android_Push")
        query.ascending("referenceName");
        query.limit(1000);
        return query.find()
    }).then(function(results) {
        json.android = results
        response.success(json)
    }, function(error) {
        response.error(error)
    })
});
Parse.Cloud.define("pushCertificatesIOS", function(request, response) {
    var objectId = request.params.objectId;
    var query = new Parse.Query("Push_Certificates_iOS")
    query.descending("createdAt");
    query.exists("bundleIdentifier")
    query.limit(1000);
    if (objectId) {
        var object = new(Parse.Object.extend("Push_Certificates_iOS"))
        object.id = objectId
        util.fetch(object, response)
    } else {
        util.find(query, response)
    }
});
Parse.Cloud.define("addPushCertificatesIOS", function(request, response) {
    var bundleIdentifier = request.params.bundleIdentifier;
    var p12Pro = request.params.p12Pro;
    var p12Dev = request.params.p12Dev;
    if (!bundleIdentifier) {
        response.error("please supply the bundleIdentifier")
    }else{
        var object = new(Parse.Object.extend("Push_Certificates_iOS"))
        object.set("bundleIdentifier", bundleIdentifier)
        if(p12Pro)
            object.set("p12Pro", p12Pro)
        if(p12Dev)
            object.set("p12Dev", p12Dev)
        util.save(object, response)
    }
});
Parse.Cloud.define("updatePushCertificatesIOS", function(request, response) {
    var objectId = request.params.objectId;
    var bundleIdentifier = request.params.bundleIdentifier;
    var p12Pro = request.params.p12Pro;
    var p12Dev = request.params.p12Dev;
    if (!objectId) {
        response.error("please supply the objectId")
    }
    else {
        var object = new(Parse.Object.extend("Push_Certificates_iOS"))
        object.id = objectId
        object.fetch().then(function(object) {
            if (bundleIdentifier)
                object.set("bundleIdentifier", bundleIdentifier)
            if(p12Pro || p12Dev){
                if(p12Pro && object.get("p12Pro")){
                    var path = __dirname+'/../p12/'+ object.get("p12Pro")
                    object.set("p12Pro", p12Pro)
                    fs.exists(path, function(exists) {
                        if(exists) {
                            fs.unlink(path,function(err){
                                if(p12Dev && object.get("p12Dev")){
                                    handleP12Dev(response,object,p12Dev)
                                }
                            });
                        }else{
                            if(p12Dev && object.get("p12Dev")){
                                handleP12Dev(response,object,p12Dev)
                            }
                        }
                    });
                }else if(p12Dev && object.get("p12Dev")){
                    handleP12Dev(response,object,p12Dev)
                }else{
                    if(p12Pro)
                        object.set("p12Pro", p12Pro)
                    if(p12Dev)
                        object.set("p12Dev", p12Dev)
                }
                
            }else{
               util.save(object, response)
            }            
        }, function(error) {
            response.error(error)
        }); 
    } 
});
function handleP12Dev(response,object,p12Dev){
    var path = __dirname+'/../p12/'+ object.get("p12Dev")
    object.set("p12Dev", p12Dev)
    fs.exists(path, function(exists) {
        if(exists) {
            fs.unlink(path,function(err){
                util.save(object, response)
            });
        }else{
            util.save(object, response)
        }
    });
}
function handleP12DevDelete(response,p12DevPath){
    if(p12DevPath){
        fs.exists(p12DevPath, function(exists) {
          if(exists) {
            fs.unlink(p12DevPath,function(err){
                response.success("done")
            });  
          } else {
            response.success("done")
          }
        });
    }else{
        response.success("done")
    }
}
Parse.Cloud.define("deletePushCertificatesIOS", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Push_Certificates_iOS"))
        object.id = objectId
        var p12ProPath,p12DevPath
        object.fetch().then(function(object) {
            if(object.get("p12Pro"))
                p12ProPath = __dirname+'/../p12/'+ object.get("p12Pro")
            if(object.get("p12Dev"))
                p12DevPath = __dirname+'/../p12/'+ object.get("p12Dev")
            return object.destroy()
        }).then(function(results) {
              if(p12ProPath){
                    fs.exists(p12ProPath, function(exists) {
                        if(exists) {
                            fs.unlink(p12ProPath,function(err){
                                handleP12DevDelete(response,p12DevPath)
                            });  
                        } else {
                            handleP12DevDelete(response,p12DevPath)
                        }
                    });
                }else{
                    handleP12DevDelete(response,p12DevPath)
                }
        }, function(error) {
            response.error(error)
        })
    } else {
        response.error("please supply the objectId");
    }
});