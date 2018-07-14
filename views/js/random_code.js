// EXAMPLES SHOWING GET / POST REQUESTS

//Submit data when enter key is pressed
  $('#user_name').keydown(function(e) {
    var name = $('#user_name').val();
      if (e.which == 13 && name.length > 0) { //catch Enter key
        //POST request to API to create a new visitor entry in the database
          $.ajax({
            method: "POST",
            url: "./api/visitors",
            contentType: "application/json",
            data: JSON.stringify({name: name })
          })
          .done(function(data) {
              if(data && data.name){
                  if(data._id)
                      $('#response').html("Added "+AntiXSS.sanitizeInput(data.name));
                  else
                      $('#response').html("Hello "+AntiXSS.sanitizeInput(data.name));
              }
              else {
                  $('#response').html(AntiXSS.sanitizeInput(data));
              }
              $('#nameInput').hide();
              getNames();
          });
      }
  });

  //Retrieve all the visitors from the database
  function getNames(){
    $.get("./api/visitors")
        .done(function(data) {
            if(data.length > 0) {
              data.forEach(function(element, index) {
                data[index] = AntiXSS.sanitizeInput(element)
              });
              $('#databaseNames').html("Database Contents: "+ JSON.stringify(data));
            }
        });
    }

    //connect to socket client side, need to include socketio from cdn in <script> tag
    $(function () {
      var socket = io();
      socket.emit('chat message', "Hello");
      socket.on('chat message',function(msg){
        console.log(msg);
      });
    });
