var util = require('./util.js');
Parse.Cloud.define("subscribe", function(request, response) {

    var appId = request.headers['app-id']
    var categoryId = request.params.categoryId;
    var userId = request.params.userId;
    var appVersion = request.params.appVersion;
    var timeZone = request.params.timeZone;

    if (!appId) {
        response.error("please supply appId")
    } else if (!categoryId) {
        response.error("please supply categoryId")
    }else if (!userId) {
        response.error("please supply userId")
    }else if (!appVersion) {
        response.error("please supply appVersion")
    } else if (!timeZone) {
        response.error("please supply timeZone")
    }else {
        var newChannelName = undefined
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;
        var user = new(Parse.Object.extend("_User"))
        user.id = userId;
        var category = new(Parse.Object.extend("Regular_Category"))
        category.id = categoryId;

        var query = new Parse.Query("Regular_Subscription");
        query.equalTo("app", app)
        query.equalTo("user", user)
        query.equalTo("category", category)
        query.first().then(function(object) {
            if (object) {
                return undefined
            }else{
                var object = new(Parse.Object.extend("Regular_Subscription"))
                object.set("app", app)
                object.set("user", user)
                object.set("category", category)
                object.set("appVersion", appVersion)
                object.set("timeZone", timeZone)
                return object.save()
            }
        }).then(function(object){
            if(object){
                category.increment("subscribers");
                return category.save() 
            }else{
                return category
            }
        }).then(function(category){
            return category.fetch()
        }).then(function(category){
            newChannelName = category.get("name")
            var query = new Parse.Query("_Installation");
            query.equalTo("user", user)
            return query.find({useMasterKey:true})
        }).then(function(results){
            if(results.length>0){
              for (var i = 0; i < results.length; i++) {
                 var object =  results[i]
                 var channels = object.get("channels")
                 if(!channels){
                    channels = []
                    channels.push(newChannelName)
                 }
                 else {
                    var nameExists = false
                    for (var j = 0; j < channels.length; j++) {
                        if(newChannelName === channels[j])
                        {
                         nameExists = true
                         break 
                        }
                     }
                     if(!nameExists)
                        channels.push(newChannelName)
                 }
                 object.set("channels",channels)
              }
              return Parse.Object.saveAll(results)
            }else{
              return results
            }
        }).then(function(results){
          response.success(results)
        },function(error){
            response.error(error)
        })
    }
});
Parse.Cloud.define("unsubscribe", function(request, response) {

    var appId = request.headers['app-id']
    var userId = request.params.userId;
    var categoryId = request.params.categoryId;

    if (!appId) {
        response.error("please supply appId")
    }else if (!userId) {
        response.error("please supply userId")
    }else if (!categoryId) {
        response.error("please supply categoryId")
    }else {
        var newChannelName = undefined
        var notSubscribed = false
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;
        var user = new(Parse.Object.extend("_User"))
        user.id = userId;
        var category = new(Parse.Object.extend("Regular_Category"))
        category.id = categoryId;

        var query = new Parse.Query("Regular_Subscription")
        query.equalTo("app", app)
        query.equalTo("user", user)
        query.equalTo("category", category)
        query.find().then(function(results) {
            return Parse.Object.destroyAll(results)
        }).then(function(results) {
            if (results.length <= 0) {
                notSubscribed = true
                return category
            } else {
                category.increment("subscribers",-1);
                return category.save()
            }
        }).then(function(category){
            return category.fetch()
        }).then(function(category){
            newChannelName = category.get("name")
            var query = new Parse.Query("_Installation");
            query.equalTo("user", user)
            query.containedIn("channels", [newChannelName])
            return query.find({useMasterKey:true})
        }).then(function(results){
            if(results.length>0){
              for (var i = 0; i < results.length; i++) {
                 var object =  results[i]
                 var channels = object.get("channels")
                 var newArray  = []
                 for (var j = 0; j < channels.length; j++) {
                    if(newChannelName === channels[j])
                      continue
                    newArray.push(channels[j])
                 }
                 object.set("channels",newArray)
              }
              return Parse.Object.saveAll(results)
            }else{
              return results
            }
        }).then(function(results){
            if(notSubscribed)
                response.success("You have not subscribed or already unsubscribed this category")
            else
                response.success(results)
        }, function(error) {
            response.error(error)
        })
    }
});