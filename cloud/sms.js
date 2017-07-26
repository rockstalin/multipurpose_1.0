var util = require('./util.js');
Parse.Cloud.define("sms", function(request, response) {
    var limit = 10
    var createdAt = request.params.createdAt;
    var query = new Parse.Query("SmsReport");
    query.descending("createdAt");
    query.limit(limit);
    if (createdAt)
        query.lessThan("createdAt", (new Date(createdAt)));
    util.find(query,response)
});
Parse.Cloud.define("sendVerificationCode", function(request, response) {
    var appId = request.headers['app-id']
    var phone = request.params.phone
    var appName = request.params.appName
    var countryCode = request.params.countryCode

    var maximum = 9999;
    var minimum = 1000;
    var code = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
    // code at first so that user can read without opening the sms
    var text = code+" is your phone verification code for "+appName+" App."
    
    if (!appId) {
        response.error("Please supply the appId")
    }else if (!phone) {
        response.error("Please supply the phone")
    }else if (!appName) {
        response.error("Please supply the appName")
    }else if (!countryCode) {
        response.error("Please supply the countryCode")
    } else {
        var app = new(Parse.Object.extend("Admin_App"))
        app.id = appId;
        var query = new Parse.Query("_User");
        query.equalTo("app", app)
        query.equalTo("phone", phone);
        query.first().then(function(object) {
            if(object){
                object.dirty = function() {
                    return false;
                }
                if(object.get("fullName")){
                    object.set("isNew",false)
                }else{
                    object.set("isNew",true)
                }
                util.sms(phone,countryCode,text,code,object,app,response)
            }else{
                //check for Admin
                var query = new Parse.Query("_User");
                query.equalTo("phone", phone);
                query.first().then(function(object) {
                    if (object && object.get("type") === "admin" && object.get("adminAccess") === true) {
                        object.dirty = function() {
                            return false;
                        }
                        if(object.get("fullName")){
                            object.set("isNew",false)
                        }else{
                            object.set("isNew",true)
                        }
                        util.sms(phone,countryCode,text,code,object,app,response)
                    }
                    else{
                        util.sms(phone,countryCode,text,code,undefined,app,response)    
                    }
                }, function(error) {
                    response.error(error)
                });
                
            } 
        }, function(error) {
            response.error(error)
        });
    }
});
Parse.Cloud.define("sendSMS", function(request, response) {
    var phone = request.params.phone
    var countryCode = request.params.countryCode
    var text = request.params.text
    var userId = request.params.userId
    if (!phone) {
        response.error("Please supply the phone")
    }else if (!countryCode) {
        response.error("Please supply the countryCode")
    }else if (!text) {
        response.error("Please supply the text")
    } else {
        var user = undefined
        if(userId){
            user = new(Parse.Object.extend("_User"))
            user.id = userId;
        }
        util.sms(phone,countryCode,text,undefined,user,undefined,response)
    }
});