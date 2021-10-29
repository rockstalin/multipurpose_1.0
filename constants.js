var path = require('path');

/*
 ****************************************************************************************
		           Must Configure Settings
 >>>>>>>>>>>>>>>>>>>>>>>>
*/

exports.PORT = 3030;//80; // Port number on which your project will be running
//you may use port like 3030, 2020 etc if you don't want to use the default port 80 and you want to point your subdomain to this this port
// for more information refer to advanced documentation of server confifuration inside documenatation > advanced_user
exports.BASE_URL = 'http://localhost:'+this.PORT // Base Url or IP Address which you will be using to connect with Android/iOS/Web Application

//exports.BASE_URL = 'http://174.138.68.69:'+this.PORT // Base Url or IP Address which you will be using to connect with Android/iOS/Web Application
exports.CMS_USER = "cms" 
exports.CMS_PASSWORD = "myPassword" 
// User name and password which will be used to access the Parse Dashboard, i.e. access to the Architecture of Database
// to open parse dashboard you can visit BASE_URL+/cms/apps for example http://174.138.68.69/cms/apps

exports.SUPER_ADMIN_FULL_NAME = "Bison Code" 
exports.SUPER_ADMIN_USER = "admin"
exports.SUPER_ADMIN_PASSWORD = "myPassword" // User name and password which will be used to access the Admin Panel

exports.APP_ID = 'nKGMODkppJvk5RtYC5Fu' 
// Apllication Id, Which is used to secure the API calls from Android/iOS/Web to Backend (NodeJS), 
//Security is not only validatd with this key in header, also with content type, Method Type

exports.MASTER_KEY = '7NVq2LDGnYaIttTEEw3L'
// Master Key is used for access control list i.e. for Installations, Users ETC i.e. some operation cannot be performed without Master Key and Apllication Id

exports.SESSION_SECRET = 'GPEYiXvSm1JhmcZZMgnz'// This is used for Admin/Editor Panel to store and access the session of user within browser

//For Random Strings for your APP_ID, MASTER_KEY, SESSION_SECRET you may Visit  https://www.random.org/strings/?num=10&len=20&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html&rnd=new

exports.PM_ID = 0 
// Very Important used to Schedule Post, Send Push And Auto Publish to Facebook, 
// This Is Id of NodeJS project running using PM2, You will get the more details about this during Installation Guide of project
// If you are doing clustering with pm2 then you may use id of any cluster 


/*
 ****************************************************************************************
		           Requirement Based or Optional Settings
 >>>>>>>>>>>>>>>>>>>>>>>>
*/

exports.DEVELOPER_NAME_BOLD = 'Your';
exports.DEVELOPER_NAME_THIN = 'Name';  // These Names will be shown in Admin/Editor Panel as Logo Of Panel

exports.APP_NAME = 'Multipurpose'; // This Name will be shown in Parse Dashboard
exports.DATABASE_NAME = 'multipurpose'; // Database will be created/used in MongoDB with this name

exports.SEND_POST_PUSH_TO_ALL = true 
// If this is true then the push will be sent to all the users of particular application on adding post with push checked
// otherwise push will be sent to the users who has subscribed the category(post's category) + users who has not logged into app, But not to those users who has signed in to the app but no subscribed the category

//plivo.com configurations
exports.SMS_AUTH_ID = "" // Plivo SMS Auth ID to send the SMS using plivo.com
exports.SMS_AUTH_TOKEN = "" // Plivo SMS Auth Token to send the SMS using plivo.com
exports.SMS_SRC = "" // Plivo SMS Number, SMS will be sent using this Number.

exports.GOOGLE_YOUTUBE_KEY = '' // This is used to consume the API's of Youtube Data API v3, You can create new one at Google Api Console
// To create the new key Visit https://console.developers.google.com/
//	> Enable Api > YouTube Data API > 
//	> Credentials from Left menu > Create Credentials > API key > copy and paste
// > Restart from DashBoard or using CLI only if process is already running, ignore if you have not started the process or using first time

exports.FAKE_MINIMUM = 50 
exports.FAKE_MAXIMUM = 200
// This is used to assign fake views/likes to post and fake subscirbers to category, if you will set these 0,0 it will automatically assume that you don't want show any fake data to user
// here minimum and maximum means fake data will be assigned between these two numbers i.e. between 50-200, you may change as per your choice


/*
 ****************************************************************************************
 ****************************************************************************************
 ****************************************************************************************
		           Don't Modify Following Settings
 ****************************************************************************************
 ****************************************************************************************
 ****************************************************************************************
*/

exports.API_ROUTE = '/api'
exports.FUNCTION_ROUTE = '/functions/'
exports.CMS_ROUTE = '/cms'
exports.FILES_ROUTE = '/files'

exports.SERVER_URL = this.BASE_URL+this.API_ROUTE
exports.FILE_URL = this.SERVER_URL+this.FILES_ROUTE+"/"+this.APP_ID

exports.CLOUD_DIR_PATH = __dirname + '/cloud/main.js'
exports.DATABASE_URI = 'mongodb://localhost:27017/'+this.DATABASE_NAME;
exports.BASE_URL_LOCAL = 'http://localhost:'+this.PORT
exports.BASE_URL_LOCAL_Functions = this.BASE_URL_LOCAL+this.API_ROUTE+this.FUNCTION_ROUTE
exports.BASE_URL_LOCAL_Files = this.BASE_URL_LOCAL+this.API_ROUTE+this.FILES_ROUTE


exports.FILES_DIRECTORY = "/files"

exports.VERBOSE = false
exports.INSECURE_HTTP = true


exports.apps = [
	{
      "serverURL": this.SERVER_URL,
      "appId": this.APP_ID,
      "masterKey": this.MASTER_KEY,
      "appName": this.APP_NAME
    }
]
exports.pushTypes = [
"web","app","general","permanent","facebookAd"
]