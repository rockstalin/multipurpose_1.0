var util = require('./util.js');
var cons = require('../constants.js');
var cron = require('node-cron');

if(process.env.pm_id == cons.PM_ID || process.env.pm_id === cons.PM_ID){
	cron.schedule('*/5 * * * *', function(){

		var date = new Date()

		// var hours = (date.getHours() + 24) % 12 || 12;
		var hours = date.getHours();
		var minutes = date.getMinutes()
		if(hours === 12  && (minutes <5 && minutes >=0)){
			var query = new Parse.Query("System_Settings");
	    	query.equalTo("key","automaticDbBackup")
		    query.first().then(function(object){
		        if(object.get("value")){
		        	return Parse.Cloud.httpRequest({
                      url: cons.BASE_URL_LOCAL_Functions+'createBackup',
                      headers: {
                          'X-Parse-Application-Id': cons.APP_ID
                      },
                      method:'POST',
                      body: {isAutomatic:true}
                    })
		        }else{
		          return undefined
		        }
		    }).then(function(object){
		    },function(error){
		    })
		}
		var query = new Parse.Query("Scheduled_For_Facebook")
	    query.ascending("publishedAt");
	    query.doesNotExist("facebookPostId")
	    query.exists("app")
	    query.exists("post")
	    query.include("post,app")
	    
	    query.lessThan("publishedAt", date);
	    query.find().then(function(results){
	    	if(results.length>0){
	    		publishToFacebook(results,0,0)
	    	}else{
	    		// updateJobStatus("There is no new post")
	    	}
	    },function(error){
	    	updateJobStatus("Publishing To Facebook Failed, There is issue with Database Query")
	    })
	    var queryPosts = new Parse.Query("Regular_Post")
	    queryPosts.include("category")
	    queryPosts.ascending("publishedAt");
	    // queryPosts.doesNotExist("pushSent")
	    queryPosts.notEqualTo("pushSent",true)
	    queryPosts.equalTo("push",true)
	    var date = new Date()
	    queryPosts.lessThan("publishedAt", date);
	    queryPosts.find().then(function(results){
	    	if(results.length>0){
	    		sendPush(results,0,0)
	    	}else{
	    		// updatePushJobStatus("There is no push to send")
	    	}
	    },function(error){
	    	updateJobStatus("Publishing To Facebook Failed, There is issue with Database Query")
	    })
	});
}
function publishToFacebook(results,index,successCount){
	if(results.length === index){
		var msg = successCount+" posts published to facebook"
		updateJobStatus(msg)
	}else{
		var object = results[index]
		var app = object.get("app")
		var post = object.get("post")
		if(object.get("facebookPostId")){
			updateJobStatus(object.id+" already published to Facebook")
			publishToFacebook(results,index+1,successCount)
		}
		if(!app || !app.get("facebookPostPath") || !app.get("facebookAccessToken")){
			updateJobStatus(object.id+" couldn't be published to Facebook, There is issues with app settings")
			publishToFacebook(results,index+1,successCount)
		}else if(!post || !post.get("type") || !(post.get("type") === "image")){
			updateJobStatus(object.id+" couldn't be published to Facebook, There is issues with post or post type")
			publishToFacebook(results,index+1,successCount)
		}else{
			Parse.Cloud.httpRequest({
		      url: "https://graph.facebook.com"+app.get("facebookPostPath"),
		      headers: {
		          'Content-Type': "application/x-www-form-urlencoded"
		      },
		      method:'POST',
		      body: {"access_token":app.get("facebookAccessToken"),url:post.get("media").url()}
		    }).then(function(httpResponse) {
		    	var fbPostId = httpResponse.data['post_id']
				object.set("facebookPostId",fbPostId)
				object.save().then(function(){
					post.set("facebookPostId",fbPostId)
					post.save().then(function(){
						publishToFacebook(results,index+1,successCount+1)
					})
				})
		    },function(error){
		    	updateJobStatus(object.id+" couldn't be published to Facebook, There is issue with facebook, please check the issue if not succeeds in next attempt")
		    	publishToFacebook(results,index+1,successCount)
		    });
		}
		
	}
}
function updateJobStatus(msg){
	Parse.Cloud.httpRequest({
      url: "http://localhost:"+cons.PORT+"/api/jobs/publishOnFacebook",
      headers: {
          'X-Parse-Application-Id': cons.APP_ID,
          'X-Parse-Master-Key':cons.MASTER_KEY
      },
      method:'POST',
      body: {status:msg}
    }).then(function(httpResponse) {
    },function(error){
    });
}

function sendPush(results,index,successCount){
	if(results.length === index){
		var msg = "push sent to "+successCount+" posts"
		updatePushJobStatus(msg)
	}else{
		var object = results[index]
	    var push = object.get("push")
	    var pushSent = object.get("pushSent")
	    if (push && !pushSent) {
	        var app = object.get("app")
            var pushQuery = new Parse.Query(Parse.Installation);
            pushQuery.equalTo("app", app)
            if(cons.SEND_POST_PUSH_TO_ALL == false){
            	pushQuery.equalTo('channels', object.get("category").get("name"));
            }
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
        			sendPush(results,index+1,successCount+1)
		        },function(error){
		        	updatePushJobStatus(object.id+" error in saving the pushSent")
					sendPush(results,index+1,successCount)    
		        })
		    }, function(error) {
		    	updatePushJobStatus(object.id+" error in sending the push")
				sendPush(results,index+1,successCount)
		    });
	    }else{
	    	updatePushJobStatus(object.id+" cannot send the push else condition : "+push+" : "+pushSent)
			sendPush(results,index+1,successCount)
	    }
	}
}
function updatePushJobStatus(msg){
	Parse.Cloud.httpRequest({
      url: "http://localhost:"+cons.PORT+"/api/jobs/sendPush",
      headers: {
          'X-Parse-Application-Id': cons.APP_ID,
          'X-Parse-Master-Key':cons.MASTER_KEY
      },
      method:'POST',
      body: {status:msg}
    }).then(function(httpResponse) {
    },function(error){
    });
}
Parse.Cloud.job("publishOnFacebook", function(request, status) {
	status.success(request.params.status);
});
Parse.Cloud.job("sendPush", function(request, status) {
	status.success(request.params.status);
});
Parse.Cloud.job("restarted", function(request, status) {
	status.success(request.params.status);
});