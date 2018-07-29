
//add some structure to socket connections and keep it in a local scope
function SocketHandler(chatHandler, noti, customEvents){

  var self = this;
  var socket = null;

  this.connect = function(){
    //iOS/Android will connect: socket = io("https://rl-node-shy-okapi.mybluemix.net/",{ query: "token="+ accessToken });
    socket = io({ query: "token="+Cookies.get('token') });

    //set events
    socket.on('chat',function(msg){
      console.log(msg);
      var msg = JSON.parse(msg);
      chatHandler.getHistory(Cookies.get('token'));
      noti.notify({ name : "New message", msg : msg.sender + " sent you a message.", view: "get_help" });
      if (chatHandler.state.current_target == msg.sender)
        chatHandler.insertChat(msg,'rec');
    });

    socket.on('invalid_token',function(msg){
      handleError({message: "Invalid token. Socket could not connect. Please refresh page, and re-login if problem persists."});
    });

    //set custom events
    if (typeof customEvents != "undefined")
      customEvents(socket);

  };

  this.send = function(event,payload){
    socket.emit(event,payload);
  }

  //initialize locally, for now
  self.connect();

}
