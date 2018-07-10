//handles the chat. I don't have any params for 'options' yet but I will update this comment if I need that variable
function ChatHandler(options){

  var self = this;

  this.chatState = {
    "current_target" : "rescueline-bot" //will be user ID of chat that is open. defaults to 'rescueline-bot'
  };

  //inserts chat
  //type can be 'rec' (received) or 'sent'
  //msgInfo example {msg: "Hello this is the message.", time: '13 mins'}
  this.insertChat = function(msgInfo,type){
    var msgEl = document.createElement('div');
    var $chatLog = $('.chat-log');
    if (type == "rec"){
      $(msgEl).html('<div class="chat-row"><div class="received paper">'+ msgInfo.msg +'<div class="ts abs bottom-right">'+ msgInfo.time +'</div></div></div>');
      $('.chat-log').append(msgEl);
    } else {
      $(msgEl).html('<div class="chat-row o-h"><div class="sent">'+ msgInfo.msg +'<div class="ts abs bottom-right">'+ msgInfo.time +'</div></div></div>');
      $('.chat-log').append(msgEl);
    }
    //animate chat message insert scroll
    setTimeout(function(){
      $chatLog.animate({
        scrollTop: $chatLog[0].scrollHeight
      }, 1000);
    },800);

    return msgEl;
  }

  function sendAssistantChat(message,token){
    var msgEl = self.insertChat({msg: message, time:'now'}, 'sent'); //insert, but if it is an error, we will remove DOM element.
    $.ajax({
      method: "POST",
      url: "/api/ai/chat",
      contentType: "application/json",
      data: JSON.stringify({ input:message, token: token })
    }).done(function(response){
      console.log(response);
      if (response.status == "success"){
        $('.chat-input').val('');
        self.insertChat({msg: response.data.msg, time: new Date().toLocaleString()}, 'rec');
      } else {
        // TODO: send error properly from server-side
        handleError(response.error);
        $(msgEl).remove();
      }
    });
  }

  function sendChat(msg,target,token){
    console.log("in send chat");
  }

  var handleChat = function ($chatInput){
    var chat = $chatInput.val();
    if ($.trim(chat).length > 0){
      if (self.chatState.current_target == "rescueline-bot"){
        sendAssistantChat(chat, Cookies.get('token'));
      } else {
        sendChat(chat,target,Cookies.get('token'));
      }
    }
  };

  $(".chat-input").on("keydown", function(e) {
      if(e.which == 13){
        handleChat($(this));
      }
  });

  $("#chat_send").on("click", function() {
    handleChat($('.chat-input'));
  });

}

$(document).on('ready',function(){
  var chatHandler = new ChatHandler();
});
