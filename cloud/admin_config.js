var cons = require('../constants.js');
Parse.Cloud.define("adminAppConfig", function(request, response) {
    var json = {}
    json.pushTypes = cons.pushTypes
    var query = new Parse.Query("Admin_App");
    query.limit(1000)
    query.find().then(function(results) {
        json.apps = results
        var url = "https://www.googleapis.com/youtube/v3/i18nRegions?part=snippet&key=" + cons.GOOGLE_YOUTUBE_KEY
        return Parse.Cloud.httpRequest({
            method: "GET",
            url: url
        })
    }).then(function(httpResponse) {
        var data = httpResponse.data;
        var item = data.items
        var allCountries = []
        for (var i = 0; i < item.length; i++) {
            var obj = item[i]
            var jsonData = {}
            jsonData.objectId = obj.id
            jsonData.name = obj.snippet.name
            allCountries.push(jsonData)
        }
        allCountries.sort(dynamicSort("name"));
        json.countryCodes = allCountries
        var url = "https://www.googleapis.com/youtube/v3/i18nLanguages?part=snippet&key=" + cons.GOOGLE_YOUTUBE_KEY
        return Parse.Cloud.httpRequest({
            method: "GET",
            url: url
        })
    }).then(function(httpResponse) {
        var data = httpResponse.data;
        var item = data.items
        var allLanguages = []
        for (var i = 0; i < item.length; i++) {
            var obj = item[i]

            var jsonData = {}
            jsonData.objectId = obj.id
            jsonData.name = obj.snippet.name
            allLanguages.push(jsonData)
        }
        allLanguages.sort(dynamicSort("name"));
        json.languageCodes = allLanguages
        response.success(json) // final response
    }, function(error) {
        // response.error(error)
        response.success(json) // final response
    });
});
function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

Parse.Cloud.define("statistics", function(request, response) {
    var appId = request.headers['app-id']
    if (appId) {
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;

        var queryUserTotal = new Parse.Query("_User");
        var queryUser = new Parse.Query("_User");
        queryUser.equalTo("app", app);
        var queryInstallationTotal = new Parse.Query("_Installation");
        var queryInstallation = new Parse.Query("_Installation");
        queryInstallation.equalTo("app", app);
        var queryPost = new Parse.Query("Regular_Post");
        queryPost.equalTo("app", app);
        var queryCategory = new Parse.Query("Regular_Category");
        queryCategory.equalTo("app", app);
        var queryVideoRequestTotal = new Parse.Query("Regular_Post_Request");
        var queryVideoRequest = new Parse.Query("Regular_Post_Request");
        queryVideoRequest.equalTo("app", app);

        
        var queryPostNewByUser = new Parse.Query("Regular_Post");
        queryPostNewByUser.equalTo("status", "new");

        var queryPostNewByEditor = new Parse.Query("Regular_Post_By_Editor");
        queryPostNewByEditor.equalTo("status", "pending");

        var queryTodayHitCount = new Parse.Query("Daily_API_Hit")
        queryTodayHitCount.descending("createdAt");

    
        var jsonData = {}
        app.fetch().then(function(object) {
            jsonData.name = object.get("name")
            jsonData.appVersion = object.get("appVersion")
            jsonData.companyName = object.get("companyName")
            return queryUser.count()
        }).then(function(userCount) {
            jsonData.userCount = userCount
            return queryUserTotal.count()
        }).then(function(userCount) {
            jsonData.userCountTotal = userCount
            return queryInstallation.count({useMasterKey: true})
        }).then(function(installationCount) {
            jsonData.totalUser = 5000+installationCount
            jsonData.installationCount = installationCount
            return queryInstallationTotal.count({useMasterKey: true})
        }).then(function(installationCount) {
            jsonData.installationCountTotal = installationCount
            return queryPost.count()
        }).then(function(postCount) {
            jsonData.postCount = postCount
            return queryCategory.count()
        }).then(function(categoryCount) {
            jsonData.categoryCount = categoryCount
            return queryVideoRequest.count()
        }).then(function(videoRequestCount) {
            jsonData.videoRequestCount = videoRequestCount
            jsonData.postRequestCount = videoRequestCount
            return queryVideoRequestTotal.count()
        }).then(function(videoRequestCount) {
            jsonData.postRequestCountTotal = videoRequestCount
            return queryPostNewByUser.count()
        }).then(function(count) {
            jsonData.postByUserCountTotal = count
            return queryPostNewByEditor.count()
        }).then(function(count) {
            jsonData.postByEditorCountTotal = count
            return queryTodayHitCount.first()
        }).then(function(object) {
            if(object){
                jsonData.todayHitCount = object.get("count")
            }else{
                jsonData.todayHitCount = 0
            }
            response.success(jsonData)
        }, function(error) {
            response.error(error)
        });
    } 
    else {
        response.error("please supply the appId")
    }
});
Parse.Cloud.define("statisticsEditor", function(request, response) {
    var userId = request.params.userId
    if (userId) {
        var user = new(Parse.Object.extend("_User"))
        user.id = userId;

        var queryPostTotal = new Parse.Query("Regular_Post_By_Editor");
        queryPostTotal.equalTo("user",user)

        var queryPostApproved = new Parse.Query("Regular_Post_By_Editor");
        queryPostApproved.equalTo("user",user)
        queryPostApproved.equalTo("status","approved")

        var queryPostPending = new Parse.Query("Regular_Post_By_Editor");
        queryPostPending.equalTo("user",user)
        queryPostPending.equalTo("status","pending")

        var queryPostRejected = new Parse.Query("Regular_Post_By_Editor");
        queryPostRejected.equalTo("user",user)
        queryPostRejected.equalTo("status","rejected")

        var jsonData = {}
        queryPostTotal.count().then(function(count) {
            jsonData.totalPostEditor = count
            return queryPostApproved.count()
        }).then(function(count) {
            jsonData.approvedPostEditor = count
            return queryPostPending.count()
        }).then(function(count) {
            jsonData.pendingPostEditor = count
            return queryPostRejected.count()
        }).then(function(count) {
            jsonData.rejectedPostEditor = count
            response.success(jsonData)
        }, function(error) {
            response.error(error)
        });
    } 
    else {
        response.error("please supply the userId")
    }
});