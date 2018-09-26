$(document).on("ready", function() {
	//code to run at page load
	console.log("Here in missing");
	var formData;
	$("#missing_pic").on("change", function() {
		// Get the files from input, create new FormData.
		var myForm = document.getElementById("missing_form");
		var file = $("#missing_pic").get(0).files[0];
		formData = new FormData(myForm);
		console.log(file);
		formData.append("image", file, file.name);
		console.log("Changing form data");
		console.log(formData);
		console.log(formData.get("image"));
		readURL(this);
		locationMarking();
		// $("#missing_img").attr("src", );
		// updateMissingPic(formData, Cookies.get("token"));
	});
	$("#missing_form").submit(function(e) {
		// Get the files from input, create new FormData.
		console.log("step 4");
		console.log("Preventing");
		e.preventDefault();
		let location = JSON.parse(localStorage.getItem("missing-location-precise"));
		let lat = location.lat;
		let lng = location.lng;
		console.log(location);
		console.log(lat);
		formData.append("lat", lat);
		formData.append("lng", lng);
		console.log("Sending in formData");
		for (var pair of formData.entries()) {
			console.log(pair[0] + ", " + pair[1]);
		}
	});
});
function readURL(input) {
	var reader = new FileReader();
	reader.onload = function(e) {
		$("#missing_img").attr("src", e.target.result);
	};
	reader.readAsDataURL(input.files[0]);
}

function locationMarking() {
	var self = this;
	self.loaded = false;
	self.map = null;
	console.log("More inside");
	swal({
		title: "Your Location Is Critical",
		text: "Send us the location of last seen",
		icon: "info"
	}).then(function() {
		self.load();
		$("#location_prompt").show();
		// localStorage.setItem('location-prompt',new Date().getTime());
	});
	this.load = function() {
		mapboxgl.accessToken =
			"pk.eyJ1Ijoicm9naTU1NSIsImEiOiJjajh1MjJnYTYwdXU4MzNtYnZ5NHl1dGhpIn0.CBUJUe_M8sLWykZgHIpfIw";
		self.map = new mapboxgl.Map({
			container: "prompt_map",
			style: "mapbox://styles/mapbox/streets-v10",
			center: [-74.5, 40], // starting position [lng, lat]
			zoom: 13 // starting zoom
		});

		var nav = new mapboxgl.NavigationControl({ showCompass: false });
		var geolocate = new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			},
			trackUserLocation: false,
			showUserLocation: false
		});

		var markerCreated = false;

		geolocate.on("geolocate", function(e) {
			if (markerCreated) return false;

			var marker = new mapboxgl.Marker({ color: "#c74b3b" })
				.setDraggable(true)
				.setLngLat({ lat: e.coords.latitude, lng: e.coords.longitude })
				.addTo(self.map);

			markerCreated = true;

			localStorage.setItem(
				"location-precise",
				JSON.stringify({
					lat: e.coords.latitude,
					lng: e.coords.longitude
				})
			);

			marker.on("dragend", function(e) {
				console.log(e);
				localStorage.setItem(
					"location-precise",
					JSON.stringify(e.target._lngLat)
				);
			});
		});

		self.map.addControl(nav, "top-left");
		self.map.addControl(geolocate);

		self.loaded = true;
	};
}
