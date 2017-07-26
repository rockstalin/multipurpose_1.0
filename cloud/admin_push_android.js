var util = require('./util.js');
var cons = require('../constants.js');
Parse.Cloud.define("androidPushList", function(request, response) {
    var query = new Parse.Query("Android_Push")
    query.ascending("referenceName");
    query.limit(1000);
    util.find(query, response)
});
Parse.Cloud.define("addAndroidPush", function(request, response) {
    var referenceName = request.params.referenceName;
    var senderId = request.params.senderId;
    var apiKey = request.params.apiKey;
    
    if (!referenceName) {
        response.error("please supply the referenceName")
    }else if (!senderId) {
        response.error("please supply the senderId")
    }else if (!apiKey) {
        response.error("please supply the apiKey")
    }else{      
        var object = new(Parse.Object.extend("Android_Push"))
        object.set("referenceName", referenceName)
        object.set("senderId", senderId)
        object.set("apiKey", apiKey)
        util.save(object, response)
    }
});
Parse.Cloud.define("updateAndroidPush", function(request, response) {
    var objectId = request.params.objectId;
    var referenceName = request.params.referenceName;
    var senderId = request.params.senderId;
    var apiKey = request.params.apiKey;

    if (!objectId) {
        response.error("please supply the objectId")
    }else if (!referenceName) {
        response.error("please supply the referenceName")
    }else if (!senderId) {
        response.error("please supply the senderId")
    }else if (!apiKey) {
        response.error("please supply the apiKey")
    }else {
        var object = new(Parse.Object.extend("Android_Push"))
        object.id = objectId
        object.fetch().then(function(object) {
            object.set("referenceName", referenceName)
            object.set("senderId", senderId)
            object.set("apiKey", apiKey)
            util.save(object, response)
        }, function(error) {
            response.error(error)
        }); 
    } 
});

Parse.Cloud.define("deleteAndroidPush", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Android_Push"))
        object.id = objectId
        object.fetch().then(function(object) {
            return object.destroy()
        }).then(function(object) {
             response.success(object)
        }, function(error) {
            response.error(error)
        })
    } else {
        response.error("please supply the objectId");
    }
});