var socket = io.connect('//127.0.0.1:3000');
var PROCESSING = null;
var STATE = 'lock';
var STATE_CALLBACK = null;
var CURRENT_MEMBER = null;
var MEMBERS_FILTER = null;
var MEMBERS_CACHE = null;
var IS_ADMIN = false;
var TAKING_PHOTO = false;

$(document).ready(function(){
    load_clocks();
    member_filter_setup();
});

socket.on('card',function(data){
    if(is_processing(data.card)) return;
    process_card(data.card);
});

socket.on('members',function(data){

  $('#sync_action').show();
  $('#sync_wait').hide();
  MEMBERS_CACHE = data;
  render_members(data);

});

function member_filter_setup(){
  $('#member_filter').change(function(){
      var filter = $('#member_filter').val();
      MEMBERS_FILTER = (filter === 'all')? null:filter;
      render_members(MEMBERS_CACHE);
  });
}

function is_processing(uid){
  if(PROCESSING == null) return false;
  return true;
}

function process_card(uid){
  
  PROCESSING = uid;
  $('#cardreader').modal('show');
  $('#cardreader .waiting').show();
  $('#cardreader .alert').hide();
  $('#cardreader .carduid').html(uid);

  if(STATE === 'check_admin') process_admincheck(uid);

  if(STATE === 'regcard') process_regcard(uid);
  
  if(STATE === 'lock') process_lock(uid);
}

function setAdmin(data){
    $('#admin-info').show();
    $('#admin-name').html(data.member.name);
    IS_ADMIN = true;
    if(STATE_CALLBACK != null){
	STATE_CALLBACK();
	STATE_CALLBACK = null;
    }
    setTimeout(clearAdmin,(1000 * 60));
}
function clearAdmin(){
    if(TAKING_PHOTO){
    	setTimeout(clearAdmin,(1000 * 60));
    }
    $('#admin-info').hide();
    IS_ADMIN = false;
}

function process_admincheck(uid){
    $.ajax({
          method:'GET',
          url:'/admincheck',
          data:{card: uid},
          success:function(data){
            STATE = 'lock';
            if(data.status ==='KO'){
              $('#cardreader .ko_message').show();
              $('#cardreader .waiting').hide();
              $('#cardreader .ko_message').html('Du har ikke rettigheder til handlingen');
              setTimeout(clearProcess,(1000 * 4));
              return;
            }

            $('#cardreader').modal('hide');
            setAdmin(data);

          },
          dataType:'json'
          });
}

function process_regcard(uid){
    $.ajax({
          method:'POST',
          url:'/regcard',
          data:{card: uid, stripe_id: CURRENT_MEMBER },
          success:function(data){
            if(data.status ==='KO'){
              $('#cardreader .ko_message').show();
              $('#cardreader .waiting').hide();
              $('#cardreader .ko_message').html(data.message);
              setTimeout(clearProcess,(1000 * 4));
              return;
            }

            $('#cardreader .ok_message').show();
            $('#cardreader .waiting').hide();
            $('#cardreader .ok_message').html(data.message);
            $('.member_card','#member_profile_table').html(uid);
            $('#discard_member_card').show();
            setTimeout(clearProcess,(1000 * 3));
          },
          dataType:'json'
          });
}

function process_lock(uid){
    $.ajax({
          method:'GET',
          url:'/access',
          data:{card: uid },
          success:function(data){
            if(data.status ==='KO'){
              $('#cardreader .ko_message').show();
              $('#cardreader .waiting').hide();
              $('#cardreader .ko_message').html(data.message);
              setTimeout(clearProcess,(1000 * 4));
              return;
            }

            $('#cardreader .ok_message').show();
            $('#cardreader .waiting').hide();
            $('#cardreader .ok_message').html(data.message);
            setTimeout(clearProcess,(1000 * 3));
          },
          dataType:'json'
          });
}

function clearProcess(){
  $('#cardreader').modal('hide');
  PROCESSING = null;
  STATE = 'lock';
}

function members_view(){
  $('.members_view').hide();
  if($('#list_view').is(':checked')) $('#members_list_view').show();
  if($('#grid_view').is(':checked')) $('#members_grid_view').show();
}

function load_panel(panel){
    $('.fb_panel').hide();
    $('#'+ panel).show();
}

function members(){
  load_panel('members');

  $.ajax({
        method:'GET',
        url:'/members',
        success:function(data){
          MEMBERS_CACHE = data;
          render_members(data);
        },
        dataType:'json'
        });
}

function render_members(members){
    $('#members_list_view tbody').empty();
    $('#members_grid_view').empty();

    $('#last-synced').html(members.synced);

    var idx = 0;
    for(var i = 0; i < members.data.length;i++){
        var item = $('#templates .list_item').clone();
        var member = members.data[i];

        var admin = '';
        if(member.is_admin){
          admin = '<span class="glyphicon glyphicon-star"></span> ';
        }

        if(MEMBERS_FILTER != null){
          if(member.member_status != 'active') console.log(member.member_status);
          if(MEMBERS_FILTER === 'admin'){
            if(member.is_admin === false) continue;
          } else {
            if(member.member_status != MEMBERS_FILTER) continue;
          }
        }

        $('.name',item).html( admin + member.name);
        $('.email',item).html(member.email);
        $('.status',item).html(member.member_status);
        $('.kort_id',item).html(member.card_uid);
        $(item).attr('onclick',"member('"+ member.stripeid +"')");

        $('#members_list_view tbody').append(item);

        item = $('#templates .grid_item').clone();
        $('.name',item).html( admin + member.name);
        $('.email',item).html(member.email);
        $('.status',item).html(member.member_status);

        $('#members_grid_view').append(item);
        idx++;
    }
    $('#member_count').html(idx);
}

function member(id){
  load_panel('member');

  CURRENT_MEMBER = id; 
  $('#member_profile').hide();
  $('#member_loading').show();
  $('#video').hide();
  $('#photo_canvas').hide();
  $('#member_photo').show();
  $('#edit_photo').show();
  $('#editing_photo').hide();

  $.ajax({
        method:'GET',
        url:'/member?id='+ id,
        success:function(data){
          $('#member_profile').show();
          $('#member_loading').hide();
        
          $('.member_name','#member_profile').html(data.name);
          $('.member_status','#member_profile').html(data.member_status);
          $('.stripeid','#member_profile').html(data.stripeid);
          $('.member_email','#member_profile').html(data.email);
          $('.member_address','#member_profile').html(data.address);
          $('.member_zip','#member_profile').html(data.zip);
          $('.member_city','#member_profile').html(data.city);
          $('.member_country','#member_profile').html(data.country);
          $('.member_since','#member_profile').html(data.member_since);

          if(!data.card_uid){
            $('.member_card','#member_profile').html('ingen registreret kort');
            $('#discard_member_card').hide();
          } else {
            $('#discard_member_card').show();
            $('.member_card','#member_profile').html(data.card_uid);
          }

	  if(!data.photo){
  	  	$('#member_photo').attr('src','images/img_nogravatar.png');
          } else {
  	  	$('#member_photo').attr('src',data.photo +'?v='+ new Date().getTime());
          }
          
        },
        dataType:'json'
        });
}

function sync_now(){
  $('#sync_action').hide();
  $('#sync_wait').show();

  $.ajax({
        method:'POST',
        url:'/syncmembers',
        success:function(data){
          console.log(data);
        },
        dataType:'json'
        });
}

function shutdown(){
  if(!IS_ADMIN){
    check_admin(shutdown);
    return;
  }

  $.ajax({
        method:'GET',
        url:'/shutdown',
        success:function(data){
		;
	}
   });
}

function edit_photo(){

  /*
  if(!IS_ADMIN){
    check_admin(edit_photo);
    return;
  }
  */
  //
  //
  $('#edit_photo').hide();
  $('#editing_photo').show();
  $('#member_photo').hide();
  $('#video').show();
  //socket.emit('start-photo');
  //TAKING_PHOTO = true;
  //
  var video = document.getElementById('video');
  var mediaConfig =  { video: true };
			// Put video listeners into place
            if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia(mediaConfig).then(function(stream) {
                    video.src = window.URL.createObjectURL(stream);
                    video.play();
                });
            }

            /* Legacy code below! */
            else if(navigator.getUserMedia) { // Standard
				navigator.getUserMedia(mediaConfig, function(stream) {
					video.src = stream;
					video.play();
				}, errBack);
			} else if(navigator.webkitGetUserMedia) { // WebKit-prefixed
				navigator.webkitGetUserMedia(mediaConfig, function(stream){
					video.src = window.webkitURL.createObjectURL(stream);
					video.play();
				}, errBack);
			} else if(navigator.mozGetUserMedia) { // Mozilla-prefixed
				navigator.mozGetUserMedia(mediaConfig, function(stream){
					video.src = window.URL.createObjectURL(stream);
					video.play();
				}, errBack);
			}
}

function cancel_photo(){
  $('#edit_photo').show();
  $('#editing_photo').hide();
  $('#video').hide();
  $('#member_photo').show();
  $('#photo_waiting').hide();

  TAKING_PHOTO = false;
}

function save_photo(){
  $('#video').hide();
  $('#photo_canvas').show();

  $('#edit_photo').show();
  $('#editing_photo').hide();

  var canvas = document.getElementById('photo_canvas');
  canvas.width = 300;
  canvas.height = 250;
  var context = canvas.getContext('2d');
  var video = document.getElementById('video');
  context.drawImage(video, 0, 0, 300, 250);

  $.ajax({
          method:'POST',
          url:'/savephoto',
          data:{stripe_id: CURRENT_MEMBER,img:canvas.toDataURL("image/png") },
          success:function(data){
            //$('#member_photo').attr('src',data);
          }
          });
}

function addGroup(){
  var group_name = $('.group_name','#user_groups').val();

  console.log('group:'+ group_name);
  if(!group_name || group_name == '')  {
    $('.group_name','#user_groups').focus();
    return;
  }

  $.ajax({
          method:'POST',
          url:'/add_group',
          data:{group:group_name },
          success:function(data){
            loadGroups(data);
            $('.group_name','#user_groups').val('');
            $('.group_name','#user_groups').focus();
          }
         });
}

function loadGroups(groups){

  $('tbody','#user_groups').html('');
  if(groups.length == 0) return;

  for(var i = 0; i < groups.length;i++){
        var group_item = $('.group_item','#templates').clone();
        $('.name',group_item).html(groups[i]);
        $('.removing',group_item).attr('href','javascript:removeGroup('+ i +')');

        $('#user_groups tbody').append(group_item);
  }
}

function removeGroup(idx){

  $.ajax({
          method:'POST',
          url:'/remove_group',
          data:{group:idx},
          success:function(data){
            loadGroups(data);
          }
         });
}

function access(){
  /*
  if(!IS_ADMIN){
    check_admin(access);
    return;
  }
  */

  load_panel('access');

  $('#settings_collabsable').on('show.bs.collapse', function (ev) {
       
      if(ev.target.id == 'user_groups') loadUserGroupPanel();
      if(ev.target.id == 'openings') loadOpeningsPanel();
   });

}

function loadOpeningsPanel(){
  $('.panel-body','#openings').html($('.openings','#templates').clone());

  //load
  $.ajax({
        method:'GET',
        url:'/openings',
        success:function(data){
          loadOpenings(data);
        },
        dataType:'json'
        });
}

function addOpening(){
  //load
  $.ajax({
        method:'POST',
        url:'/add_opening',
        success:function(data){
          loadOpenings(data);
          editOpening(data.length - 1);
        },
        dataType:'json'
        });
}

function loadOpenings(openings){

  $('tbody','#openings').html('');
  if(openings.length == 0) return;

  for(var i = 0; i < openings.length;i++){
        var opening_item = $('.opening_item','#templates').clone();

        $(opening_item).attr('id','oi_'+ i);

        $('span.from',opening_item).html(openings[i].from);
        $('span.to',opening_item).html(openings[i].to);

        $('input.from',opening_item).val(openings[i].from);
        $('input.to',opening_item).val(openings[i].to);

        
        $('.has_periodicity input',opening_item).prop('checked',false);
        $('.has_periodicity span.lab',opening_item).hide();

        if(openings[i].periodicity.length){
          $('.has_periodicity span.lab',opening_item).show();
          $('.periodicity',opening_item).html(openings[i].periodicity.join());
          for(var j = 0; j < openings[i].periodicity.length; j++){
            $('.period input.'+ openings[i].periodicity[j],opening_item).prop('checked',true);
          }
        }

        if(openings[i].date_start){
          $('.has_date_start .lab',opening_item).show();
          $('span.date_start',opening_item).html(openings[i].date_start);
          $('.date_start_check',opening_item).attr('checked','checked');
          $('input.date_start',opening_item).val(openings[i].date_start);
        } else {
          $('.has_date_start .lab',opening_item).hide();
          $('.date_start_check',opening_item).attr('checked','');
        }

        if(openings[i].date_end){
          $('.has_date_end .lab',opening_item).show();
          $('span.date_end',opening_item).html(openings[i].date_end);
          $('.date_end_check',opening_item).attr('checked','checked');
          $('input.date_end',opening_item).val(openings[i].date_end);
        } else {
          $('.has_date_end.lab',opening_item).hide();
          $('.date_end_check',opening_item).attr('checked','');
        }


        $('.for_groups',opening_item).html(openings[i].groups.join());
        $('.ed_groups',opening_item).val(openings[i].groups.join());
        $('span.status',opening_item).html(openings[i].active?'Aktiv':'Ikke aktiv');

        $('.status input',opening_item).attr('name','status_rad_'+ i);
        $('.status input',opening_item).attr('id','status_rad_'+ i);
        $('.status input',opening_item).prop('checked',false);

        if(openings[i].active){
          $('.status input.aktiv',opening_item).prop('checked',true);
        } else {
          $('.status input.inaktiv',opening_item).prop('checked',true);
        }

        $('.ed',opening_item).hide(); 
        $('.removing',opening_item).attr('href','javascript:removeOpening('+ i +')');
        $('.editing',opening_item).attr('href','javascript:editOpening('+ i +')');

        $('.canceling',opening_item).attr('href','javascript:cancelOpening('+ i +')');

        $('#openings table.table > tbody').append(opening_item);
  }
}

function cancelOpening(idx){
  $('.ed','#oi_'+ idx).hide();
  $('.lab','#oi_'+ idx).show();
}

function removeOpening(idx){
  $.ajax({
          method:'POST',
          url:'/remove_opening',
          data:{opening:idx},
          success:function(data){
            loadOpenings(data);
          }
         });
}

function editOpening(idx){
  $('.ed','#oi_'+ idx).show();
  $('.lab','#oi_'+ idx).hide();
  $('.group .ed','#oi_'+ idx).html('');

  var sel_group = $('.ed_groups','#oi_'+ idx).val().split(',');

  //load groups
  $.ajax({
        method:'GET',
        url:'/user_groups',
        success:function(data){
          data.unshift('Alle');
          for(var i = 0; i < data.length; i++){
            
            var gs = $('.group_selector','#templates').clone();
            $('.title',gs).html(data[i]);

            for(var j = 0; j < sel_group.length; j++){
              if(sel_group[j] == data[i]){
                  $('input',gs).prop('checked',true);
              }
            }

            $('.group .ed','#oi_'+ idx).append(gs);
          }
        },
        dataType:'json'
        });
}

function loadUserGroupPanel(){
  $('.panel-body','#user_groups').html($('.user_groups','#templates').clone());
  $('form','#user_groups').submit(function(event){
      addGroup();
      event.preventDefault();
  });

  //load
  $.ajax({
        method:'GET',
        url:'/user_groups',
        success:function(data){
          loadGroups(data);
        },
        dataType:'json'
        });
}

function logs(){
  load_panel('logs');
  $('#logs_view tbody').empty();
  $('#logs_view tbody').append($('.waiting_logs','#templates').clone());

  $.ajax({
        method:'GET',
        url:'/logs',
        success:function(data){

          $('#logs_view tbody').empty();

          if(data.length == 0){
            $('#logs_view tbody').append($('.no_logs','#templates').clone());
            return;
          }

          for(var i = 0; i < data.length; i++){
            var log_item = $('.log_item','#templates').clone();

            $('.tidspunkt',log_item).html(data[i].timestamp);
            $('.kort_id',log_item).html(data[i].card_uid);

            if(data[i].member){
              $('.member',log_item).attr('href',"javascript:member('"+ data[i].stripeid +"')");
              $('.member',log_item).html(data[i].member.name);
            } else {
              $('.member',log_item).html(data[i].stripeid);
            }

            $('.status',log_item).html(data[i].message);

            $('#logs_view tbody').append(log_item);
          }
        },
        dataType:'json'
        });
}

function home(){
  load_panel('home');
}

function edit_opening_hours(){

  PROCESSING = null;
  $('#opening_hours').hide();
  $('#opening_hours_edit').show();
}

function load_clocks(){
    $.ajax({
          method:'GET',
          url:'/openinghours',
          success:function(data){
            set_clock(data);
          },
          dataType:'json'
          });
}
function save_opening_hours(){
    $.ajax({
          method:'POST',
          url:'/save_openinghours',
          data:{
                "from_hour":$('#from-hour').val(),
                "from_minute":$('#from-minutes').val(),
                "to_hour":$('#to-hour').val(),
                "to_minute":$('#to-minutes').val()
                },
          success:function(data){
            set_clock(data);

            $('#opening_hours').show();
            $('#opening_hours_edit').hide();
          },
          dataType:'json'
          });
}

function set_clock(data){
  
  $('select.hours').empty();
  $('select.minutes').empty();


  for(var i = 0; i < 24;i++){
    var h = (i + 1);
    if(h < 10) h = '0'+ h;
    $('select.hours').append('<option>'+ h +'</option>');
  }

  for(var i = 0; i < 4;i++){
    var m = (i * 15);
    if(i==0) m = '00';
    $('select.minutes').append('<option>'+ m +'</option>');
  }

  $('.from-time').html(data.from_hour +':'+ data.from_minute);
  $('.to-time').html(data.to_hour +':'+ data.to_minute);

  $('#from-hour').val(data.from_hour);
  $('#from-minutes').val(data.from_minute);

  $('#to-hour').val(data.to_hour);
  $('#to-minutes').val(data.to_minute);
}

function cancel_opening_hours(){
  $('#opening_hours').show();
  $('#opening_hours_edit').hide();
}

function check_admin(callback){
  console.log('checking admin');
  $('#cardreader').modal('show');
  $('#cardreader .alert').hide();
  $('#cardreader .carduid').html('');
  var msg = 'Kun administratorer har lov til handlingen. Swipe dit kort for at identificere dig';
  $('#cardreader .ko_message').html(msg);
  $('#cardreader .ko_message').show();

  STATE = 'check_admin';
  STATE_CALLBACK = callback;
}

function discard_member_card(){
  if(!IS_ADMIN){
    check_admin();
    return;
  }

  PROCESSING = null;
  $('#discard_wait').show();
  $('#discard_member_card').hide();

  //ajax call discard
  $.ajax({
          method:'POST',
          url:'/revokecard',
          data:{stripe_id: CURRENT_MEMBER },
          success:function(data){
            $('#discard_wait').hide();
            $('.member_card','#member_profile').html('ingen registreret kort');
          },
          dataType:'json'
          });

}

function edit_member_card(){
  if(!IS_ADMIN){
    check_admin();
    return;
  }

  $('#cardreader').modal('show');
  $('#cardreader .waiting').hide();
  $('#cardreader .alert').hide();
  $('#cardreader .carduid').html('');
  var msg = 'Swipe et kort for at tilknytte det til brugeren';

  $('#cardreader .ok_message').html(msg);
  $('#cardreader .ok_message').show();

  PROCESSING = null;
  STATE = 'regcard';
}

function cancel_edit_card(){
  $('#member_profile_table').show();
  $('#member_edit_card').hide();
}
