function RecoverHandler(){


  function recover(email){
    $.ajax({
      method: "POST",
      url: "/api/account/recover",
      contentType: "application/json",
      data: JSON.stringify({ email : email })
    }).done(function(response){
      console.log(response);
      if (response.status == "success"){
        handleSuccess("If this e-mail is in our database, you will receive instructions to recover your account.");
        $("#recover_form input[name='email']").val('');
      } else {
        handleError(response.error);
      }
    });
  }

  $('#recover_go').on('click',function(){
    if ($('#recover_form input')[0].validity.valid)
      recover($.trim($("#recover_form input[name='email']").val()));
    else
      handleError({message: "E-mail is required."});
  });

}

var recoverHandler = new RecoverHandler();
