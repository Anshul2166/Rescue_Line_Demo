
//handles mapbox map
function MapHandler(){
  var self = this;
  this.loaded = false;
  this.map = null;

  this.load = function(){
    console.log("in load");
    $('#mapbox').css('width',$('.dash-container').width()+'px');
    $('#mapbox').css('height',$('.dash-container').height()+'px');
    setTimeout(function(){
      mapboxgl.accessToken = 'pk.eyJ1Ijoicm9naTU1NSIsImEiOiJjajh1MjJnYTYwdXU4MzNtYnZ5NHl1dGhpIn0.CBUJUe_M8sLWykZgHIpfIw';
      self.map = new mapboxgl.Map({
        container: 'mapbox',
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

    },200);
    self.loaded = true;
  };

}

$(document).on('ready',function(){

  var mapHandler = new MapHandler();

  //load views into viewManager programmatically
  var viewManager = new ViewManager({
    "profile" : function(){
      console.log("Loaded profile view");
      var profile = getProfile(Cookies.get('token'));
    },
    "dashboard" : function(){
      console.log("Loaded dashboard view");
    },
    "report_hazard" : function(){
      console.log("Loaded hazard view");
    },
    "map" : function(){
      console.log("map view");
      if (!mapHandler.loaded)
        mapHandler.load();
    },
    "safe_place" : function(){
      console.log("safe_place view");
    }
  });

  showTip($('#dashboard_view')[0]);

});
