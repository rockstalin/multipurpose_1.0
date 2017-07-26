var cons = require('../constants.js');
Parse.Cloud.define("deleteFile", function(request, response) {
    var fileName = request.params.fileName;
    if(!fileName){
        response.error("please supply fileName")
    }else{
        var url = cons.BASE_URL_LOCAL_Files+"/"+fileName
        Parse.Cloud.httpRequest({
            method: 'DELETE',
            url:url,
            headers: {
                "X-Parse-Application-Id": cons.APP_ID,
                "X-Parse-REST-API-Key" : cons.REST_KEY,
                "X-Parse-Master-Key":cons.MASTER_KEY
            }
        }).then(function(httpResponse){
            response.success(httpResponse)
        },function(error){
            response.error(error)
        })
    }
});
Parse.Cloud.define("deleteAll", function(request, response) {
    var appId = request.headers['app-id']
    var className = request.params.className;
    if (!appId) {
        response.error("please supply appId")
    } else if (!className) {
        response.error("please supply className")
    } else {
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;
        var query = new Parse.Query(className);
        query.limit(1000)
        query.equalTo("app", app)
        recursiveDelete(query, 0)
        response.success(" Objects Are being deleted, please check after few minutes")
    }
});


function recursiveDelete(query, count) {
    query.find().then(function(results) {
        return Parse.Object.destroyAll(results)
    }).then(function(results) {
        count = count + results.length
        if (results.length > 999)
            recursiveDelete(query, count)
    }, function(error) {
        response.error(error)
    })
}
exports.save = function(object, response) {
    object.save().then(function(object) {
        response.success(object)
    }, function(error) {
        response.error(error)
    });
}
exports.find = function(query, response) {
    query.find().then(function(results) {
        response.success(results)
    }, function(error) {
        response.error(error)
    });
}
exports.fetch = function(object, response) {
    object.fetch().then(function(object) {
        response.success(object)
    }, function(error) {
        response.error(error)
    });
}
exports.destroy = function(object, response) {
    object.destroy().then(function(object) {
        response.success("object deleted !!")
    }, function(error) {
        response.error(error)
    });
}
exports.fetchAndDestroy = function(object, response) {
    object.fetch().then(function(object) {
        return object.destroy()
    }).then(function(object) {
        response.success("object deleted !!")
    }, function(error) {
        response.error(error)
    })
}
exports.findAndDestroy = function(query, response) {
    query.find().then(function(results) {
        return Parse.Object.destroyAll(results)
    }).then(function(results) {
        response.success(results)
    }, function(error) {
        response.error(error)
    })
}
exports.sendPush = function(pushQuery, data, results, response) {
    Parse.Push.send({
        where: pushQuery,
        data: data
    }, {
        useMasterKey: true
    })
    .then(function() {
        if (response)
            response.success(results);
    }, function(error) {
        if (response)
            response.success(error);
    });
}
exports.sms = function(dst,countryCode,text,code,responseObject,app,response) {
    
    var auth_id = cons.SMS_AUTH_ID
    var auth_token = cons.SMS_AUTH_TOKEN
    var src = cons.SMS_SRC

    
    Parse.Cloud.httpRequest({
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        url: 'https://' + auth_id + ':' + auth_token + '@api.plivo.com/v1/Account/' + auth_id + '/Message/',
        body: {
            "src": src,
            "dst": dst,
            "text": text
        }
    }).then(
    function(results) {
        var uid = results.data.message_uuid[0]
        var object = new(Parse.Object.extend("SmsReport"))
        object.set("text", text)
        object.set("verificationCode", code)
        object.set("to", dst)
        object.set("countryCode", countryCode)
        object.set("from", src);
        object.set("message_uuid", uid);
        object.set("authId", auth_id)
        object.set("authToken", auth_token)
        if(app)
            object.set("app", app)
        if(responseObject)
            object.set("user",responseObject)
        object.save().then(function(object) {
            response.success(object)
        }, function(error) {
            response.error(error)
        });
    },
    function(error) {
        response.error("Unable to send the message to +"+dst+", please check the number and try again!!")
    })
}
