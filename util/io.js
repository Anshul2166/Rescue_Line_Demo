const jwt = require('jsonwebtoken');

//this class handles the socket connection
module.exports = class IO {

  //sets up socket connection
  constructor(http){

    var self = this;

    this.io = require('socket.io')(http);
    this.connections = {};

    this.io.on('connection', function(socket){

      if (typeof socket.handshake.query.token == "undefined"){
        socket.emit('invalid_token');
        socket.disconnect();
        return false;
      }

      var token = socket.handshake.query.token;
      var tokenInfo = null;

      //verify socket connection with token
      jwt.verify(token, "MkREMTk1RTExN0ZFNUE5MkYxNDE2NDYwNzFFNTI2N0JCQQ==", function(err, decoded) {
        if (!err){
          tokenInfo = decoded;
        } else {
          //token isn't valid
          //err.name == 'TokenExpiredError'
          socket.emit('invalid_token');
          socket.disconnect();
          return false;
        }
      });

      if (tokenInfo == null)
        return false;

      if (tokenInfo.type == "coordinator" && typeof tokenInfo.country != "undefined")
        socket.join(tokenInfo.country);

      //store socket.id by username, for easy lookup
      self.connections[tokenInfo.user] = socket.id;

      console.log('a user connected');
      socket.on('disconnect', function(){
        console.log('user disconnected');
        delete self.connections[tokenInfo.user];
      });

    });

  }

}
