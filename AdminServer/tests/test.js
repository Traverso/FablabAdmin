var assert = require('assert');
//var expect = require('expect');
var fablab = require('fablab');
var moment =require('moment');


describe('Fablab#openinghours',function(){
  beforeEach(function(){
    current = fablab.openinghours();
  })
  it('should have a start hour',function(){
    assert.equal(true,!isNaN(parseInt(current.from_hour)));
  });

  it('should have a start minute',function(){
    assert.equal(true,!isNaN(parseInt(current.from_minute)));
  });

  it('should have an end hour',function(){
    assert.equal(true,!isNaN(parseInt(current.to_hour)));
  });

  it('should have an end minute',function(){
    assert.equal(true,!isNaN(parseInt(current.to_minute)));
  });
});

/*
describe('Fablab#appendLog',function(){

  it('should add a log entry',function(){
    var logs_1 = fablab.getLogs(null); 
    fablab.appendLog('OK','xxxx','test log entry',null);
    var logs_2 = fablab.getLogs(null); 

    assert.equal(true,((logs_1.length + 1)=== logs_2.length));
  });
});
*/

describe('Fablab#isAdmin',function(){
  it('should not be admin',function(){
    assert.equal(false,fablab.isAdmin('abc'));
  });

  it('should be admin',function(){
    assert.equal(true,fablab.isAdmin('cus_5xDIdbC7KEqrb5'));
  });
});

describe('Fablab#memberSyncDate',function(){
  it('should look like a date',function(){
    assert.equal(true,looksLikeDate(fablab.membersSyncDate()));
  });
});



describe('Fablab#isOpen',function(){

  var openinghours = {'from_hour':'08','from_minute':'00','to_hour':'20','to_minute':'00'};

  it('should be open',function(){
    var currentTime = new Date();
    currentTime.setHours(12,0,0);
    assert.equal(true,fablab.isOpen(currentTime,openinghours));
  });

  it('should be to early and close',function(){
    var currentTime = new Date();
    currentTime.setHours(4,0,0);
    assert.equal(false,fablab.isOpen(currentTime,openinghours));
  });

  it('should be to late and close',function(){
    var currentTime = new Date();
    currentTime.setHours(22,0,0);
    assert.equal(false,fablab.isOpen(currentTime,openinghours));
  });

});

function looksLikeDate(d){
  return moment(d).isValid();
}

