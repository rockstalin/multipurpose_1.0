var util = require('./util.js');
var cons = require('../constants.js');
Parse.Cloud.define("remoteControlList", function(request, response) {
    var objectId = request.params.objectId;
    var query = new Parse.Query("Remote_Control")
    query.ascending("identifier");
    query.exists("identifier")
    query.limit(1000);
    if (objectId) {
        var object = new(Parse.Object.extend("Remote_Control"))
        object.id = objectId
        util.fetch(object, response)
    } else {
        util.find(query, response)
    }
});
Parse.Cloud.define("configurationData", function(request, response) {
    var identifier = request.params.identifier;
    if(!identifier){
        response.error("please supply the identifier")
    }else{
        var query = new Parse.Query("Remote_Control")
        query.equalTo("identifier",identifier)
        query.first().then(function(objectExisting){
            if(objectExisting)
                response.success(objectExisting)
            else
                response.error("no object found !!")
        },function(error){
            response.error(error)
        })
        
    }
});
Parse.Cloud.define("addRemoteControl", function(request, response) {
    var identifier = request.params.identifier;
    var admobInterstitial = request.params.admobInterstitial;
    var admobBanner = request.params.admobBanner;
    var admobNative = request.params.admobNative;
    var email = request.params.email;
    var facebook = request.params.facebook;
    
    if (!identifier) {
        response.error("please supply the identifier")
    }else{
        var query = new Parse.Query("Remote_Control")
        query.equalTo("identifier",identifier)
        query.first().then(function(objectExisting){
            if(objectExisting){
                response.error("401",identifier+" Identifier already assigned to, objectId = "+objectExisting.id)
            }else{
                var object = new(Parse.Object.extend("Remote_Control"))
                object.set("identifier", identifier)
                if(admobInterstitial)
                    object.set("admobInterstitial", admobInterstitial)
                if(admobBanner)
                    object.set("admobBanner", admobBanner)
                if(admobNative)
                    object.set("admobNative", admobNative)
                if(email)
                    object.set("email", email)
                if(facebook)
                    object.set("facebook", facebook)
                util.save(object, response)
            }
        },function(error){
            response.error(error)
        })
    }
});
Parse.Cloud.define("updateRemoteControl", function(request, response) {
    var objectId = request.params.objectId;
    var identifier = request.params.identifier;
    var admobInterstitial = request.params.admobInterstitial;
    var admobBanner = request.params.admobBanner;
    var admobNative = request.params.admobNative;
    var email = request.params.email;
    var facebook = request.params.facebook;

    if (!objectId) {
        response.error("please supply the objectId")
    }
    else {
        var object = new(Parse.Object.extend("Remote_Control"))
        object.id = objectId
        object.fetch().then(function(object) {
            if(admobInterstitial)
                object.set("admobInterstitial", admobInterstitial)
            if(admobBanner)
                object.set("admobBanner", admobBanner)
            if(admobNative)
                object.set("admobNative", admobNative)
            if(email)
                object.set("email", email)
            if(facebook)
                object.set("facebook", facebook)
            if (identifier){
                var query = new Parse.Query("Remote_Control")
                query.equalTo("identifier",identifier)
                query.first().then(function(objectExisting){
                    if(objectExisting &&  !(objectExisting.id === object.id)){
                        response.error(identifier+" Identifier already assigned to, objectId = "+objectExisting.id)
                    }else{
                        object.set("identifier", identifier)
                        util.save(object, response)
                    }
                },function(error){
                    response.error(error)
                })
            }
            else{
                util.save(object, response)
            }
        }, function(error) {
            response.error(error)
        }); 
    } 
});

Parse.Cloud.define("deleteRemoteControl", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Remote_Control"))
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