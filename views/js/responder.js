//handles mapbox map for responder, will be different for everyone so not in its own file, for now
function MapHandler(element,$container){
  var self = this;
  this.loaded = false;
  this.map = null;

  this.load = function(){
    console.log("in load");
    $(element).css('width',$container.width()+'px');
    $(element).css('height',$container.height()+'px');
    setTimeout(function(){
      mapboxgl.accessToken = 'pk.eyJ1Ijoicm9naTU1NSIsImEiOiJjajh1MjJnYTYwdXU4MzNtYnZ5NHl1dGhpIn0.CBUJUe_M8sLWykZgHIpfIw';
      self.map = new mapboxgl.Map({
        container: element,
        style: 'mapbox://styles/mapbox/streets-v10',
        center: [-74.50, 40], // starting position [lng, lat]
        zoom: 9 // starting zoom
      });
      self.map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
              enableHighAccuracy: true
          },
          trackUserLocation: false
      }));

      self.map.addControl(new mapboxgl.FullscreenControl());
      $(window).on('resize',function(){
        setTimeout(function(){
          self.map.resize();
        },1000);
      });

    },200);
    self.loaded = true;
  };

}

$(document).on('ready',function(){

  var dashMapHandler = new MapHandler($('#mapbox')[0],$('.dash-container'));
  var chatHandler = new ChatHandler({ type : "notcitizen" });
  var locationHandler = new LocationHandler();
  var gridHandler = new GridHandler();

  var sideHandler = new SideHandler();
  sideHandler.setGridHandler(gridHandler);

  gridHandler.initialize();

  //load views into viewManager programmatically
  var viewManager = new ViewManager({
    "profile" : function(){
      console.log("Loaded profile view");
      var profile = getProfile(Cookies.get('token'));
    },
    "dashboard" : function(){
      console.log("Loaded dashboard view");
      if ($(document).width() > 700)
        sideHandler.toggle('shrink');

      gridHandler.$grid.one('layoutComplete', function(){
        console.log('layout event');
        if (gridHandler.mapHandler != null)
          gridHandler.mapHandler.map.resize();
      });

      setTimeout(function(){
        gridHandler.refresh();
      },100);
    },
    "get_help" : function(){
      //get_help is actually chat view
      console.log("chat view");
      chatHandler.getHistory(Cookies.get('token'));
    },
    "report_hazard" : function(){
      console.log("Loaded hazard view");
    },
    "map" : function(){
      console.log("map view");
      if (!dashMapHandler.loaded)
        dashMapHandler.load();
    }
  });

  showTip($('#dashboard_view')[0]);

  var noti = new Noti(viewManager);

  //pass noti into chatHandler
  chatHandler.setNoti(noti);
  //pass locationHandler into chatHandler
  chatHandler.setLocationHandler(locationHandler);

  //pass the chatHandler instance into socketHandler since they will have to be talking to each other
  var socketHandler = new SocketHandler(chatHandler, noti);

  //check if any unread messages and notify if yes
  chatHandler.getHistory(Cookies.get('token'),true);

});
