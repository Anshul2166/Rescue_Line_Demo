$(document).on('ready',function(){

  //load views into viewManager programmatically
  var viewManager = new ViewManager({
    "get_help" : function(){
      console.log("Loaded get help view");
    },
    "report_hazard" : function(){
      console.log("Loaded report hazard view");
    },
    "map" : function(){
      console.log("map view");
    },
    "safe_place" : function(){
      console.log("safe_place view");
    }
  });

});
