var cons = require('../constants.js');
Parse.serverURL = cons.SERVER_URL;

require('./admin_app.js');
require('./admin_config.js');
require('./admin_database_backup.js');
require('./admin_push_android.js');
require('./admin_push_certificates_ios.js');
require('./admin_push.js');
require('./admin_remote_control.js');
require('./admin_user.js');
require('./admin_youtube_api.js');

require('./daily_hits.js');
require('./jobs.js');

require('./pre_installation.js');
require('./pre_user.js');

require('./regular_activity.js');
require('./regular_category.js');
require('./regular_favourite');
require('./regular_post.js');
require('./regular_post_by_editor.js');
require('./regular_subscription.js');
require('./sms.js');