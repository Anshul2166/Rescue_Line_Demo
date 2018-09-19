//This js file manages the tips section of the webpage where the user is able to see the tips in fire, earthquake and all.

//When document is ready, initialise the tips manager which will take care of actions on navbar containing the various disasters:- fire, earthquake etc.
$(document).on('ready',function(){
  console.log("Here in helps.js");
  //load views into tipsManager programmatically
  var tipsManager = new TipsManager({
    "fire" : function(){
      console.log("Loaded fire");
    },
    "earthquake" : function(){
      console.log("Loaded earthquake");
    },
    "flood" : function(){
      console.log("Loading flood");
    },
    "sandstorm" : function(){
      console.log("sandstorm view");
    }
  });
});

//This provides the functionality for the tips manager
//Logic is same as for view manager for dashboard sidebar
function TipsManager(allViews){

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
    $('#mySidenav').css("width","0");
  };

  this.load(currView);

  $('.ds-item').on('click',function(){
    self.load($(this).attr('id'));
  });


}