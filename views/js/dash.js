function handleError(err){
  swal({
  title: "Oops",
  text: err.message,
  icon: "error",
});
}

function handleSuccess(msg){
  swal({
    title: "Success",
    text: msg,
    icon: "success",
  });
}

//animate loading button
function loadingButton($button){
  var currentValue = $button.html();
  $button.html('<div class="spinner" style="height:30px;width:30px;margin-top:-5px;"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>');
  setTimeout(function(){
    $button.html(currentValue);
  },3000);
}

function getProfile(token){
  $.get("/api/profile/"+ token)
      .done(function(response) {
        console.log(response);
        if (response.status == "success"){
          if (typeof response.data["username"] != "undefined")
            $('#profile_username').html(response.data["username"]);
          if (typeof response.data["email"] == "undefined"){
            $('#profile_form input[name="email"]').addClass('bd-red');
            $('#email-tip').show();
          } else {
            $('#profile_form input[name="email"]').removeClass('bd-red');
            $('#email-tip').hide();
          }
          if (typeof response.data["profile_pic"] != "undefined"){
            $('#profile_img').attr('src',response.data["profile_pic"]);
            $('#dash_pic').attr('src',response.data["profile_pic"]);
          }
          for (var key in response.data){
            $("#profile_form input[name='"+ key +"']").val(response.data[key]);
          }
        } else {

        }
      });
}

function updateProfile(profile, token){
  $.ajax({
    method: "POST",
    url: "/api/profile",
    contentType: "application/json",
    data: JSON.stringify({ profile: profile, token: token })
  }).done(function(response){
    console.log(response);
    if (response.status == "success"){
      handleSuccess("Saved profile");
    } else {
      handleError(response.error);
    }
  });
}

function updateProfilePic(formData,token){
  formData.append('token',token);

  $.ajax({
    method: "POST",
    url: "/api/profile/image",
    processData: false,
    contentType: false,
    data: formData
  }).done(function(response){
    console.log(response);
    if (response.status == "success"){
      handleSuccess("Updated profile pic");
      $('#profile_img').attr('src',response.data["profile_pic"]);
    } else {
      handleError(response.error);
    }
  });
}

//Loads and manages views in dashboard
//allViews is a key-value pair dictionary
//the key is view name and the value is a callback function that initializes that view.
function ViewManager(allViews){

  var self = this;
  var views = allViews;
  var currView = Object.keys(allViews)[0];

  //loads a specific view
  this.load = function(view){
    var viewLoader = views[view];
    if (typeof viewLoader == "undefined"){
      console.log("ERROR: INVALID VIEW");
      return;
    }
    var loadResponse = viewLoader();

    if(currView == view)
      return;

    console.log(currView);
    console.log(view);
    $('#'+currView).removeClass('ds-active no-a-b');
    $('#'+currView).css('background-color','transparent');
    $('#'+currView+"_view").removeClass('active-view');
    $("#"+view).addClass('ds-active no-a-b');
    $("#"+view+"_view").addClass('active-view');

    currView = view;
  };

  this.load(currView);

  $('.ds-item').on('click',function(){
    self.load($(this).attr('id'));
  });

}

function showTip(parent){
  $(parent).find('.tip').show();
  setTimeout(function(){
    $(parent).find('.tip').hide();
  },3000);
}

var $grid;

$(document).on('ready',function(){
  //code to run at page load

  //handles button animations
  $('.a-b').on('mouseover',function(){
    if ($(this).hasClass('no-a-b'))
      return;
    var winWidth = $(document).width();
    if (winWidth < 700)
      return;
    var $btn = $(this);
    $btn.css('background-color','rgba(155,155,155,0.2)');
  });
  $('.a-b').on('mouseout',function(){
    if ($(this).hasClass('no-a-b'))
      return;
    var $btn = $(this);
    $btn.css('background-color','transparent');
  });

  //handles any dropdowns in dash
  $('.dd-toggle').on('click',function(){
    var $drop = $(this).find('.dropdown');
    if ($drop.css('display') == "none"){
      $('.dropdown').hide();
      $drop.show();
    } else {
      $('.dropdown').hide();
    }
  });


  $grid = $('.dash-grid').packery({
    itemSelector: '.grid-item',
    gutter: 15,
    columnWidth: $('.grid-item')[0],
    rowWidth: $('.grid-item')[0],
  });

  $grid.find('.grid-item').each( function( i, gridItem ) {
    var draggie = new Draggabilly( gridItem );
    // bind drag events to Packery
    $grid.packery( 'bindDraggabillyEvents', draggie );
  });

  //handles the sidebar shrinking
  function SideHandler(){

    var self = this;
    var state = true; //not shrinked

    this.getState = function(){
      return self.state;
    };

    this.toggle = function(){
      if ($(document).width() < 700){
        if (state == true){
          $('.dash-sidebar').css('left','0px');
          state = false;
        } else {
          $('.dash-sidebar').css('left','-180px');
          state = true;
        }
      } else {
        if (state == true){
          $('.dash-sidebar').css('width','56px');
          $('.dash-sidebar').css('left','0px');
          $('.ds-item span').hide();
          $('.dash-container').css('padding-left','80px');
          $('#sb_logo').hide();
          $grid.packery();
          state = false;
        } else {
          $('.dash-sidebar').css('width','180px');
          $('.dash-sidebar').css('left','0px');
          $('.ds-item span').show();
          $('.dash-container').css('padding-left','200px');
          $('#sb_logo').show();
          $grid.packery();
          state = true;
        }
      }
    };

    //set toggle on click
    $('.ds-toggle').on('click',function(){
      self.toggle();
    });

    //set toggle on click if mobile
    $('.ds-item').on('click',function(){
      if ($(document).width() < 700)
        self.toggle();
    });

    //makes sure menu always functions right when switching between mobile and desktop multiple times
    $(window).on("resize", function(){
      var winWidth = $(document).width();
      console.log(state);
      if (state == true && winWidth > 700 && $('.dash-sidebar').css('left') == '-180px'){
        $('.dash-sidebar').css('left','0px');
        self.toggle();
      }
    });

  }

  sideHandler = new SideHandler();

  $('#logout').on('click',function(){
    Cookies.remove('token');
    window.location.href = window.location.href;
  });

  $('#update_profile').on('click',function(){
    loadingButton($(this));
    var inputs = $('#profile_form input');
    var profile = {};
    var $inp = null;
    //build profile
    for (var i = 0; i < inputs.length; i++){
      $inp = $(inputs[i]);
      if ($.trim($inp.val()) != "")
        profile[$inp.attr('name')] = $inp.val();
    }
    updateProfile(profile,Cookies.get('token'));
  });

  $('#profile_pic').on('change',function(){
    // Get the files from input, create new FormData.
    var file = $('#profile_pic').get(0).files[0],
        formData = new FormData();

    formData.append('image', file, file.name);

    updateProfilePic(formData,Cookies.get('token'));
  });

});
