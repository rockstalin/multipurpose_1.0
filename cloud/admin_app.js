var util = require('./util.js');
var cons = require('../constants.js');
Parse.Cloud.define("app", function(request, response) {
    var objectId = request.params.objectId;
    var query = new Parse.Query("Admin_App")
    query.ascending("name");
    query.exists("name")
    query.limit(1000);
    if (objectId) {
        var object = new(Parse.Object.extend("Admin_App"))
        object.id = objectId
        util.fetch(object, response)
    } else {
        util.find(query, response)
    }
});
Parse.Cloud.define("addApp", function(request, response) {
    var name = request.params.name;
    var defaultType = request.params.defaultType;
    var fileName = request.params.fileName;
    var appVersion = request.params.appVersion;
    var companyName = request.params.companyName;
    var facebookAccessToken = request.params.facebookAccessToken;
    var facebookPostPath = request.params.facebookPostPath;
    var media = undefined
    if (!name) {
        response.error("please supply the name")
    }else if (!defaultType) {
        response.error("please supply the defaultType")
    }else{
        var object = new(Parse.Object.extend("Admin_App"))
        object.set("name", name)
        object.set("defaultType", defaultType)
        if(fileName){
            var url = cons.FILE_URL + "/" + fileName
            media = new Parse.File()
            media['_name'] = fileName
            media['_url'] = url
            object.set("icon", media)
        }
        if(facebookAccessToken)
            object.set("facebookAccessToken", facebookAccessToken)
        if(facebookPostPath)
            object.set("facebookPostPath", facebookPostPath)
        if(appVersion)
            object.set("appVersion", appVersion)
        if(companyName)
            object.set("companyName", companyName)
        util.save(object, response)
    }
});
Parse.Cloud.define("updateApp", function(request, response) {
    var objectId = request.params.objectId;
    var name = request.params.name;
    var defaultType = request.params.defaultType;
    var fileName = request.params.fileName;
    var appVersion = request.params.appVersion;
    var companyName = request.params.companyName;
    var facebookAccessToken = request.params.facebookAccessToken;
    var facebookPostPath = request.params.facebookPostPath;
    var media = undefined

    if (!objectId) {
        response.error("please supply the objectId")
    }
    else {
        var object = new(Parse.Object.extend("Admin_App"))
        object.id = objectId
        object.fetch().then(function(object) {
            if (name)
                object.set("name", name)
            if(defaultType)
                object.set("defaultType", defaultType)
            if (fileName) {
                var url = cons.FILE_URL + "/" + fileName
                media = new Parse.File()
                media['_name'] = fileName
                media['_url'] = url
                object.set("icon", media)
            }
            if(facebookAccessToken || !(facebookAccessToken === object.get("facebookAccessToken")))
                object.set("facebookAccessToken", facebookAccessToken)
            if(facebookPostPath || !(facebookPostPath === object.get("facebookPostPath")))
                object.set("facebookPostPath", facebookPostPath)
            if(appVersion || !(appVersion === object.get("appVersion")))
                object.set("appVersion", appVersion)
            if(companyName || !(companyName === object.get("companyName")))
                object.set("companyName", companyName)
            util.save(object, response)
        }, function(error) {
            response.error(error)
        }); 
    } 
});
Parse.Cloud.define("deleteApp", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Admin_App"))
        object.id = objectId
        util.fetchAndDestroy(object, response)
    } else {
        response.error("please supply the objectId");
    }
});