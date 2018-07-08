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

//EXAMPLE API ENDPOINTS, NODE JS
  
    /* Endpoint to greet and add a new visitor to database.
    * Send a POST request to localhost:3000/api/visitors with body
    * {
    * 	"name": "Bob"
    * }
    */
    app.post("/api/visitors", function (request, response) {
      var userName = request.body.name;
      var doc = { "name" : userName };
      if(!mydb) {
        console.log("No database.");
        response.send(doc);
        return;
      }
      // insert the username as a document
      mydb.insert(doc, function(err, body, header) {
        if (err) {
          console.log('[mydb.insert] ', err.message);
          response.send("Error");
          return;
        }
        doc._id = body.id;
        response.send(doc);
      });
    });

    /**
     * Endpoint to get a JSON array of all the visitors in the database
     * REST API example:
     * <code>
     * GET http://localhost:3000/api/visitors
     * </code>
     *
     * Response:
     * [ "Bob", "Jane" ]
     * @return An array of all the visitor names
     */
    app.get("/api/visitors", function (request, response) {
      var names = [];
      if(!mydb) {
        response.json(names);
        return;
      }

      mydb.list({ include_docs: true }, function(err, body) {
        if (!err) {
          body.rows.forEach(function(row) {
            if(row.doc.name)
              names.push(row.doc.name);
          });
          response.json(names);
        }
      });
    });
