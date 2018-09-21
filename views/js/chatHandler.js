//handles the chat interface
function ChatHandler(options){

  var self = this;
  var noti, locationHandler = null;

  this.state = options || {};
  //user ID of current chat. defaults to 'rescueline-bot' for citizen
  this.state.current_target = (typeof this.state.type == "undefined") ? "rescueline-bot" : null;

  this.setNoti = function(n){
    noti = n;
  };

  this.setLocationHandler = function(lH){
    locationHandler = lH;
  };

  //start a chat session
  this.startChat = function(username,token){
    $('.chat-log').html('<div class="spinner c-align-abs"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>');
    self.state.current_target = username;
    $.get("/api/chat/logs?username="+ username + "&token="+ token)
        .done(function(response) {
          console.log(response);
          if (response.status == "success"){
            if (response.data.length == 0 || $.isEmptyObject(response.data)){
              $('.chat-log').html('<div class="chat-starter c-align-abs f17 cl-light-gray tc" style="width:180px;height:70px;">No recent logs.<br>Start the conversation</div>');
              return false;
            }
            $('.chat-log').html('');
            for (var i = 0; i < response.data.length; i++){
              if (i == (response.data.length - 1))
                self.insertChat(response.data[i],(response.data[i].sender == username) ? "rec" : "sent");
              else
                self.insertChat(response.data[i],(response.data[i].sender == username) ? "rec" : "sent",false);
            }

          } else {
            //error
            handleError(response.error);
          }
        });
  }

  //get chat history
  this.getHistory = function(token, notify){
    // GET /api/chat/history/:token

    $.get("/api/chat/history/"+ token)
        .done(function(response) {
          console.log(response);
          if (response.status == "success"){
            var $ch = $('.ch-cont');
            var unreadCount = 0;

            $ch.html('');

            if (self.state.type == "notcitizen"){

              if (self.state.current_target == null){
                $('.chat-log').html('<div class="chat-starter c-align-abs f17 cl-light-gray tc" style="width:180px;height:70px;">No recent logs</div>');
                $('.ch-head-name').html('Get started');
              }

              if (response.data.length == 0){
                $ch.html('<div class="tc f-med cl-light-gray" style="margin-top:100px;">No recent chats</div>');
                return;
              }

            }

            if (self.state.type != "notcitizen"){
              //append default chat with bot
              $ch.append(buildChatHistory({
                      other_user : "rescueline-bot",
                      sender : "rescueline-bot",
                      name : "Get Help",
                      msg: "Click here to get help now",
                      profile_pic : "/assets/placeholder.jpg",
                      read : true
                    },true));
            }

            for (var i = 0; i < response.data.length; i++){
              if (!response.data[i].read && response.data[i].other_user == response.data[i].sender)
                unreadCount++;
              $ch.append(buildChatHistory(response.data[i]));
            }

            if (unreadCount > 0 && notify){
              var s = (unreadCount > 1) ? "s" : "";
              noti.notify({ name : "New messages", msg : "You have "+ unreadCount +" unread message" + s, view: "get_help" });
            }
            setTimeout(function(){
              handleChatAnimations();
            },200);

          } else {
            handleError(response.error);
          }
        });

  }

  this.getNearby = function(token,location){
    //get nearby people to chat with
    // GET /api/chat/nearby

    $.get("/api/chat/nearby?location="+ JSON.stringify(location) +"&token="+ token)
        .done(function(response) {
          console.log(response);

          if (response.status == "success"){
            var $ch = $('.ch-cont');

            if (response.data.length == 0){
              $ch.html('<div class="tc f-med cl-light-gray" style="margin-top:100px;">Noone nearby</div>');
              return;
            }

            $ch.html('');

            var u = null;
            for (var i = 0; i < response.data.length; i++){
              u = response.data[i];
              u.other_user = u.username;
              u.name +=  " (" + u.type.charAt(0).toUpperCase() + u.type.slice(1) + ")";
              u.sender = u.username;
              u.read = true;
              u.msg = "Click to start chat";
              $ch.append(buildChatHistory(response.data[i]));
            }

            setTimeout(function(){
              handleChatAnimations();
            },200);

          } else {
            //error
            handleError(response.error);
          }

        });

  }

  //inserts chat
  //type can be 'rec' (received) or 'sent'
  //msgInfo example {msg: "Hello this is the message.", time: '13 mins'}
  //animate is false if you don't want to animate scroll
  this.insertChat = function(msgInfo,type,animate){
    var msgEl = document.createElement('div');
    var $chatLog = $('.chat-log');
    if (type == "rec"){
      $(msgEl).html('<div class="chat-row"><div class="received paper">'+ msgInfo.msg +'<div class="ts abs bottom-right">'+ msgInfo.timestamp +'</div></div></div>');
      $('.chat-log').append(msgEl);
    } else {
      $(msgEl).html('<div class="chat-row o-h"><div class="sent">'+ msgInfo.msg +'<div class="ts abs bottom-right">'+ msgInfo.timestamp +'</div></div></div>');
      $('.chat-log').append(msgEl);
    }

    //don't animate, exit early
    if (animate === false)
      return msgEl;

    //animate chat message insert scroll
    setTimeout(function(){
      $chatLog.animate({
        scrollTop: $chatLog[0].scrollHeight
      }, 500);
    },400);

    return msgEl;
  }

  function sendAssistantChat(message,token){
    var msgEl = self.insertChat({msg: message, timestamp:'now'}, 'sent'); //insert, but if it is an error, we will remove DOM element.
    $.ajax({
      method: "POST",
      url: "/api/ai/chat",
      contentType: "application/json",
      data: JSON.stringify({ input: message, token: token, location: localStorage.getItem('location-precise') })
    }).done(function(response){
      console.log(response);
      if (response.status == "success"){
        if ($('.chat-log').find('.chat-starter').length > 0)
          $('.chat-log').find('.chat-starter').remove();

        $('.chat-input').val('');
        self.insertChat({msg: response.data.msg, timestamp: new Date().toLocaleString()}, 'rec');
      } else {
        // TODO: send error properly from server-side
        handleError(response.error);
        $(msgEl).remove();
      }
    });
  }

  function sendChat(message,token){

    if (self.state.current_target == null)
      return false;

    console.log("in send chat");
    var msgEl = self.insertChat({msg: message, timestamp:'now'}, 'sent'); //insert, but if it is an error, we will remove DOM element.
    var payload = {
      "receiver" : self.state.current_target,
      "msg" : message
    };
    $.ajax({
      method: "POST",
      url: "/api/chat/send",
      contentType: "application/json",
      data: JSON.stringify({ message: payload, token: token })
    }).done(function(response){
      console.log(response);
      if (response.status == "success"){
        if ($('.chat-log').find('.chat-starter').length > 0)
          $('.chat-log').find('.chat-starter').remove();

        $('.chat-input').val('');
      } else {
        // TODO: send error properly from server-side
        handleError(response.error);
        $(msgEl).remove();
      }
    });
  }

  var handleChat = function ($chatInput){
    var chat = $chatInput.val();
    if ($.trim(chat).length > 0){
      if (self.state.current_target == "rescueline-bot"){
        sendAssistantChat(chat, Cookies.get('token'));
      } else {
        sendChat(chat,Cookies.get('token'));
      }
    }
  };

  function handleChatAnimations(){
    //handles button animations
    $('.ch-cont>.a-b').on('mouseover',function(){
      if ($(this).hasClass('no-a-b'))
        return;
      var winWidth = $(document).width();
      if (winWidth < 700)
        return;
      var $btn = $(this);
      $btn.css('background-color','rgba(155,155,155,0.2)');
    });
    $('.ch-cont>.a-b').on('mouseout',function(){
      if ($(this).hasClass('no-a-b'))
        return;
      var $btn = $(this);
      $btn.css('background-color','transparent');
    });
  }

  //builds a chat history div
  //active is true or false
  function buildChatHistory(chatInfo,active){
    var chClass = "ch-item a-b";
    var chatHistory = document.createElement('div');
    var previewClass = "ch-msg roboto-thin cl-light-gray";
    var preview = "";

    if (typeof chatInfo.profile_pic == "undefined" || chatInfo.profile_pic == "none")
      chatInfo.profile_pic = "/assets/placeholder.jpg";

    if (!chatInfo.read)
      previewClass += " bold";

    if (active)
      chClass += " ch-active no-a-b";

    if (chatInfo.other_user != chatInfo.sender)
      chatInfo.msg = "You: " + chatInfo.msg;

    //if chat is too long, generate preview
    if (chatInfo.msg.length > 35)
      chatInfo.msg = chatInfo.msg.slice(0,32) + "...";

    chatHistory.className = chClass;

    $(chatHistory).html(
      '<div class="ch-item-pic inva"><img src="'+ chatInfo.profile_pic +'"></div>'
      +'<div class="ch-preview inva"><span class="ch-item-name f-med">'+ chatInfo.name +'</span><br><span class="'+ previewClass +'">'+ chatInfo.msg +'</span></div>'
    );

    //set what happens when a chat in chat history is clicked
    $(chatHistory).on('click',function(){

      //mark chat as read
      if (chatInfo.read == false){
        chatInfo.read = true;
        $.get("/api/chat/read/"+ chatInfo._id)
            .done(function(response) {
              console.log("Read the chat");
              console.log(response);
              if (response.status == "success"){
                console.log("Marked chat as read");
              } else {
                //error
                console.log("Could not mark chat as read");
                handleError(response.error);
              }
            });
      }

      self.startChat(chatInfo.other_user,Cookies.get('token'));
      $('.ch-cont .ch-active').css('background-color','transparent');
      $('.ch-cont .ch-active').removeClass('ch-active a-b no-a-b');
      $(this).attr('style','');
      $(this).addClass('ch-active a-b no-a-b');
      $(this).find('.ch-msg').removeClass('bold');
      $('.ch-head-name').html(chatInfo.name);
      if ($(document).width() < 700)
        $('.chat-history').removeAttr('style');
    });

    return chatHistory;
  }

  $(".chat-input").on("keydown", function(e) {
      if(e.which == 13){
        handleChat($(this));
      }
  });

  $("#chat_send").on("click", function() {
    handleChat($('.chat-input'));
  });

  $("#ch_nearby").on("click", function() {
    if ( !locationHandler.hasLocation() ){
      locationHandler.precisePrompt();
      return false;
    }
    $('.ch-head-item').removeClass('chi-active');
    $(this).addClass('chi-active');
    self.getNearby(Cookies.get('token'),locationHandler.getLocation());
  });

  $("#ch_history").on("click", function() {
    $('.ch-head-item').removeClass('chi-active');
    $(this).addClass('chi-active');
    self.getHistory(Cookies.get('token'),noti);
  });

}

$(document).on('ready',function(){

  //set js triggers for chat UI

  //show chat box
  $('.chat-history-show').on('click',function(){
    $('.chat-history').css('display','inline-block');
  });

  //hide chat box
  $('.chat-history-exit').on('click',function(){
    $('.chat-history').removeAttr('style');
  });

});
