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

//add some structure to socket connections and keep it in a local scope
function SocketHandler(chatHandler, noti){

  var self = this;
  var socket = null;

  this.connect = function(){
    socket = io({ query: "token="+Cookies.get('token') });

    //set events
    socket.on('chat',function(msg){
      console.log(msg);
      var msg = JSON.parse(msg);
      chatHandler.getHistory(Cookies.get('token'));
      noti.notify({ name : "New message", msg : msg.sender + " sent you a message.", view: "get_help" });
      if (chatHandler.state.current_target == msg.sender)
        chatHandler.insertChat(msg,'rec');
    });

    socket.on('invalid_token',function(msg){
      handleError({message: "Invalid token. Socket could not connect. Please refresh page, and re-login if problem persists."});
    });

  };

  this.send = function(event,payload){
    socket.emit(event,payload);
  }

  //initialize locally, for now
  self.connect();

}

function LocationHandler(){

  var self = this;

  this.loaded = false;
  this.map = null;

  this.getLocation = function(){
    return JSON.parse(localStorage.getItem('location-precise'));
  };

  this.hasLocation = function(){
    return (localStorage.getItem('location-precise') != null);
  };

  this.recentPrompt = function(){
    return (localStorage.getItem('location-prompt') > (new Date().getTime() - 10800000 ));
  };

  this.precisePrompt = function(){
    swal({
      title: "Your Location Is Critical",
      text: "Your recent location helps Emergency responders find you more efficiently. If asked for Location permission, click 'Allow'.",
      icon: "info"
    }).then(function(){
      self.load();
      $('#location_prompt').show();
      localStorage.setItem('location-prompt',new Date().getTime());
    });
  };

  this.load = function(){

    mapboxgl.accessToken = 'pk.eyJ1Ijoicm9naTU1NSIsImEiOiJjajh1MjJnYTYwdXU4MzNtYnZ5NHl1dGhpIn0.CBUJUe_M8sLWykZgHIpfIw';
    self.map = new mapboxgl.Map({
      container: 'prompt_map',
      style: 'mapbox://styles/mapbox/streets-v10',
      center: [-74.50, 40], // starting position [lng, lat]
      zoom: 13 // starting zoom
    });

    var nav = new mapboxgl.NavigationControl({ showCompass : false });
    var geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: false,
        showUserLocation: false
    });

    var markerCreated = false;

    geolocate.on('geolocate', function(e) {

      if (markerCreated)
        return false;

      var marker = new mapboxgl.Marker({ color: "#c74b3b" })
        .setDraggable(true)
        .setLngLat({ lat: e.coords.latitude , lng: e.coords.longitude })
        .addTo(self.map);

      markerCreated = true;

      localStorage.setItem('location-precise',JSON.stringify({ lat: e.coords.latitude , lng: e.coords.longitude }));

      marker.on('dragend',function(e){
        console.log(e);
        localStorage.setItem('location-precise',JSON.stringify(e.target._lngLat));
      });

    });

    self.map.addControl(nav, 'top-left');
    self.map.addControl(geolocate);

    self.loaded = true;

  };

  this.updateLocation = function(latLng, token){

    $.ajax({
      method: "POST",
      url: "/api/profile/location",
      contentType: "application/json",
      data: JSON.stringify({ location : latLng, token: token })
    }).done(function(response){
      console.log(response);
      if (response.status == "success"){
        //success
      } else {
        handleError(response.error);
      }
    });

  };

  if ( !self.hasLocation() && !self.recentPrompt() )
    self.precisePrompt();

  //set clicks here

  $('#prompt_done').on('click',function(){
    //get mapbox value from self.map
    $('#location_prompt').hide();

    if (localStorage.getItem('location-precise') != null)
      self.updateLocation(JSON.parse(localStorage.getItem('location-precise')), Cookies.get('token'));

  });

}

$(document).on('ready',function(){

  var mapHandler = new MapHandler();
  var chatHandler = new ChatHandler();
  var locationHandler = new LocationHandler();

  //load views into viewManager programmatically
  var viewManager = new ViewManager({
    "profile" : function(){
      console.log("Loaded profile view");
      var profile = getProfile(Cookies.get('token'));
    },
    "get_help" : function(){
      console.log("Loaded get help view");
      chatHandler.getHistory(Cookies.get('token'));
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
