var express = require('express');
var router = express.Router();
var cons = require('../constants.js');

function isAuthenticated(req, res, next) {
  if (req.session.objectId && !req.session.app) {
    return next();
  }else if(req.session.objectId) {
    res.redirect('admin')
  } else {
    res.redirect('/login')
  }
}

function isAuthenticatedWithAppId(req, res, next) {
  var authId = req.headers['x-parse-application-id'];
  var sepcialCase = req.query.sepcialCase
  if(authId && authId === cons.APP_ID && sepcialCase && JSON.parse(sepcialCase) == true)
    req.body.sepcialCase = true
  if ((req.session.objectId && req.session.app) || (req.body.sepcialCase && JSON.parse(req.body.sepcialCase) == true)) {
    return next();
  }else if(req.session.objectId) {
    res.redirect('/select_app')
  } else {
    res.redirect('/login')
  }
}
function isNotAuthenticated(req, res, next) {
  if (req.session.objectId && req.session.app) {
    res.redirect('admin')
  }else if(req.session.objectId) {
    res.redirect('select_app')
  } else {
    return next();
  }
}

router.use('/admin',isAuthenticatedWithAppId,require('./index'));
router.use('/login',isNotAuthenticated,require('./login'));
router.use('/select_app',isAuthenticated,require('./select_app'));
router.use('/admin/logout',require('./logout'));

module.exports = router;