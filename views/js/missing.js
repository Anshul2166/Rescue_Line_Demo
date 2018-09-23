$(document).on('ready',function(){
  //code to run at page load
  $('#missing_pic').on('change',function(){
    // Get the files from input, create new FormData.
    var file = $('#missing_pic').get(0).files[0],
        formData = new FormData();
    formData.append('image', file, file.name);
    updateProfilePic(formData,Cookies.get('token'));
  });
});


function updateMissingPic(formData,token){
  formData.append('token',token);

  $.ajax({
    method: "POST",
    url: "/api/missing/image",
    processData: false,
    contentType: false,
    data: formData
  }).done(function(response){
    console.log(response);
    if (response.status == "success"){
      handleSuccess("Updated missing pic");
      $('#missing_img').attr('src',response.data["missing_img"]);
    } else {
      handleError(response.error);
    }
  });
}