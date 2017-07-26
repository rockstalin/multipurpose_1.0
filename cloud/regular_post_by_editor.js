var util = require('./util.js');
var cons = require('../constants.js');

Parse.Cloud.define("fetchPostEditor", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var query = new Parse.Query("Regular_Post_By_Editor");
        query.equalTo("objectId",objectId)
        query.include("category,user,app")
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

Parse.Cloud.define("postsEditor", function(request, response) {

    var appId = request.headers['app-id']
    
    var type = request.params.type;
    var categoryId = request.params.categoryId;
    var status = request.params.status;
    var search = request.params.search;
    var limit = request.params.limit;
    var userId = request.params.userId;
    
    var publishedAt = request.params.publishedAt;
    if (publishedAt)
        publishedAt = new Date(publishedAt)
    if(limit)
        limit = Number(limit)
    else
        limit = 20;

    if (!appId) {
        response.error("please supply the appId")
    }else if (!status) {
        response.error("please supply the status")
    }else if (!userId && !type && !(type === "admin" )) {
        response.error("please supply the userId")
    }else {
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var category = undefined
        if(categoryId){
            category = new(Parse.Object.extend("Regular_Category"))
            category.id = categoryId;
        }
        
        var query = new Parse.Query("Regular_Post_By_Editor");

        if(search){
            var array = splitToKeywords(search)
            // Scaleable search, based on keywords !! exact matching
            
            var queryKeyword = new Parse.Query("Regular_Post_By_Editor");
            queryKeyword.containsAll("keywords", array)

            var queryTitle = new Parse.Query("Regular_Post_By_Editor");
            queryTitle.matches("title", search, "i");
            
            var queryDescription = new Parse.Query("Regular_Post_By_Editor");
            queryDescription.matches("description", search, "i");
            
            query = Parse.Query.or(queryKeyword,queryTitle, queryDescription);
        }
        query.include("category,user,reviewedBy,app")
        query.descending("publishedAt");
        query.limit(limit);
        
        if(type && type === "admin" )
        {
            query.notEqualTo("status","approved")
        }
        else {
            query.equalTo("status",status)
            var otherUser = new(Parse.Object.extend("_User"))
            otherUser.id = userId;
            query.equalTo("user", otherUser);
            query.equalTo("app", app)
        }
        if(category)
            query.equalTo("category", category)
        if (publishedAt)
            query.lessThan("publishedAt", publishedAt);
        util.find(query,response)
    }// else validation
});

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
Parse.Cloud.define("addPostEditor", function(request, response) {

    var appId = request.headers['app-id']
    var userId = request.params.userId;
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

    if (!appId) {
        response.error("please supply appId")
    } else if (!categoryId) {
        response.error("please supply categoryId")
    }else if (!status) {
        response.error("please supply status")
    }else if (!userId) {
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
    } else if (type === "news" && !link) {
        response.error("please supply link")
    } else if ((type === "youtube" || type === "news") && !publishedAt) {
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
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var category = new(Parse.Object.extend("Regular_Category"))
        category.id = categoryId;
        description = description.trim()
        title = title.trim()
        
        var object = new(Parse.Object.extend("Regular_Post_By_Editor"))
        object.set("app", app)
        object.set("category", category)
        object.set("type", type)
        object.set("keywords", splitToKeywords(title))
        object.set("title", title)
        object.set("description", description)
        object.set("likes", 0)
        object.set("views", 0)
        object.set("comments", 0)
        object.set("flagCount", 0)
        object.set("favourites", 0)
        object.set("push", push)
        object.set("status", status)

        var user = new(Parse.Object.extend("_User"))
        user.id = userId;      
        object.set("user",user)

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
            var query = new Parse.Query("Regular_Post_By_Editor");
            query.equalTo("youtubeId", youtubeId);
            query.equalTo("app", app);
            query.equalTo("type", "youtube");
            query.first().then(function(objectExisting) {
                if (objectExisting) {
                    response.error("Video With youtubeId = " + youtubeId + " already exists")
                } else {
                    util.save(object,response)
                }
            }, function(error) {
                response.error(error)
            });
        } else {
            util.save(object,response)
        }
    }
});

Parse.Cloud.define("updatePostEditor", function(request, response) {

    var objectId = request.params.objectId
    var status = request.params.status;
    var adminId = request.params.adminId;
    var rejectionReason = request.params.rejectionReason;

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

    var push = request.params.push
    if(!(push === undefined)){
        push = Number(push)
        if(push === 1)
            push = true
        else
            push = false
    }
    if (!objectId) {
        response.error("please supply objectId")
    }else if (!status) {
        response.error("please supply status")
    }else{
        var object = new(Parse.Object.extend("Regular_Post_By_Editor"))
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
		        object.set("reviewedBy",user)
			}
            if(rejectionReason){
                object.set("rejectionReason",rejectionReason)
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
            if(!(push === undefined)){
                object.set("push", push)
            }
            if (duration)
                object.set("duration", duration)
            if (youtubeId)
                object.set("youtubeId", youtubeId)
            if (publishedAt)
                object.set("publishedAt", publishedAt)
            if(aspectRatio)
                object.set("aspectRatio", aspectRatio)

            if (youtubeId && type === "youtube") {
                var query = new Parse.Query("Regular_Post_By_Editor");
                query.equalTo("youtubeId", youtubeId);
                query.equalTo("type", "youtube");
                query.first().then(function(objectExisting) {
                    if (objectExisting && !(objectExisting.get("youtubeId") === youtubeId) ) {
                        response.error("Video With youtubeId = " + youtubeId + " already exists")
                    } else {
                        util.save(object,response)
                    }
                }, function(error) {
                    response.error(error)
                });
            } else {
                util.save(object,response)
            }
        }, function(error) {
            response.error(error)
        });
    }
});
Parse.Cloud.define("approvePostEditor", function(request, response) {

    var objectId = request.params.objectId
    var adminId = request.params.adminId;
    if (!objectId) {
        response.error("please supply objectId")
    }else if (!adminId) {
        response.error("please supply adminId")
    }else{
        var object = new(Parse.Object.extend("Regular_Post_By_Editor"))
        object.id = objectId
        object.fetch().then(function(object) {
            var params = {}
            
            params.forceAppId = object.get("app").id
            
            
            params.categoryId = object.get("category").id
            params.title = object.get("title")
            params.description = object.get("description")
            params.push = object.get("push")
            
            params.publishedAt = object.get("publishedAt")
            params.userId = object.get("user").id
            params.approvedBy = adminId
            params.status = "approved"
            
            var postType = object.get("type")
            var fileThumbName,fileName
            if(object.get("mediaThumbnail"))
                fileThumbName = object.get("mediaThumbnail").name()
            if(object.get("media"))
                fileName = object.get("media").name()
            var duration = object.get("duration")

           
            if(postType === "youtube"){
                params.type = "youtube"
                params.youtubeId = object.get("youtubeId")
                params.duration = duration
                
            }else if(postType === "news"){
                params.type = "news"
                params.link = object.get("link")
                params.duration = duration
                if(fileName){
                  params.fileName = fileName
                }
                if(fileThumbName)
                  params.fileNameThumbnail = fileThumbName
            }else
            {
                if(fileName && (fileThumbName || postType === "video")){
                  params.type = "video"
                  params.fileName = fileName
                  params.duration = duration
                  if(fileThumbName)
                    params.fileNameThumbnail = fileThumbName
                }else if(fileName){
                  params.type = "image"
                  params.fileName = fileName
                }else{
                  params.type = "text"
                }
            }
            Parse.Cloud.run("addPost", params).then(function(result) {
                object.set("status","approved")
                if(adminId){
                    var user = new(Parse.Object.extend("_User"))
                    user.id = adminId;      
                    object.set("reviewedBy",user)
                }
                util.save(object,response)
            }, function(error) {
                response.error(error)
            });
        }, function(error) {
            response.error(error)
        });
    }
});

Parse.Cloud.define("deletePostEditor", function(request, response) {
    var objectId = request.params.objectId;
    if (!objectId) {
        response.error("please supply objectId")
    }else{
        var object = new(Parse.Object.extend("Regular_Post_By_Editor"))
        object.id = objectId
        util.fetchAndDestroy(object,response)
    }
});
