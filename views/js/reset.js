function ResetHandler(){


  function reset(password,token){
    $.ajax({
      method: "POST",
      url: "/api/account/reset",
      contentType: "application/json",
      data: JSON.stringify({ password : password, token : token })
    }).done(function(response){
      // console.log(response);
      if (response.status == "success"){
        handleSuccess("You successfully reset your password. Redirecting you to login now.");
        setTimeout(function(){
          window.location.href = "/dashboard";
        },2000);
      } else {
        handleError(response.error);
      }
    });
  }

  var handleReset = function(){
    loadingButton($('#reset_go'));
    if ($('#reset_form input')[0].validity.valid)
      reset($.trim($("#reset_form input[name='password']").val()),token);
    else
      handleError({message: "Password is required."});
  };

  $('#reset_go').on('click',function(){
    handleReset();
  });

  $('#reset_form').on('submit',function(e){
    e.preventDefault();
    handleReset();
  });

}

var resetHandler = new ResetHandler();
