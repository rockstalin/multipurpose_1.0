var express = require('express');
var router = express.Router();

router.route('/')
    .get(function(req, res) {
    	req.session = null
    	res.redirect('login')
        // req.session.destroy(function(err) {
        //     if (err) {
        //         console.log(err);
        //     }
        //     res.redirect('login')
        // });
    });

module.exports = router;