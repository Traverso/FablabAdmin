var socket = io.connect('//127.0.0.1:3000');
var PROCESSING = null;
var STATE = 'lock';
var STATE_CALLBACK = null;
var CURRENT_MEMBER = null;
var MEMBERS_FILTER = null;
var MEMBERS_CACHE = null;
var GROUPS_CACHE = null;
var IS_ADMIN = false;
var TAKING_PHOTO = false;

$(document).ready(function(){
    home();
    member_filter_setup();

    if (Notification) {
      if (Notification.permission !== "granted") Notification.requestPermission();
    }

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
  if(STATE === 'lock') {
    process_lock(uid);
    return;
  }

  $('#cardreader').modal('show');
  $('#cardreader .waiting').show();
  $('#cardreader .alert').hide();
  $('#cardreader .carduid').html(uid);

  if(STATE === 'check_admin') process_admincheck(uid);

  if(STATE === 'regcard') process_regcard(uid);
  
}

function setAdmin(data){
    $('#admin-info').show();
    $('#admin-name').html(data.member.name);
    IS_ADMIN = true;
    if(STATE_CALLBACK != null){
	STATE_CALLBACK();
	STATE_CALLBACK = null;
    }
    setTimeout(clearAdmin,(3000 * 60));
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
              setTimeout(clearProcess,(500));
              return;
            }

            $('#cardreader').modal('hide');
            setAdmin(data);
            setTimeout(clearProcess,(1000 * 1));

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
function pushNotification(title,body){
  
  if(window.Notification && Notification.permission !== "denied") {
    Notification.requestPermission(function(status) {  // status is "granted", if accepted by user
      var n = new Notification(title, { 
        body: body,
        icon: 'http://localhost:3000/images/lab_pass.png' // optional
      }); 

      setTimeout(function(){
          n.close();
      }, 3000); 

    });
  }
}
function process_lock(uid){
    $.ajax({
          method:'GET',
          url:'/access',
          data:{card: uid },
          success:function(data){
            if(data.status ==='KO'){
              pushNotification('Fablab Admin', data.message);
              setTimeout(clearProcess,(1000 * 1));
              return;
            }

            pushNotification('Fablab Admin', data.message);
            setTimeout(clearProcess,(1000 * 1));
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
        if(member.photo){
          $('img',item).attr('src',member.photo);
        }

        $(item).attr('onclick',"member('"+ member.stripeid +"')");

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
  if(!IS_ADMIN){
    check_admin(edit_photo);
    return;
  }

  $('#edit_photo').hide();
  $('#editing_photo').show();
  $('#member_photo').hide();
  $('#video').show();

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
        $('.name',group_item).html(groups[i].name);
        $('.removing',group_item).attr('href','javascript:removeGroup('+ i +')');
        $('.users_mng',group_item).attr('href','javascript:manageGroupUsers('+ i +')');

        $('#user_groups tbody').append(group_item);
  }
}

function manageGroupUsers(idx){
  $('#users_for_group').modal('show');

  //load all user
  if(!MEMBERS_CACHE) {
    $.ajax({
          method:'GET',
          url:'/members',
          success:function(data){
            MEMBERS_CACHE = data;
            render_members_for_group(idx,data);
          },
          dataType:'json'
          });
  } else {
      render_members_for_group(idx,MEMBERS_CACHE);
  }

  render_group_members(idx);
  
}

function render_group_members(idx){

  if(!MEMBERS_CACHE) {
    $.ajax({
          method:'GET',
          url:'/members',
          success:function(data){
            MEMBERS_CACHE = data;
            render_group_members(idx);
          },
          dataType:'json'
          });
    return;
  } 

  $('#group_users').html('');

  for(var i = 0; i < GROUPS_CACHE[idx].members.length;i++){

    for(var j = 0; j < MEMBERS_CACHE.data.length;j++){

      if(GROUPS_CACHE[idx].members[i] == MEMBERS_CACHE.data[j].stripeid)
      {
        var t= '<a href="javascript:remove_member_from_group('+ idx +',\'';
        t+= GROUPS_CACHE[idx].members[i];
        t+= '\')">'+ MEMBERS_CACHE.data[j].name +'</a>';

        $('#group_users').append(t);
      }
    }
  }
}

function render_members_for_group(idx,members){
  $('#all_users').html('');
  var m = members.data;
  for(var i = 0; i < m.length; i++){
    var t= '<a href="javascript:add_member_to_group('+ idx +',\'';
    t+= m[i].stripeid;
    t+= '\')">'+ m[i].name +'</a>';

    $('#all_users').append(t);
  }
}

function remove_member_from_group(idx,member){
  $.ajax({
          method:'POST',
          url:'/removeMemberFromGroup',
          data:{group:idx,member:member},
          success:function(data){
            GROUPS_CACHE = data;
            render_group_members(idx);
          }
         });
}

function add_member_to_group(idx,member){
  $.ajax({
          method:'POST',
          url:'/addMemberToGroup',
          data:{group:idx,member:member},
          success:function(data){
            GROUPS_CACHE = data;
            render_group_members(idx);
          }
         });
}

function removeGroup(idx){
  $.ajax({
          method:'POST',
          url:'/remove_group',
          data:{group:idx},
          success:function(data){
            GROUPS_CACHE = data;
            loadGroups(data);
          }
         });
}

function access(){
  if(!IS_ADMIN){
    check_admin(access);
    return;
  }

  load_panel('access');

  $('#settings_collabsable').on('show.bs.collapse', function (ev) {
      if(ev.target.id == 'user_groups') loadUserGroupPanel();
      if(ev.target.id == 'openings') loadOpeningsPanel();
      if(ev.target.id == 'messages') loadMessagingPanel();
   });

}

function addMessage(){

  $.ajax({
          method:'POST',
          url:'/add_message',
          success:function(data){
            loadMessages(data);
          }
         });
}

function loadMessages(messages){
  $('#message_list').empty();
  for(var i = 0; i < messages.length;i++){
      var msg = $('.message_item','#templates').clone();

      $(msg).attr('id','m_'+ messages[i].id);
      $('.content_area',msg).html(messages[i].content);
      $('.edited',msg).html(messages[i].edited);
      $('.remove',msg).attr('href','javascript:removeMessage(\''+ messages[i].id +'\')');
      $('.edit',msg).attr('href','javascript:editMessage(\''+ messages[i].id +'\')');


      $('.cancel',msg).attr('href','javascript:cancelEditMessage(\''+ messages[i].id +'\')');
      $('.save',msg).attr('href','javascript:saveMessage(\''+ messages[i].id +'\')');
      $('#message_list').append(msg);
  }
}

function removeMessage(id){
  $.ajax({
          method:'POST',
          url:'/removeMessage',
          data:{message:id},
          success:function(data){
            loadMessages(data);
          }
         });
}


var CURRENT_CONTENT = '';
var CURRENT_EDIT = null;

function cancelEditMessage(id){
   $('.ed','#m_'+ id).show();
   $('.cn','#m_'+ id).hide();
   $('.content_area','#m_'+ id).summernote('destroy');
   $('.content_area','#m_'+ id).html(CURRENT_CONTENT);
   CURRENT_EDIT = null;
}

function saveMessage(id){
   $('.ed','#m_'+ id).show();
   $('.cn','#m_'+ id).hide();
   $('.content_area','#m_'+ id).summernote('destroy');
   CURRENT_EDIT = null;
   CURRENT_CONTENT = '';

   $.ajax({
          method:'POST',
          url:'/saveMessage',
          data:{message:id,content:$('.content_area','#m_'+ id).html() },
          success:function(data){
            //
          }
          });
}

function editMessage(id){
   if(CURRENT_EDIT) cancelEditMessage(CURRENT_EDIT);
   //load ui
   $('.content_area','#m_'+ id).summernote({height:300,minHeight:null,maxHeight:null,focus:true});
   $('.ed','#m_'+ id).hide();
   $('.cn','#m_'+ id).show();
   CURRENT_CONTENT = $('.content_area','#m_'+ id).html();
   CURRENT_EDIT = id;
}

function loadMessagingPanel(){
  $.ajax({
          method:'GET',
          url:'/messages',
          success:function(data){
            loadMessages(data);
          }
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
        console.log(openings[i]);
        var opening_item = $('.opening_item','#templates').clone();

        $(opening_item).attr('id','oi_'+ i);

        $('span.from',opening_item).html(openings[i].from);
        $('span.to',opening_item).html(openings[i].to);

        $('input.edfrom',opening_item).val(openings[i].from);
        $('input.edto',opening_item).val(openings[i].to);

        
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
          $('input.date_start_check',opening_item).prop('checked',true);
          $('input.date_start',opening_item).val(openings[i].date_start);
        } else {
          $('.has_date_start .lab',opening_item).hide();
          $('input.date_start_check',opening_item).prop('checked',false);
        }

        if(openings[i].date_end){
          $('.has_date_end .lab',opening_item).show();
          $('span.date_end',opening_item).html(openings[i].date_end);
          $('input.date_end_check',opening_item).prop('checked',true);
          $('input.date_end',opening_item).val(openings[i].date_end);
        } else {
          $('.has_date_end .lab',opening_item).hide();
          $('input.date_end_check',opening_item).prop('checked',false);
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
        $('.saving',opening_item).attr('href','javascript:savingOpening('+ i +')');

        $('#openings table.table > tbody').append(opening_item);
  }
}

function savingOpening(idx){
  //collect data
  var opening = {};
  opening.from = $('.edfrom','#oi_'+ idx).val();
  opening.to = $('.edto','#oi_'+ idx).val();
  opening.periodicity = [];

  $("input:checked",'#oi_'+ idx +' .period').each(function(){
    opening.periodicity.push($(this).attr('class'));
  });

  opening.date_start = '';
  if($('input.date_start_check','#oi_'+ idx).is(':checked')){
    opening.date_start = $('input.date_start','#oi_'+ idx).val();
  }

  opening.date_end = '';
  if($('input.date_end_check','#oi_'+ idx).is(':checked')){
    opening.date_end = $('input.date_end','#oi_'+ idx).val();
  }

  opening.groups = [];
  $("input:checked",'#oi_'+ idx +' .group').each(function(){
      var g =$('.title',$(this).parent()).text();
      opening.groups.push(g);
  });

  opening.active = ($("input[name=status_rad_"+ idx +"]:checked",'#oi_'+ idx).val() == 'aktiv'); 
  //console.log(opening);

  $.ajax({
        method:'POST',
        url:'/saveOpening',
        data:JSON.stringify({idx:idx,opening:opening}),
        success:function(data){
          loadOpenings(data);
        },
        contentType:'application/json',
        dataType:'json'
        });
}

function cancelOpening(idx){
  $('.ed','#oi_'+ idx).hide();
  $('.lab','#oi_'+ idx).show();

  if(!$('input.date_start_check','#oi_'+ idx).is(':checked'))
  {
    $('.has_date_start .lab','#oi_'+ idx).hide();
  }

  if(!$('input.date_end_check','#oi_'+ idx).is(':checked'))
  {
    $('.has_date_end .lab','#oi_'+ idx).hide();
  }
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
          data.unshift({name:'Alle'});
          for(var i = 0; i < data.length; i++){
            
            var gs = $('.group_selector','#templates').clone();
            $('.title',gs).html(data[i].name);

            for(var j = 0; j < sel_group.length; j++){
              if(sel_group[j] == data[i].name){
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
          GROUPS_CACHE = data;
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

  $('#frontpage_messages').empty();

  $.ajax({
          method:'GET',
          url:'/messages',
          success:function(data){
            for(var i =0; i < data.length;i++){
              var msg = $('.front_message_item','#templates').clone();
              $('.content_area',msg).html(data[i].content);
              $('.edited',msg).html(data[i].edited);
              $('#frontpage_messages').append(msg);
            }
          }
         });
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

