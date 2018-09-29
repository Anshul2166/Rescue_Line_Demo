function handleError(err) {
  swal({
    title: "Oops",
    text: err.message,
    icon: "error"
  });
}

function handleSuccess(msg) {
  swal({
    title: "Success",
    text: msg,
    icon: "success"
  });
}

//handles a specific button's hover effect
function hoverEffect(element) {
  $(element).on("mouseover", function() {
    if ($(this).hasClass("no-a-b")) return;
    var winWidth = $(document).width();
    if (winWidth < 700) return;
    var $btn = $(this);
    $btn.css("background-color", "rgba(155,155,155,0.2)");
  });
  $(element).on("mouseout", function() {
    if ($(this).hasClass("no-a-b")) return;
    var $btn = $(this);
    $btn.css("background-color", "transparent");
  });

  return element;
}

function Noti(viewManager) {
  var self = this;

  //play alert sound
  function playSound(filename) {
    $("#noti_sound").html(
      '<audio autoplay="autoplay"><source src="/assets/' +
        filename +
        '.mp3" type="audio/mpeg" /><source src="/assets/' +
        filename +
        '.ogg" type="audio/ogg" /><embed hidden="true" autostart="true" loop="false" src="/assets/' +
        filename +
        '.mp3" /></audio>'
    );
  }

  this.notify = function(info) {
    playSound("alert");
    var notiBlock = document.createElement("div");
    notiBlock.className = "noti-block tl paper rounded cl-med-gray cp";
    $(notiBlock).html(
      '<div class="roboto" style="margin-bottom:2px;">' +
        info.name +
        "</div><span>" +
        info.msg +
        "</span>"
    );
    $("#dh_noti .alert-dot").show();
    $("#dh_noti .dropdown").prepend(notiBlock);

    $(notiBlock).on("click", function() {
      viewManager.load(info.view);
      $(this).remove();
    });
  };
}

//animate loading button
function loadingButton($button) {
  var currentValue = $button.html();
  $button.html(
    '<div class="spinner" style="height:30px;width:30px;margin-top:-5px;"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
  );
  setTimeout(function() {
    $button.html(currentValue);
  }, 3000);
}

function getProfile(token) {
  $.get("/api/profile/" + token).done(function(response) {
    // console.log(response);
    if (response.status == "success") {
      if (typeof response.data["username"] != "undefined")
        $("#profile_username").html(response.data["username"]);
      if (typeof response.data["email"] == "undefined") {
        $('#profile_form input[name="email"]').addClass("bd-red");
        $("#email-tip").show();
      } else {
        $('#profile_form input[name="email"]').removeClass("bd-red");
        $("#email-tip").hide();
      }
      if (typeof response.data["profile_pic"] != "undefined") {
        $("#profile_img").attr("src", response.data["profile_pic"]);
        $("#dash_pic").attr("src", response.data["profile_pic"]);
      }
      for (var key in response.data) {
        $("#profile_form input[name='" + key + "']").val(response.data[key]);
      }
    } else {
    }
  });
}

function updateProfile(profile, token) {
  $.ajax({
    method: "POST",
    url: "/api/profile",
    contentType: "application/json",
    data: JSON.stringify({ profile: profile, token: token })
  }).done(function(response) {
    // console.log(response);
    if (response.status == "success") {
      handleSuccess("Saved profile");
    } else {
      handleError(response.error);
    }
  });
}

function updateProfilePic(formData, token) {
  formData.append("token", token);
  $.ajax({
    method: "POST",
    url: "/api/profile/image",
    processData: false,
    contentType: false,
    data: formData
  }).done(function(response) {
    // console.log(response);
    if (response.status == "success") {
      handleSuccess("Updated profile pic");
      // $("#profile_img").attr("src", response.data["profile_pic"]);
      formData.delete('token');
      // formData.append("lat","17.385");
      // formData.append("lon","78.48");
      let email=$('#profile_form input[name="email"]').val()||"";
      let phone_number=$('#profile_form input[name="phone"]').val()||"";
      let name=$('#profile_form input[name="name"]').val()||"";
      let split=name.split(" ");
      let first_name=split[0]||"";
      let last_name="";
      if(split.length-1>0)
        last_name=split[split.length-1];
      formData.append("first_name",first_name);
      formData.append("last_name",last_name);
      formData.append("phone_number",phone_number);
      // for (var pair of formData.entries()) {
      //   console.log(pair[0]+ ', ' + pair[1]); 
      // }
      $.ajax({
        method: "POST",
        // url: "https://cors-anywhere.herokuapp.com/investorrank.in/api/missing/",
        url:"https://cors-anywhere.herokuapp.com/investorrank.in/api/user_profile/",
        crossDomain: true, // tell browser to allow cross domain.
        processData: false,
        contentType: false, 
        data: formData
      }).done(function(response) {
        // console.log("Sending in response-success");
      }).fail(function(err){
        // console.log("Error in sending user profile");
        // console.log(err);
      });
    } else {
      handleError(response.error);
    }
  });
}

//Loads and manages views in dashboard
//allViews is a key-value pair dictionary
//the key is view name and the value is a callback function that initializes that view.
function ViewManager(allViews) {
  var self = this;
  var views = allViews;
  var currView = Object.keys(allViews)[0];

  //loads a specific view
  this.load = function(view) {
    var viewLoader = views[view];
    if (typeof viewLoader == "undefined") {
      // console.log("ERROR: INVALID VIEW");
      return;
    }
    var loadResponse = viewLoader();

    if (currView == view) return;

    // console.log(currView);
    // console.log(view);
    $("#" + currView).removeClass("ds-active no-a-b");
    $("#" + currView).css("background-color", "transparent");
    $("#" + currView + "_view").removeClass("active-view");
    $("#" + view).addClass("ds-active no-a-b");
    $("#" + view + "_view").addClass("active-view");

    currView = view;
  };

  this.load(currView);

  $(".ds-item").on("click", function() {
    self.load($(this).attr("id"));
  });
}

function showTip(parent) {
  $(parent)
    .find(".tip")
    .show();
  setTimeout(function() {
    $(parent)
      .find(".tip")
      .hide();
  }, 3000);
}

$(document).on("ready", function() {
  //code to run at page load

  //handles button animations
  $(".a-b").on("mouseover", function() {
    if ($(this).hasClass("no-a-b")) return;
    var winWidth = $(document).width();
    if (winWidth < 700) return;
    var $btn = $(this);
    $btn.css("background-color", "rgba(155,155,155,0.2)");
  });
  $(".a-b").on("mouseout", function() {
    if ($(this).hasClass("no-a-b")) return;
    var $btn = $(this);
    $btn.css("background-color", "transparent");
  });

  //handles any dropdowns in dash
  $(".dd-toggle").on("click", function() {
    var $drop = $(this).find(".dropdown");
    if ($drop.css("display") == "none") {
      $(".dropdown").hide();
      $drop.show();
    } else {
      $(".dropdown").hide();
    }
  });

  $("#logout").on("click", function() {
    Cookies.remove("token");
    window.location.href = window.location.href;
  });

  $("#update_profile").on("click", function() {
    loadingButton($(this));
    var inputs = $("#profile_form input");
    var profile = {};
    var $inp = null;
    //build profile
    for (var i = 0; i < inputs.length; i++) {
      $inp = $(inputs[i]);
      if ($.trim($inp.val()) != "") profile[$inp.attr("name")] = $inp.val();
    }
    updateProfile(profile, Cookies.get("token"));
  });

  $("#profile_pic").on("change", function() {
    // Get the files from input, create new FormData.
    var file = $("#profile_pic").get(0).files[0],
      formData = new FormData();

    formData.append("image", file, file.name);
    readURLProfile(this);
    updateProfilePic(formData, Cookies.get("token"));
  });

  $("#dh_noti").on("click", function() {
    $("#dh_noti .alert-dot").hide();
  });

  $(".share-modal .fa-times-circle").on("click", function() {
    $(".share-modal").hide();
  });
});
function readURLProfile(input) {
  var reader = new FileReader();
  reader.onload = function(e) {
    $("#profile_img").attr("src", e.target.result);
  };
  reader.readAsDataURL(input.files[0]);
}