var express = require('express');
var router = express.Router();
var cons = require('../constants.js');

router.route('/')
    .get(function(req, res) {
        res.render('login', {
            title: 'login',
            error: "",
            devNameBold:cons.DEVELOPER_NAME_BOLD,
            devNameThin:cons.DEVELOPER_NAME_THIN
        });
    })
    .post(function(req, res) {
        Parse.User.logIn(req.body.username.toLowerCase(), req.body.password).then(function(object) {
            if (object && object.get("type") === "admin" && (object.get("adminAccess") === true || object.get("superAdminAccess") === true || object.get("editorAccess") === true)) {
                req.session.objectId = object.id
                res.redirect('select_app')
            } else
                res.render('login', {
                    title: 'login',
                    error: "You are not authorised for this request !!",
                    devNameBold:cons.DEVELOPER_NAME_BOLD,
                    devNameThin:cons.DEVELOPER_NAME_THIN
                });
        }, function(error) {
            res.render('login', {
                title: 'login',
                error: "Inavalid username or password !!",
                devNameBold:cons.DEVELOPER_NAME_BOLD,
                devNameThin:cons.DEVELOPER_NAME_THIN
            });
        })
    });
module.exports = router;