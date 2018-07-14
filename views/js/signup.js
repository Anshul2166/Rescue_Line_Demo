
//Handles the signup form for specific type
function SignupHandler(type){

  var self = this;
  var checkNameTimeout = null;
  var userType = type;
  var state = {
    validUsername : false,
    validForm : false
  };
  //function to check if username exists in DB
  function checkName(username){

    if (username.length < 3){
      $('#username').addClass('bd-red');
      inputTip($('#username'),'Not enough characters','cl-red');
      state.validUsername = false;
      return;
    }

    $.get("/api/account/check-name/"+ username)
        .done(function(response) {
              console.log(response);
              if (response.status == "success"){
                console.log(response.data.is_available);
                if (response.data.is_available === true){
                  resetInputs($('#username')[0]);
                  state.validUsername = true;
                  inputTip($('#username'),'Available  <i class="fas fa-check"></i>','cl-green');
                } else {
                  state.validUsername = false;
                  inputTip($('#username'),'Sorry, that username is taken.','cl-red');
                }
              } else {
                console.log("Error");
                state.validUsername = false;
              }
        });

  }

  //send request to sign user up
  function signUp(name, username, password, code){
    if (typeof code == "undefined")
      code = "none";

    $.ajax({
      method: "POST",
      url: "/api/account/create",
      contentType: "application/json",
      data: JSON.stringify({ name: name, username: username, password: password, type : userType, code: code })
    }).done(function(response){
      console.log(response);
      if (response.status == "success"){
        Cookies.set('token', response.data.token, { expires: 7 });
        window.location.href = '/dashboard';
      } else {
        handleError(response.error);
      }
    });
  }

  //reset any errors on inputs
  function resetInputs(inp){
    var ri = function(input){
      if ($(input).next().hasClass('input-tip')){
        var $parent = $(input).parent().parent();
        $(input).next().remove();
        $parent.css('height',$parent.outerHeight() - 20 + 'px');
      }
      $(input).removeClass('bd-red');
    };
    if (typeof inp != "undefined"){
      ri(inp);
      return;
    }
    $('#signup_form input').each(function(index,input){
      ri(input);
    });
  }

  $('#signup_form input').on('input',function(){
    if ($(this)[0].validity.valid){
      resetInputs($(this)[0]);
    }
  });

  $('#username').on('input',function(){
    var nameStatus;
    $inp = $(this);
    clearTimeout(checkNameTimeout);
    checkNameTimeout = setTimeout(function(){
      var name = $inp.val().replace(/\s/g,'').toLowerCase();
      $inp.val(name);
      checkName(name);
    },800);
  });

  //handle signup button click
  $('#signup_go').on('click',function(){
    loadingButton($(this));
    resetInputs();
    state.validForm = true;
    $('#signup_form input').each(function(index,input){
      if (!input.validity.valid){
        $(input).addClass('bd-red');
        inputTip($(input),'Not enough characters','cl-red');
        state.validForm = false;
        return;
      }
    });

    //form is completely valid
    if (state.validForm && state.validUsername){
      if (userType == "citizen"){
        signUp($("#signup_form input[name='name']").val(),$("#signup_form input[name='username']").val(),$("#signup_form input[name='pass']").val());
      } else {
        signUp($("#signup_form input[name='name']").val(),$("#signup_form input[name='username']").val(),$("#signup_form input[name='pass']").val(),$("#signup_form input[name='code']").val());
      }
      loadingButton($(this));
    }
  });

}
