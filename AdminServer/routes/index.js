var express = require('express');
var router = express.Router();
var fablab = require('fablab');
var app = require('../app');
var config = require('../config');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/members', function(req, res, next) {
  //load members
  res.send(fablab.members());
});

router.get('/member', function(req, res, next) {
  //load member
  res.send(fablab.member(req.query.id));
});

router.get('/ip', function(req, res, next) {
  //get machine ip
  res.send(fablab.currentIP());
});

router.get('/shutdown', function(req, res, next) {
  //shut down pi
  res.send(fablab.shutdown());
});

router.post('/syncmembers', function(req, res, next) {
  //load members
  res.send(fablab.syncMembers(req.app));
});

router.get('/access', function(req, res, next) {
  //
  var card_uid = req.query.card;
  var result = fablab.access(card_uid);

  if(result.status == 'OK'){
	console.log('open sesame');
	var exec = require('child_process').exec;
        var child = exec('python /home/pi/fablabnv/yellowlight.py',function(error, stdout, stderr){
		if(error != null) {
			console.log(stderr);
		}
		else {
			console.log('looks ok');
		}
	});
  }

  res.send(result);
});

router.get('/openinghours', function(req, res, next) {
  res.send(fablab.openinghours());
});

router.get('/admincheck', function(req, res, next) {
  var member =fablab.isAdminByCard(req.query.card); 
  res.send({status: (member != null)? 'OK':'KO',member:member});
});

router.post('/save_openinghours', function(req, res, next) {
  res.send(fablab.save_openinghours(req.body));
});

router.post('/revokecard', function(req, res, next) {
  //
  var stripe_id = req.body.stripe_id;
  fablab.revokeCardFromCustomer(stripe_id,req.app)
  res.send({status:'OK',message:'proccessing'});
});

router.post('/regcard', function(req, res, next) {
  //
  var card_uid = req.body.card;
  var stripe_id = req.body.stripe_id;

  try {
    fablab.addCardToCustomer(card_uid,stripe_id,req.app)
  } catch(err){
    console.log('fail to add card to customer '+ card_uid +', stripeid:'+ stripe_id);
    console.log(err);
  }
  res.send({status:'OK',message:'proccessing'});
});

router.post('/savephoto', function(req, res, next) {
  var stripe_id = req.body.stripe_id;

  var img = req.body.img;
  var name = 'members/'+ stripe_id +'.png';

  try
  {
  	var f = fablab.savephoto(name,img);
	  console.log('photo saved '+ f);
  } catch(e) {
    console.log('fail to save photo');
    console.log(e);
  }

  res.send('ok');
});

router.get('/logs', function(req, res, next) {
  //load logs
  res.send(fablab.logs(100));
});

router.get('/user_groups', function(req, res, next) {
  res.send(fablab.userGroups());
});

router.post('/addMemberToGroup', function(req, res, next) {
  res.send(fablab.addMemberToGroup(req.body.group,req.body.member));
});

router.post('/removeMemberFromGroup', function(req, res, next) {
  res.send(fablab.removeMemberFromGroup(req.body.group,req.body.member));
});

router.post('/add_group', function(req, res, next) {
  res.send(fablab.addGroup(req.body.group));
});

router.post('/remove_group', function(req, res, next) {
  res.send(fablab.removeGroup(req.body.group));
});

router.get('/openings', function(req, res, next) {
  res.send(fablab.openings());
});

router.post('/add_opening', function(req, res, next) {
  res.send(fablab.addOpening());
});

router.post('/saveOpening', function(req, res, next) {
  res.send(fablab.saveOpening(req.body.idx,req.body.opening));
});

router.post('/remove_opening', function(req, res, next) {
  res.send(fablab.removeOpening(req.body.opening));
});


module.exports = router;
