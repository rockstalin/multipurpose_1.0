var util = require('./util.js');
var cons = require('../constants.js');

Parse.Cloud.define("addFakeDataToCategory", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var object = new(Parse.Object.extend("Regular_Category"))
        object.id = objectId
        object.fetch().then(function(object) {
            var maximum = cons.FAKE_MINIMUM;
            var minimum = cons.FAKE_MAXIMUM;
            var fake = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
            object.set("fakeSubscribers",fake)
            return object.save()
        }).then(function(object){
            response.success(object)
        }, function(error) {
            response.error(error)
        });
    }
}); 

Parse.Cloud.define("categories", function(request, response) {

    var appId = request.headers['app-id']
    var userId = request.params.userId;
    if (!appId) {
        response.error("please supply appId")
    } else {
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var query = new Parse.Query("Regular_Category");
        query.equalTo("app", app)
        query.exists("name")
        query.exists("subscribers")
        query.exists("fakeSubscribers")
        query.exists("postCount")
        query.limit(1000);
        query.find().then(function(results) {
            return results
        }).then(function(results){
            if (!userId) {
                for (var i = 0; i < results.length; i++) {
                    var obj = results[i];
                    obj.set("subscribers", obj.get("subscribers") + obj.get("fakeSubscribers"));
                    obj.dirty = function() {
                        return false;
                    };
                    // if(appId === "BLDlTa68t3"){
                    //     var json = {url:'',name:''}
                    //     obj.set("image",json)
                    // }
                }
                return results
            } else {
                var user = new(Parse.Object.extend("_User"))
                user.id = userId;

                var mySubscribeQuery = new Parse.Query("Regular_Subscription");
                mySubscribeQuery.equalTo("user", user)
                mySubscribeQuery.equalTo("app", app)
                mySubscribeQuery.containedIn("category", results);
                return mySubscribeQuery.find().then(function(objects) {
                    for (var i = 0; i < results.length; i++) {
                        var obj = results[i];
                        var mySubscribe = false;
                        for (var j = 0; j < objects.length; j++) {
                            var objSubscribe = objects[j];
                            var cId = objSubscribe.get("category").id;
                            if (cId === obj.id) {
                                mySubscribe = true;
                                break;
                            }
                        };
                        obj.set("mySubscribe", mySubscribe);
                        obj.set("subscribers", obj.get("subscribers") + obj.get("fakeSubscribers"));
                        obj.dirty = function() {
                            return false;
                        };
                    };
                    return results;
                })
            } //else
        }).then(function(results){
            response.success(results);
        }, function(error) {
            response.error(error)
        })
    } // else
});

Parse.Cloud.define("addCategory", function(request, response) {
    var appId = request.headers['app-id']
    var fileName = request.params.fileName;
    var name = request.params.name;
    
    if (!appId) {
        response.error("please supply appId")
    } else if (!name) {
        response.error("please supply name")
    } else {
        var maximum = cons.FAKE_MINIMUM;
        var minimum = cons.FAKE_MAXIMUM;
        var fake = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var object = new(Parse.Object.extend("Regular_Category"))
        object.set("app", app)
        object.set("name", name)
        object.set("fakeSubscribers", fake)
        object.set("postCount", 0)
        object.set("subscribers", 0)
        if(fileName){
            var url = cons.FILE_URL + "/" + fileName
            var media = new Parse.File()
            media['_name'] = fileName
            media['_url'] = url
            object.set("image", media)
        }
        util.save(object,response)
    }

});
Parse.Cloud.define("updateCategory", function(request, response) {
    var objectId = request.params.objectId;
    var appId = request.headers['app-id']
    var fileName = request.params.fileName;
    var name = request.params.name;
    
    if (!objectId) {
        response.error("please supply objectId")
    }else if (!appId) {
        response.error("please supply appId")
    } else if (!name && !fileName) {
        response.error("please supply name or fileName")
    } else {
        var object = new(Parse.Object.extend("Regular_Category"))
        object.id = objectId
        object.fetch().then(function(object) {
            if(name){
                object.set("name", name);
            }
            if(fileName){
                var url = cons.FILE_URL + "/" + fileName
                var media = new Parse.File()
                media['_name'] = fileName
                media['_url'] = url
                object.set("image", media)
                
            }
            util.save(object,response)
        }, function(error) {
            response.error(error)
        });
    }
});
Parse.Cloud.define("deleteCategory", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var category = new(Parse.Object.extend("Regular_Category"))
        category.id = objectId;

        var queryCount = new Parse.Query("Regular_Post");
        queryCount.equalTo("category",category)
        queryCount.count().then(function(count) {
            if (count > 0) {
                response.error("this category contains " + count + " posts, request admin to delete this catgory")
            } else {
                var object = new(Parse.Object.extend("Regular_Category"))
                object.id = objectId
                util.fetchAndDestroy(object, response)
            } 
        }, function(error) {
            response.error(error);
        });
    } //if
    else {
        response.error("please supply the objectId");
    }
});

Parse.Cloud.define("validatePostCount", function(request, response) {

    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Regular_Category"))
        object.id = objectId
        object.fetch().then(function(object) {
            var queryCount = new Parse.Query("Regular_Post");
            queryCount.equalTo("category",object)
            return queryCount.count()
        }).then(function(count){
            if (count === object.get("postCount")) {
                response.success("no need to update the category");
            }else{
                object.set("postCount",count)
                util.save(object,response)
            }
        }, function(error) {
            response.error(error)
        });
    }else {
        response.error("please supply the objectId");
    }
});
Parse.Cloud.define("validateAllPostCount", function(request, response) {
    var queryUser = new Parse.Query("Regular_Category");
    queryUser.limit(1000)
    queryUser.find().then(function(results){
        catHandler(results,response,0)
    },function(error){
        response.error(error)
    })
});
function catHandler(cats,response,index){
    if(cats.length === index){
        response.success(cats.length+" validated")
    }
    else{
        var oldObj = cats[index]
        var queryCount = new Parse.Query("Regular_Post");
        queryCount.equalTo("category",oldObj)
        queryCount.count().then(function(count){
            if (count === oldObj.get("postCount")) {
                return count
            }else{
                oldObj.set("postCount",count)
                return oldObj.save()
            }
        }).then(function(){
            catHandler(cats,response,index+1)
        },function(error){
            response.error(error)
        })
    }
}