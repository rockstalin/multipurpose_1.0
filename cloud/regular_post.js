var util = require('./util.js');
var cons = require('../constants.js');
Parse.Cloud.define("fetchPost", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var query = new Parse.Query("Regular_Post");
        query.equalTo("objectId",objectId)
        query.include("category,user,updatedBy,approvedBy,app")
        query.first().then(function(object) {
            if (object) {
                response.success(object)
            } else {
                response.error("No such object found")
            }
        }, function(error) {
            response.error(error)
        });
    }
});
Parse.Cloud.define("addFakeData", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var object = new(Parse.Object.extend("Regular_Post"))
        object.id = objectId
        object.fetch().then(function(object) {
            var maximum = cons.FAKE_MINIMUM;
            var minimum = cons.FAKE_MAXIMUM;
            var fake1 = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
            var fake2 = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
            if(fake1<fake2){
                object.set("fakeLikes",fake1)
                object.set("fakeViews",fake2)
            }else{
                object.set("fakeLikes",fake2)
                object.set("fakeViews",fake1)
            }
            return object.save()
        }).then(function(object){
            response.success(object)
        }, function(error) {
            response.error(error)
        });
    }
}); 

Parse.Cloud.define("posts", function(request, response) {

    var appId = request.headers['app-id']
    var type = request.params.type;
    var status = request.params.status;
    var allApps = request.params.allApps;

    var userId = request.params.userId;
    var otherUserId = request.params.otherUserId;
    var categoryId = request.params.categoryId;
    var search = request.params.search;
    var limit = request.params.limit;
    
    var publishedAt = request.params.publishedAt;
    if (publishedAt)
        publishedAt = new Date(publishedAt)
    else if(type && !(type === "admin"))
        publishedAt = new Date()
    
    if(limit)
        limit = Number(limit)
    else
        limit = 10;

    if (!appId) {
        response.error("please supply the appId")
    }else if (!type) {
        response.error("please supply the type")
    }else if (type === "mySubscribed" && !userId) {
        response.error("please supply the userId")
    } else {
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var category = undefined
        if(categoryId){
            category = new(Parse.Object.extend("Regular_Category"))
            category.id = categoryId;
        }
        var user = undefined
        if(userId){
            user = new(Parse.Object.extend("_User"))
            user.id = userId;
        }

        var query = new Parse.Query("Regular_Post");

        if(search){
            var array = splitToKeywords(search)
            // Scaleable search, based on keywords !! exact matching
            
            var queryKeyword = new Parse.Query("Regular_Post");
            queryKeyword.containsAll("keywords", array)

            var queryTitle = new Parse.Query("Regular_Post");
            queryTitle.matches("title", search, "i");
            
            var queryDescription = new Parse.Query("Regular_Post");
            queryDescription.matches("description", search, "i");
            
            query = Parse.Query.or(queryKeyword,queryTitle, queryDescription);
        }
        if(otherUserId){
            var otherUser = new(Parse.Object.extend("_User"))
            otherUser.id = otherUserId;
            query.equalTo("user", otherUser);
        }
        if(type === "trending"){
            var now = new Date();
            var monthMs = now.getTime() - 1000 * 60 * 60 * 24 * 30;
            now.setTime(monthMs);
            query.descending("views");
            if(appId === "dc5DDrODem"){

            }else{
            	query.greaterThan("publishedAt", now);
            }
        }
        else if(type === "admin"){
            query.descending("createdAt");
        }else {
            query.descending("publishedAt");
        }
        query.limit(limit);
        if(allApps && allApps === "yes"){
            // don't look for any app
        }else{
            query.equalTo("app", app)
        }
        if(category)
            query.equalTo("category", category)
        if(status)
            query.equalTo("status", status)
        query.include("category,user,updatedBy,approvedBy,app")
        query.lessThan("flagCount",2)
        if (publishedAt)
            query.lessThan("publishedAt", publishedAt);
        
        if(type === "mySubscribed"){
            var querySubs = new Parse.Query("Regular_Subscription");
            querySubs.equalTo("user", user);
            querySubs.equalTo("app", app);
            querySubs.find().then(function(res){
                if (res.length > 0) {
                    var categories = [];
                    for (var i = 0; i < res.length; i++) {
                        var obj = res[i];
                        categories.push(obj.get("category").id);
                    }
                    var catQuery = new Parse.Query("Regular_Category");
                    catQuery.containedIn("objectId", categories);
                    query.matchesQuery("category", catQuery);
                    find(query,user,response)
                }
                else {
                	var newArray = []
                    response.success(newArray);
                }
            },function(error){

            })
        }else{
            find(query,user,response)
        }
    }// else validation
});
function find(query,user,response){
    var allPosts = undefined
    var allActivities = undefined
    query.find().then(function(results) {
        allPosts = results
        if(user){
            var myLikQuery = new Parse.Query("Regular_Activity");
            myLikQuery.equalTo("type", "like");
            myLikQuery.equalTo("fromUser", user);
            myLikQuery.containedIn("post", allPosts);
            myLikQuery.equalTo("status", "active");
            return myLikQuery.find()
        }else{
            return undefined
        }
    }).then(function(objects){
        allActivities = objects
        if(user){
            var myLikQuery = new Parse.Query("Regular_Favourite");
            myLikQuery.equalTo("user", user);
            myLikQuery.containedIn("post", allPosts);
            return myLikQuery.find()
        }else{
            return undefined
        }
    }).then(function(objects){
        for (var i = 0; i < allPosts.length; i++) {
            var objPost = allPosts[i];
            objPost.set("myLike", false);
            objPost.set("myFavourite", false);
            objPost.dirty = function() {
                return false;
            };
            objPost.set("likes", objPost.get("likes") + objPost.get("fakeLikes"));
            objPost.set("views", objPost.get("views") + objPost.get("fakeViews"));
            if(allActivities){
                for (var j = 0; j < allActivities.length; j++) {
                    if (objPost.id === allActivities[j].get("post").id) {
                        objPost.set("myLike", true);
                        break;
                    }
                };
            }
            if(objects){
                for (var j = 0; j < objects.length; j++) {
                    if (objPost.id === objects[j].get("post").id) {
                        objPost.set("myFavourite", true);
                        break;
                    }
                };
            }
        }
        return allPosts
    }).then(function(allPosts){
        response.success(allPosts)
    }, function(error) {
        response.error(error)
    });
}
function splitToKeywords(text){
    var search = text.trim().replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '')
    search = search.toLowerCase()
    var arr = search.split(" ")
    var finalArr = []
    for (var i = 0; i < arr.length; i++) {
        var value = arr[i].trim()
        if(value.length>0 && !(finalArr.indexOf(value) > -1)){
            finalArr.push(value)
        }
    }
    return finalArr
}
Parse.Cloud.define("addPost", function(request, response) {

    var appId = request.headers['app-id']
    if(!appId){
        // used for approval of editor's post
        appId = request.params.forceAppId
    }
    var userId = request.params.userId;
    var approvedBy = request.params.approvedBy;
    var status = request.params.status;
    if(status){
        // should be approved one
    }else{
        status = "new"
    }

    var categoryId = request.params.categoryId;
    var type = request.params.type;
    var title = request.params.title;
    var description = request.params.description;
    
    var fileName = request.params.fileName;
    var fileNameThumbnail = request.params.fileNameThumbnail;
    var link = request.params.link;
    var aspectRatio = Number(request.params.aspectRatio);

    var duration = request.params.duration;
    var youtubeId = request.params.youtubeId;
    var publishedAt = request.params.publishedAt
    if(publishedAt)
        publishedAt = new Date(publishedAt);

    var push = Number(request.params.push);
    
    if (!appId) {
        response.error("please supply appId")
    } else if (!categoryId) {
        response.error("please supply categoryId")
    } else if (!userId) {
        response.error("please supply userId")
    } else if (!type) {
        response.error("please supply type")
    } else if (!title) {
        response.error("please supply title")
    } else if (!description) {
        response.error("please supply description")
    } else if (push === undefined) {
        response.error("please supply push")
    } else if (type === "video" && !fileNameThumbnail) {
        response.error("please supply fileNameThumbnail")
    } else if ((type === "image" || type === "video") && !fileName) {
        response.error("please supply fileName")
    } 
    else if ((type === "youtube" || type === "news") && !publishedAt) {
        response.error("please supply publishedAt")
    } else if (type === "youtube" && !youtubeId) {
        response.error("please supply youtubeId")
    } else if (type === "youtube" && !duration) {
        response.error("please supply duration")
    } else {
        if(push === 1)
            push = true
        else
            push = false
        if(request.params.fbUpload && Number(request.params.fbUpload) === 1)
            var fbUpload = true
        else
            var fbUpload = false
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var category = new(Parse.Object.extend("Regular_Category"))
        category.id = categoryId;
        description = description.trim()
        title = title.trim()
        var fake1 = 0
        var fake2 = 0
        if(status === "new"){
        }else{
            var maximum = cons.FAKE_MINIMUM;
            var minimum = cons.FAKE_MAXIMUM;
            var fake1 = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
            var fake2 = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
        }
        
        var object = new(Parse.Object.extend("Regular_Post"))
        object.set("app", app)
        object.set("category", category)
        object.set("type", type)
        object.set("keywords", splitToKeywords(title))
        object.set("title", title)
        object.set("description", description)
        if(fake1<fake2){
            object.set("fakeLikes",fake1)
            object.set("fakeViews",fake2)
        }else{
            object.set("fakeLikes",fake2)
            object.set("fakeViews",fake1)
        }
        object.set("likes", 0)
        object.set("views", 0)
        object.set("comments", 0)
        object.set("flagCount", 0)
        object.set("favourites", 0)
        object.set("push", push)
        object.set("status", status)

        if(approvedBy){
            var user = new(Parse.Object.extend("_User"))
            user.id = approvedBy;      
            object.set("approvedBy",user)
        }

        if(userId){
            var user = new(Parse.Object.extend("_User"))
            user.id = userId;      
            object.set("user",user)
        }

        if(aspectRatio)
            object.set("aspectRatio", aspectRatio)
        if (fileName) {
            var url = cons.FILE_URL + "/" + fileName
            var media = new Parse.File()
            media['_name'] = fileName
            media['_url'] = url
            object.set("media", media)
        }
        if (fileNameThumbnail) {
            var url = cons.FILE_URL + "/" + fileNameThumbnail
            var mediaThumbnail = new Parse.File()
            mediaThumbnail['_name'] = fileNameThumbnail
            mediaThumbnail['_url'] = url
            object.set("mediaThumbnail", mediaThumbnail)
        }
        if (link)
            object.set("link", link)
        if (duration)
            object.set("duration", duration)
        if (youtubeId)
            object.set("youtubeId", youtubeId)
        if (!publishedAt)
            publishedAt = new Date()
        object.set("publishedAt", publishedAt)

        if (youtubeId && type === "youtube") {
            var query = new Parse.Query("Regular_Post");
            query.equalTo("youtubeId", youtubeId);
            query.equalTo("app", app);
            query.equalTo("type", "youtube");
            query.first().then(function(objectExisting) {
                if (objectExisting) {
                    response.error("Video With youtubeId = " + youtubeId + " already exists")
                } else {
                    save(object, push, response,undefined,undefined,fbUpload,undefined)
                }
            }, function(error) {
                response.error(error)
            });
        } else {
            save(object, push, response,undefined,undefined,fbUpload,undefined)
        }
    }
});

function save(object, push, response,isUpdate,oldCategory,fbUpload,oldFileName) {
    var isSavingForFB = false
    var isRemovingFromFB = false
    object.save().then(function(object) {
        if(!isUpdate || oldCategory)
        {
            var category = object.get("category")
            category.increment("postCount")
            return category.save()
        }
    }).then(function(category) {
        if(oldCategory){
            oldCategory.increment("postCount",-1)
            return oldCategory.save()
        }
    }).then(function(category) {
        return object.get("category").fetch()
    }).then(function(category) {
        if(object.get("type") === "image" && !object.get("facebookPostId")){
            if(fbUpload === true){
                isSavingForFB = true
                var objectFb = new(Parse.Object.extend("Scheduled_For_Facebook"))
                objectFb.set("app", object.get("app"))
                objectFb.set("publishedAt", object.get("publishedAt"))
                objectFb.set("post", object)
                return objectFb.save()
            }else{
                isRemovingFromFB = true
                var query = new Parse.Query("Scheduled_For_Facebook");
                query.equalTo("app", object.get("app"));
                query.equalTo("post", object);
                return query.first()
            }
        }else{
            return object;
        }
    }).then(function(objectFb) {
        if(isRemovingFromFB && objectFb){
            return objectFb.destroy();
        }
        else if(isSavingForFB && objectFb){
            object.set("facebookSchedule",objectFb)
            return object.save()
        }else{
            return object
        }
    }).then(function(objectFb) {
        if(isRemovingFromFB){
            object.unset("facebookSchedule")
            return object.save()
        }else{
            return object
        }
    }).then(function(object) {
        if(oldFileName){
             var url = cons.BASE_URL_LOCAL_Files+"/"+oldFileName
             return Parse.Cloud.httpRequest({
                        method: 'DELETE',
                        url:url,
                        headers: {
                            "X-Parse-Application-Id": cons.APP_ID,
                            "X-Parse-REST-API-Key" : cons.REST_KEY,
                            "X-Parse-Master-Key":cons.MASTER_KEY
                        }
                    })
        }else{
            return undefined
        }
    }).then(function(obj) {
        response.success(object)
    }, function(error) {
        response.error(error)
    });
}

Parse.Cloud.define("updatePost", function(request, response) {

    var objectId = request.params.objectId
    var adminId = request.params.adminId
    var approvedBy = request.params.approvedBy;
    var status = request.params.status;

    var categoryId = request.params.categoryId;
    var type = request.params.type;
    var title = request.params.title;
    var description = request.params.description;
    
    var fileName = request.params.fileName;
    var fileNameThumbnail = request.params.fileNameThumbnail;
    var link = request.params.link;
    var aspectRatio = Number(request.params.aspectRatio);

    var duration = request.params.duration;
    var youtubeId = request.params.youtubeId;
    var publishedAt = request.params.publishedAt
    if(publishedAt)
        publishedAt = new Date(publishedAt);

    var push = Number(request.params.push);
    if(push === 1)
        push = true
    else
        push = false
    if(request.params.fbUpload && Number(request.params.fbUpload) === 1)
        var fbUpload = true
    else
        var fbUpload = false
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var object = new(Parse.Object.extend("Regular_Post"))
        object.id = objectId
        object.fetch().then(function(object) {
            var category = undefined
            var oldCategory = object.get("category")
            if(categoryId && !(categoryId === oldCategory.id)){
                category = new(Parse.Object.extend("Regular_Category"))
                category.id = categoryId;
            }
			if(adminId){
		        var user = new(Parse.Object.extend("_User"))
		        user.id = adminId;      
		        object.set("updatedBy",user)
			}
            if(approvedBy){
                var user = new(Parse.Object.extend("_User"))
                user.id = approvedBy;      
                object.set("approvedBy",user)
            }
            if(status){
                object.set("status", status);
            }
            if(category){
                object.set("category", category);
            }
            if(type)
                object.set("type", type)
            if(title){
                object.set("keywords", splitToKeywords(title))
                object.set("title", title)
            }
            if(description)
                object.set("description", description)
            var oldFileName
            if (fileName) {
                if(object.get("media"))
                    oldFileName = object.get("media").name()
                var url = cons.FILE_URL + "/" + fileName
                var media = new Parse.File()
                media['_name'] = fileName
                media['_url'] = url
                object.set("media", media)
            }
            if (fileNameThumbnail) {
                var url = cons.FILE_URL + "/" + fileNameThumbnail
                var mediaThumbnail = new Parse.File()
                mediaThumbnail['_name'] = fileNameThumbnail
                mediaThumbnail['_url'] = url
                object.set("mediaThumbnail", mediaThumbnail)
            }
            if (link)
                object.set("link", link)
            if(!(push === object.get("push")))
                object.set("push", push)
            if (duration)
                object.set("duration", duration)
            if (youtubeId)
                object.set("youtubeId", youtubeId)
            if (publishedAt)
                object.set("publishedAt", publishedAt)
            if(aspectRatio)
                object.set("aspectRatio", aspectRatio)

            if (youtubeId && type === "youtube") {
                var query = new Parse.Query("Regular_Post");
                query.equalTo("youtubeId", youtubeId);
                query.equalTo("type", "youtube");
                query.first().then(function(objectExisting) {
                    if (objectExisting && !(objectExisting.get("youtubeId") === youtubeId) ) {
                        response.error("Video With youtubeId = " + youtubeId + " already exists")
                    } else {
                        if(category)
                            save(object, push, response,true,oldCategory,fbUpload,oldFileName)
                        else
                            save(object, push, response,true,undefined,fbUpload,oldFileName)
                    }
                }, function(error) {
                    response.error(error)
                });
            } else {
                if(category)
                    save(object, push, response,true,oldCategory,fbUpload,oldFileName)
                else
                    save(object, push, response,true,undefined,fbUpload,oldFileName)
            }
        }, function(error) {
            response.error(error)
        });
    }
});

Parse.Cloud.define("incrementPostView", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var object = new(Parse.Object.extend("Regular_Post"))
        object.id = objectId
        object.fetch().then(function(object) {
            object.increment("views")
            util.save(object,response)
        }, function(error) {
            response.error(error)
        });
    }
});
Parse.Cloud.define("deletePost", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var fbObj;
        var fileName;
        var object = new(Parse.Object.extend("Regular_Post"))
        object.id = objectId
        object.fetch().then(function(object) {
            if(object.get("facebookSchedule")){
                fbObj = object.get("facebookSchedule");
            }
            if(object.get("media"))
                fileName = object.get("media").name()
            return object.destroy()
        }).then(function(object) {
            var category = object.get("category")
            category.increment("postCount", -1)
            return category.save()
        }).then(function(object) {
            if(fbObj)
                return fbObj.destroy()
            else
                return object
        }).then(function(unknown){
            if(fileName){
                 var url = cons.BASE_URL_LOCAL_Files+"/"+fileName
                 return Parse.Cloud.httpRequest({
                            method: 'DELETE',
                            url:url,
                            headers: {
                                "X-Parse-Application-Id": cons.APP_ID,
                                "X-Parse-REST-API-Key" : cons.REST_KEY,
                                "X-Parse-Master-Key":cons.MASTER_KEY
                            }
                        })
             }else{
                return undefined
             }
        }).then(function(){
            response.success("object deleted !!")
        }, function(error) {
            response.error(error)
        })
    }
});
Parse.Cloud.define("forcePublishToFb", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{

        var query = new Parse.Query("Regular_Post");
        query.equalTo("objectId", objectId);
        query.include("app")
        query.first().then(function(object) {
             var app = object.get("app")
             if(object.get("media") && object.get("type") === "image" && app.get("facebookPostPath") && app.get("facebookAccessToken")){
                Parse.Cloud.httpRequest({
                  url: "https://graph.facebook.com"+app.get("facebookPostPath"),
                  headers: {
                      'Content-Type': "application/x-www-form-urlencoded"
                  },
                  method:'POST',
                  body: {"access_token":app.get("facebookAccessToken"),url:object.get("media").url()}
                }).then(function(httpResponse) {
                    var fbPostId = httpResponse.data['post_id']
                    object.set("facebookPostId",fbPostId)
                    object.save().then(function(){
                        response.success(object)
                    })
                },function(error){
                    response.error(error)
                });
             }else{
                response.error("Either fb settings are missing or post type is not image")
             }
             
        }, function(error) {
            response.error(error)
        });
    }
});
Parse.Cloud.define("forceSendPush", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var object = new(Parse.Object.extend("Regular_Post"))
        object.id = objectId
        object.fetch().then(function(object) {
            var app = object.get("app")
            var pushQuery = new Parse.Query(Parse.Installation);
            pushQuery.equalTo("app", app)
            var data = {
                alert: object.get("title"),
                sound: "default",
                type: "post",
                id: object.id
            }
            Parse.Push.send({
                where: pushQuery,
                data: data
            }, {
                useMasterKey: true
            })
            .then(function() {
                object.set("pushSent",true)
                object.save().then(function(object){
                    response.success(object)
                },function(error){
                    response.error(error)
                });
            }, function(error) {
                response.error(error)
            });
        }, function(error) {
            response.error(error)
        });
    }
});

Parse.Cloud.define("requestPost", function(request, response) {

    var appId = request.headers['app-id']
    var userId = request.params.userId;
    var type = request.params.type;
    var fileName = request.params.fileName;
    var fileNameThumbnail = request.params.fileNameThumbnail;
    var appVersion = request.params.appVersion
    var timeZone = request.params.timeZone;

    if (!appId) {
        response.error("please supply appId")
    }else if (!userId) {
        response.error("please supply userId")
    }else if (!type) {
        response.error("please supply type")
    }else if (!fileName) {
        response.error("please supply fileName")
    }else if (!appVersion) {
        response.error("please supply appVersion")
    }else if (!timeZone) {
        response.error("please supply timeZone")
    }else if (type === "video" && !fileNameThumbnail) {
        response.error("please supply fileNameThumbnail")
    }else{
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var user = new(Parse.Object.extend("_User"))
        user.id = userId;        

        var object = new(Parse.Object.extend("Regular_Post_Request"))
        object.set("app", app)
        object.set("fromUser", user)
        object.set("type", type)
        object.set("appVersion", appVersion)
        object.set("timeZone", timeZone)
        
        var url = cons.FILE_URL + "/" + fileName
        var media = new Parse.File()
        media['_name'] = fileName
        media['_url'] = url
        object.set("media", media)
        
        if (fileNameThumbnail) {
            var url = cons.FILE_URL + "/" + fileNameThumbnail
            var mediaThumbnail = new Parse.File()
            mediaThumbnail['_name'] = fileNameThumbnail
            mediaThumbnail['_url'] = url
            object.set("mediaThumbnail", mediaThumbnail)
        }
        util.save(object,response)
    }
});
Parse.Cloud.define("requestedPostList", function(request, response) {
    var appId = request.headers['app-id']
    if (!appId) {
        response.error("please supply appId")
    }else{
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;
        var limit = 10
        var createdAt = request.params.createdAt;
        if (createdAt)
            var createdAt = new Date(createdAt)
        var query = new Parse.Query("Regular_Post_Request");
        // query.equalTo("app",app)
        query.descending("createdAt");
        query.limit(limit);
        query.include("fromUser")
        if (createdAt)
            query.lessThan("createdAt", createdAt);
        util.find(query,response)
    }
});