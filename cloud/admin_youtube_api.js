var cons = require('../constants.js');
Parse.Cloud.define("youtubeCategories", function(request, response) {
    var countryCode = request.params.countryCode;
    if (countryCode) {
        var url = "https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=" + countryCode + "&fields=items(id,snippet(title))&key=" + cons.GOOGLE_YOUTUBE_KEY
        Parse.Cloud.httpRequest({
            method: "GET",
            url: url
        }).then(function(httpResponse) {
            var data = httpResponse.data;
            var item = data.items
            var allCategories = []

            for (var i = 0; i < item.length; i++) {
                var obj = item[i]

                var jsonData = {}
                jsonData.objectId = obj.id
                jsonData.title = obj.snippet.title
                allCategories.push(jsonData)
            }
            allCategories.sort(dynamicSort("title"));
            response.success(allCategories);
        }, function(error) {
            response.error(error)
        });
    } else {
        response.error("Please supply the countryCode")
    }
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
Parse.Cloud.define("youtubeTrending", function(request, response) {
    var countryCode = request.params.countryCode;
    if (countryCode) {
        var categoryId = request.params.categoryId;
        var nextPageToken = request.params.nextPageToken;
        var limit = 50
        var url = "https://www.googleapis.com/youtube/v3/videos?chart=mostPopular&regionCode=" + countryCode + "&maxResults=" + limit + "&key=" + cons.GOOGLE_YOUTUBE_KEY + "&fields=nextPageToken,items(id,snippet(title,description,publishedAt,channelTitle,categoryId),statistics(viewCount,likeCount,favoriteCount),contentDetails(duration))&part=snippet,statistics,contentDetails"
        if (categoryId)
            url = url + "&videoCategoryId=" + categoryId
        if (nextPageToken)
            url = url + "&pageToken=" + nextPageToken
        Parse.Cloud.httpRequest({
            method: "GET",
            url: url
        }).then(function(httpResponse) {
            var jsonAll = {}
            jsonAll.nextPageToken = httpResponse.data.nextPageToken
            isAlreadyAdded(httpResponse, jsonAll, response)
        }, function(error) {
            response.error(error)
        });
    } //if countryCode
    else {
        response.error("Please supply the countryCode")
    }
});
Parse.Cloud.define("youtubeSearch", function(request, response) {

    var countryCode = request.params.countryCode;
    if (countryCode) {
        var jsonAll = {}
        var categoryId = request.params.categoryId;
        var nextPageToken = request.params.nextPageToken;
        var search = request.params.search;
        var publishedAfter = request.params.from;
        var publishedBefore = request.params.to;
        var relevanceLanguage = request.params.relevanceLanguage

        var limit = 50

        if (search) {

        } else {
            search = ""
        }
        var url = "https://www.googleapis.com/youtube/v3/search?q=" + search + "&type=video&order=date" + "&safeSearch=none&regionCode=" + countryCode + "&maxResults=" + limit + "&key=" + cons.GOOGLE_YOUTUBE_KEY + "&fields=nextPageToken,items(id)&part=snippet"

        if (publishedBefore)
            url = url + "&publishedBefore=" + publishedBefore
        if (publishedAfter)
            url = url + "&publishedAfter=" + publishedAfter
        if (relevanceLanguage)
            url = url + "&relevanceLanguage=" + relevanceLanguage
        if (categoryId)
            url = url + "&videoCategoryId=" + categoryId
        if (nextPageToken)
            url = url + "&pageToken=" + nextPageToken

        Parse.Cloud.httpRequest({
            method: "GET",
            url: url
        }).then(function(httpResponse) {
            var dataOuter = httpResponse.data;
            var itemsOuter = dataOuter.items
            jsonAll.nextPageToken = dataOuter.nextPageToken
            var videos = "";
            for (var i = 0; i < itemsOuter.length; i++) {
                var item = itemsOuter[i]
                if (i === 0)
                    videos = item.id.videoId
                else
                    videos = videos + "," + item.id.videoId
            }
            var url = "https://www.googleapis.com/youtube/v3/videos?&id=" + videos + "&regionCode=" + countryCode + "&maxResults=" + limit + "&key=" + cons.GOOGLE_YOUTUBE_KEY + "&fields=nextPageToken,items(id,snippet(title,description,publishedAt,channelTitle,categoryId),statistics(viewCount,likeCount,favoriteCount),contentDetails(duration))&part=snippet,statistics,contentDetails"
            return Parse.Cloud.httpRequest({
                method: "GET",
                url: url
            })
        }).then(function(httpResponse) {
            isAlreadyAdded(httpResponse, jsonAll, response)
        }, function(error) {
            response.error(error)
        });
    } //if countryCode
    else {
        response.error("Please supply the countryCode")
    }
});

function isAlreadyAdded(httpResponse, jsonAll, response) {

    var data = httpResponse.data;
    var items = data.items
    var allVideos = []

    var videoIds = []
    for (var i = 0; i < items.length; i++) {
        var item = items[i]
        videoIds.push(item.id)
    }
    var query = new Parse.Query("Video");
    query.containedIn("youtubeId", videoIds);
    query.find().then(function(results) {
        for (var i = 0; i < items.length; i++) {
            var item = items[i]
            var isMatched = false
            for (var j = 0; j < results.length; j++) {
                var existingId = results[j].get("youtubeId")
                if (existingId === item.id) {
                    isMatched = true
                    break;
                }
            }
            var duration = item.contentDetails.duration
            duration = duration.toLowerCase();
            duration = duration.split("pt")[1]
            var finalDuration = ""

            if (duration.indexOf("h") !== -1) {
                finalDuration += duration.split("h")[0]
                duration = duration.split("h")[1];
            }
            if (duration.indexOf("m") !== -1) {
                if (finalDuration.length > 0)
                    finalDuration += ":"
                finalDuration += duration.split("m")[0]
                duration = duration.split("m")[1];
            }
            if (duration.indexOf("s") !== -1) {
                if (finalDuration.length > 0)
                    finalDuration += ":"
                finalDuration += duration.split("s")[0]
            }

            var jsonData = {}
            jsonData.isAdded = isMatched
            jsonData.title = item.snippet.title
            jsonData.youtubeId = item.id
            jsonData.description = item.snippet.description
            jsonData.publishedAt = item.snippet.publishedAt
            jsonData.categoryId = item.snippet.categoryId
            jsonData.channelTitle = item.snippet.channelTitle
            jsonData.views = item.statistics.viewCount
            jsonData.likes = item.statistics.likeCount
            jsonData.favoriteCount = item.statistics.favoriteCount
            jsonData.duration = finalDuration
            allVideos.push(jsonData)
        }
        jsonAll.videos = allVideos
        response.success(jsonAll);
    }, function(error) {
        response.error(error)
    });
}
Parse.Cloud.define("fetchYoutubeVideoDetails", function(request, response) {

    var youtubeId = request.params.youtubeId;
    if(!youtubeId){
        response.error("please supply the youtubeId")
    }else{
        var url = "https://www.googleapis.com/youtube/v3/videos?&id=" + youtubeId + "&key=" + cons.GOOGLE_YOUTUBE_KEY + "&fields=items(id,snippet(title,description,publishedAt,channelTitle,categoryId),statistics(viewCount,likeCount,favoriteCount),contentDetails(duration))&part=snippet,statistics,contentDetails"

        Parse.Cloud.httpRequest({
            method: "GET",
            url: url
        }).then(function(httpResponse) {
            var data = httpResponse.data;
            if(data.items.length>0){
                var item = data.items[0]
                var duration = item.contentDetails.duration
                duration = duration.toLowerCase();
                duration = duration.split("pt")[1]
                var finalDuration = ""
                if (duration.indexOf("h") !== -1) {
                    finalDuration += duration.split("h")[0]
                    duration = duration.split("h")[1];
                }
                if (duration.indexOf("m") !== -1) {
                    if (finalDuration.length > 0)
                        finalDuration += ":"
                    finalDuration += duration.split("m")[0]
                    duration = duration.split("m")[1];
                }
                if (duration.indexOf("s") !== -1) {
                    if (finalDuration.length > 0)
                        finalDuration += ":"
                    finalDuration += duration.split("s")[0]
                }
                var finalText = item.snippet.description;
                var deletedDescription;
                var split = finalText.split("\n")

                for (var i = 0; i < split.length; i++) {
                    var str =  split[i]
                    str = str.toLowerCase()
                    if(str.includes("http://") || str.includes("https://") || str.includes("www.") || str.includes("subscribe to")|| str.includes("social media") || str.includes("facebook") || str.includes("twitter") || str.includes("follow us") || str.includes("find us") || str.includes("subscribe for") || str.includes("subscribe us") || str.includes("caller tune") || str.includes("connect with us") || str.includes("more updates") || str.includes("updates on") || str.includes("copyright") || str.includes("credits:") || str.includes("credits :") || str.includes("like") && str.includes("comment") && str.includes("share") && str.includes("subscribe")) {
                        if(deletedDescription)
                            deletedDescription = deletedDescription + "\n"+ str
                        else
                            deletedDescription = str
                    }else{
                       if(i===0){
                           finalText = str
                       }
                       else{
                           finalText = finalText + "\n"+ str;
                       }
                    }
                }
                var jsonData = {}
                jsonData.title = item.snippet.title
                jsonData.description = finalText
                jsonData.deletedDescription = deletedDescription
                if(item.statistics)
                {
                    jsonData.views = item.statistics.viewCount
                    jsonData.likes = item.statistics.likeCount
                    jsonData.favoriteCount = item.statistics.favoriteCount
                }
                jsonData.views = item.statistics.viewCount
                jsonData.likes = item.statistics.likeCount
                jsonData.favoriteCount = item.statistics.favoriteCount
                jsonData.duration = finalDuration
                response.success(jsonData);
            }else{
                response.error("No Video found !! please verify youtubeId")
            }

           //  
        }, function(error) {
            response.error(error)
        });
    }
});