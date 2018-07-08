function LoginHandler(){

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
    $('#login_form input').each(function(index,input){
      ri(input);
    });
  }

  function login(username,password){
    $.ajax({
      method: "POST",
      url: "/api/account/login",
      contentType: "application/json",
      data: JSON.stringify({ username: username, password: password })
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

  $('#login_form input').on('input',function(){
    if ($(this)[0].validity.valid){
      resetInputs($(this)[0]);
    }
  });

  $('#login_go').on('click',function(){
    loadingButton($(this));
    var validForm = true;
    $('#login_form input').each(function(index,input){
      if (!input.validity.valid){
        $(input).addClass('bd-red');
        inputTip($(input),'Required','cl-red');
        validForm = false;
        return;
      }
    });
    if (validForm)
      login($.trim($("#login_form input[name='username']").val()),$.trim($("#login_form input[name='pass']").val()));
  });

}

var loginHandler = new LoginHandler();
