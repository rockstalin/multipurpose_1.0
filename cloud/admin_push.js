var util = require('./util.js');
var cons = require('../constants.js');
Parse.Cloud.define("push", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Admin_Push"))
        object.id = objectId
        object.fetch().then(function(obj){
            response.success(obj)
        },function(error){
            response.error(error)
        })
    } 
    else {
        var appId = request.headers['app-id']
        var status = request.params.status;
        var route = request.params.route;
        var type = request.params.type;
        var post = request.params.post;
        var onlyPost = request.params.onlyPost;
        var createdAt = request.params.createdAt;
        var deviceType = request.params.deviceType;
        var limit = 30;
        if (!appId) {
            response.error("please supply appId")
        }else if (post === undefined) {
            response.error("please supply post")
        }else if (onlyPost === undefined) {
            response.error("please supply onlyPost")
        }else if (!deviceType) {
            response.error("please supply deviceType")
        }else {
            var app = new(Parse.Object.extend("Admin_App"))
            app.id = appId;

            var query = new Parse.Query("Admin_Push")
            query.limit(limit)
            query.equalTo("app", app)
            deviceType = deviceType.toLowerCase()
            if(deviceType === "both"){
                
            }else{
                if(deviceType === "android")
                    deviceType = "ios"
                else if(deviceType === "ios")
                    deviceType = "android"
                query.notEqualTo("app", deviceType)    
            }
            
            if (status)
                query.equalTo("status", status)
            if (route)
                query.equalTo("route", route)
            if (type)
                query.equalTo("type", type)
            if(onlyPost=== true)
                query.exists("post")
            if (post === false) {
                query.doesNotExist("post")
            }
            if(createdAt)
                query.lessThan("createdAt", (new Date(createdAt)))
            query.descending("createdAt");
            util.find(query,response)
        }
    }
});
Parse.Cloud.define("addPush", function(request, response) {

    var appId = request.headers['app-id']
    var type = request.params.type;
    var title = request.params.title;
    var content = request.params.content;
    var status = request.params.status;
    var route = request.params.route;
    var allApp = request.params.allApp;
    var link = request.params.link;
    var fileName = request.params.fileName;
    var userId = request.params.userId;
    var deviceType = request.params.deviceType;
    if (!deviceType) {
       deviceType = "both"
    } 
    var user = undefined
    if(userId)
    {
        var user = new(Parse.Object.extend("_User"))
        user.id = userId;
    }
    var media = undefined
    if (fileName) {
        var url = cons.FILE_URL + "/" + fileName
        media = new Parse.File()
        media['_name'] = fileName
        media['_url'] = url
    }

    if (!appId) {
        response.error("please supply appId")
    } else if (!type) {
        response.error("please supply type")
    } else if (!title) {
        response.error("please supply title")
    } else if (!content) {
        response.error("please supply content")
    } else if (!status) {
        response.error("please supply status")
    } else if (!route) {
        response.error("please supply route")
    } else if (type !== "general" && !link) {
        response.error("please supply link")
    } else {
        recursiveAdd(appId, type, title, content, link, status, route, media, false, response,allApp,user,deviceType)
    }
});

function recursiveAdd(appId, type, title, content, link, status, route, media, finish, response,allApp,user,deviceType) {
    var app = new(Parse.Object.extend("Admin_App"))
    app.id = appId;

    var object = new(Parse.Object.extend("Admin_Push"))
    object.set("app", app)
    object.set("opened", 0)
    object.set("cancelled", 0)
    object.set("views", 0)
    object.set("deviceType", deviceType)
    if (route === "both") {
        if (finish === true)
            object.set("route", "push")
        else
            object.set("route", "launch")
    } else {
        object.set("route", route)
        finish = true
    }
    object.set("status", status)
    object.set("type", type)
    object.set("title", title)
    object.set("content", content)
    if (link)
        object.set("link", link)
    if (user)
        object.set("user", user)
    if (media)
        object.set("media", media)
    object.save().then(function(object) {
        if (object.get("route") === "push")
        {
            var isImage =  object.get("media") ? true : false
            sendPush(title, object.id, type,isImage,response, object,allApp,app,user,deviceType)
        }
        else {
            if (finish === true) {
                response.success(object)
            } else
                recursiveAdd(appId, type, title, content, link, status, route, media, true, response,allApp,user,deviceType)
        }
    }, function(error) {
        response.error(error)
    });
}
Parse.Cloud.define("updatePush", function(request, response) {
    var objectId = request.params.objectId;
    var type = request.params.type;
    var title = request.params.title;
    var content = request.params.content;
    var link = request.params.link;
    var status = request.params.status;
    var fileName = request.params.fileName;
    var deviceType = request.params.deviceType;
    var media = undefined
    if (fileName) {
        var url = cons.FILE_URL + "/" + fileName
        media = new Parse.File()
        media['_name'] = fileName
        media['_url'] = url
    }

    if (!objectId) {
        response.error("please supply objectId")
    } else {
        var object = new(Parse.Object.extend("Admin_Push"))
        object.id = objectId
        object.fetch().then(function(object) {
            if (deviceType)
                object.set("deviceType", deviceType)
            if (status)
                object.set("status", status)
            if (type)
                object.set("type", type)
            if (title)
                object.set("title", title)
            if (content)
                object.set("content", content)
            if (link)
                object.set("link", link)
            if (media)
                object.set("media", media)
            util.save(object,response)
        }, function(error) {
            response.error(error)
        }); // fetch
    }

});
Parse.Cloud.define("deletePush", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Admin_Push"))
        object.id = objectId
        util.fetchAndDestroy(object,response)
    } 
    else {
        response.error("please supply the objectId");
    }
});
Parse.Cloud.define("incrementPushData", function(request, response) {

    var objectId = request.params.objectId;
    var parameter = request.params.parameter;
    if (objectId && parameter) {
        var object = new(Parse.Object.extend("Admin_Push"))
        object.id = objectId
        object.increment(parameter);
        util.save(object,response)
    } 
    else if (objectId) {
        response.error("please supply parameter")
    } else {
        response.error("please supply objectId")
    }
});

function sendPush(alert, id, type,image, response, results,allApp,app,user,deviceType) {
    var pushQuery = new Parse.Query(Parse.Installation);
    if(!(allApp === undefined)){
        var allApp = Number(allApp);
        if(allApp === 1){

        }else{
            pushQuery.equalTo("app", app)
        }
    }else{
        pushQuery.equalTo("app", app)
    }
    if(user)
        pushQuery.equalTo("user", user)
    if(deviceType === "both"){
                
    }else{
        pushQuery.equalTo("deviceType", deviceType)    
    }
    var data = {
                alert: alert,
                sound: "default",
                type: type,
                image: image,
                id: id
            }
    util.sendPush(pushQuery,data,results,response)
}