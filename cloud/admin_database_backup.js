var util = require('./util.js');
var cons = require('../constants.js');

Parse.Cloud.define("toggleAutoDbBackup", function(request, response) {
    var value = JSON.parse(request.params.value);
    var query = new Parse.Query("System_Settings");
    query.equalTo("key","automaticDbBackup")
    query.first().then(function(object){
        if(object){
          if(!(value === undefined))
            object.set("value",value)
          else
            object.set("value",!object.get("value"))
          return object.save()
        }else{
          return undefined
        }
    }).then(function(object){
      response.success(object)
    },function(error){
      response.error(error)
    })
});

Parse.Cloud.define("dbStats", function(request, response) {
    var json = {}
    var query = new Parse.Query("Admin_Database_Backup");
    query.count().then(function(count){
      json.count = count;
      if(count>0){
        var query = new Parse.Query("Admin_Database_Backup");
        query.descending("createdAt")
        return query.first();
      }
    }).then(function(object){
      if(object){
        json.lastBackup = object.createdAt
      }
      var query = new Parse.Query("System_Settings");
      query.equalTo("key","automaticDbBackup")
      return query.first()
    }).then(function(object){
      if(object){
        json.isAutomaticDbBackup = object.get("value")
      }
      response.success(json)
    },function(error){
      response.error(error)
    })
});

Parse.Cloud.define("dbBackups", function(request, response) {
    var createdAt = request.params.createdAt;
    var query = new Parse.Query("Admin_Database_Backup");
    query.descending("createdAt");
    query.include("takenBy")
    query.limit(1000);
    if (createdAt)
        query.lessThan("createdAt", (new Date(createdAt)));
    util.find(query,response)
});

Parse.Cloud.define("createBackup", function(request, response) {
    var adminId = request.params.adminId;
    var isAutomatic = request.params.isAutomatic;
    if (adminId || isAutomatic) {
        var backup = require('mongodb-backup')
        var dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '')
        dateStr = dateStr.replace(/:/g,'.')
        dateStr = dateStr+"_"+(0|Math.random()*9e6).toString(36)+".tar"
        var db_backup_name = cons.DATABASE_NAME+"_"+dateStr
        
        backup({
          uri: cons.DATABASE_URI,
          root: __dirname+'/../public/db_backups',
          tar: db_backup_name,
          callback: function(err) {
            if (err) {
              response.error(err)
            } else {
                var object = new(Parse.Object.extend("Admin_Database_Backup"))
                object.set("tar", db_backup_name)
                if(adminId){
                  var admin = new(Parse.Object.extend("_User"))
                  admin.id = adminId;
                  object.set("takenBy", admin)
                }else{
                  object.set("isAutomatic", true)
                }
                util.save(object, response)
            }
          }
        });
    } else {
        response.error("please supply adminId")
    }
});
Parse.Cloud.define("restoreBackup", function(request, response) {
    var databaseTar = request.params.databaseTar;
    if (databaseTar) {
      var mongoose = require('mongoose');
      mongoose.connect(cons.DATABASE_URI,function(){
          mongoose.connection.db.dropDatabase();
          mongoose.connection.close()
          var restore = require('mongodb-restore')
          restore({
            uri: cons.DATABASE_URI,
            root: __dirname+'/../public/db_backups',
            tar: databaseTar,
            callback: function(err) {
              if (err) {
                response.error(err)
              } else {
                response.success("Restored !!")
              }
            }
          });
      });
    } else {
        response.error("please supply databaseTar")
    }
});
Parse.Cloud.define("deleteBackup", function(request, response) {
    var objectId = request.params.objectId;
    if (objectId) {
        var object = new(Parse.Object.extend("Admin_Database_Backup"))
        object.id = objectId
        var path
        object.fetch().then(function(object) {
            path = __dirname+'/../public/db_backups/'+ object.get("tar")
            return object.destroy()
        }).then(function(results) {
          if(path){
            var fs = require('fs');
            fs.exists(path, function(exists) {
              if(exists) {
                fs.unlink(path,function(err){
                    response.success("done")
                });  
              } else {
                response.success("done")
              }
            });
          }else{
            response.success("done")
          }
        }, function(error) {
            response.error(error)
        })
    } else {
        response.error("please supply the objectId");
    }
});