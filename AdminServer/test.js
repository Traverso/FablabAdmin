var assert = require('assert');
//var expect = require('expect');
var fablab = require('fablab');
var moment =require('moment');


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

describe('Fablab#haveMatchingGroup',function(){
  it('should have a match',function(){
    assert.equal(true,fablab.haveMatchingGroup(['a','b','c'],['x','y','z','a']));
  });

  it('should not have a match',function(){
    assert.equal(false,fablab.haveMatchingGroup(['a','b','c'],['x','y','z']));
  });
});

describe('Fablab#currentMomentMatchOpening',function(){

  var opening = {
                    from:'17:00',
                    to:'20:00',
                    periodicity:['daily'],
                    date_start:'',
                    date_end:'',
                    active:true,
                    groups:['Alle']
                };

  it('should be open',function(){
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    assert.equal(true,fablab.currentMomentMatchOpening(opening));
  });

  it('should be close - arrive to early',function(){
    opening.from = moment().add(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    assert.equal(false,fablab.currentMomentMatchOpening(opening));
  });

  it('should be close - arrive to late',function(){
    opening.from = moment().subtract(2,'hour').hour() + ':00';
    opening.to = moment().subtract(1,'hour').hour() + ':00';
    assert.equal(false,fablab.currentMomentMatchOpening(opening));
  });

  it('should be closed - no periodicity',function(){
    opening.periodicity = [];
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    assert.equal(false,fablab.currentMomentMatchOpening(opening));
  });

  it('should be open - periodicity match day',function(){
    opening.periodicity = [];
    opening.periodicity.push(moment().format('dddd').toLowerCase());
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    assert.equal(true,fablab.currentMomentMatchOpening(opening));
  });

  it('should be closed - periodicity dont match day',function(){
    opening.periodicity = [];
    var m = moment().add(1,'day').format('dddd').toLowerCase();
    opening.periodicity.push(m);
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    assert.equal(false,fablab.currentMomentMatchOpening(opening));
  });

  it('should be open - date start set',function(){
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    opening.periodicity = ['daily'];
    opening.date_start = moment().subtract(1,'day').format('YYYY-MM-DD');

    assert.equal(true,fablab.currentMomentMatchOpening(opening));
  });

  it('should be closed - before date start',function(){
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    opening.periodicity = ['daily'];
    opening.date_start = moment().add(1,'day').format('YYYY-MM-DD');

    assert.equal(false,fablab.currentMomentMatchOpening(opening));
  });

  it('should be open - date end set',function(){
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    opening.periodicity = ['daily'];
    opening.date_start = '';
    opening.date_end = moment().add(1,'day').format('YYYY-MM-DD');

    assert.equal(true,fablab.currentMomentMatchOpening(opening));
  });

  it('should be closed - after date end set',function(){
    opening.from = moment().subtract(1,'hour').hour() + ':00';
    opening.to = moment().add(2,'hour').hour() + ':00';
    opening.periodicity = ['daily'];
    opening.date_start = '';
    opening.date_end = moment().subtract(1,'day').format('YYYY-MM-DD');

    assert.equal(false,fablab.currentMomentMatchOpening(opening));
  });

});



function looksLikeDate(d){
  return moment(d).isValid();
}

