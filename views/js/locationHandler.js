//this class controls user's location
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
        // console.log(e);
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
      // console.log("Updating the user's location");
      // console.log(response);
      if (response.status == "success"){
        // console.log("Updated location successfully");
      } else {
        // handleError(response.error);
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
