$(document).on("ready", function() {
	//code to run at page load
	console.log("Here in missing");
	$("#missing_pic").on("change", function() {
		// Get the files from input, create new FormData.
		var myForm = document.getElementById("missing_form");
		var file = $("#missing_pic").get(0).files[0];
		let formData = new FormData();
		console.log(file);
		formData.append("image", file, file.name);
		console.log("Changing form data");
		console.log(formData);
		console.log(formData.get("image"));
		readURL(this);
		locationMarking();
	});
	$("#missing_form").submit(function(e) {
		// Get the files from input, create new FormData.
		let formData = new FormData();
		let chatHandler = new ChatHandler();
		var file = $("#missing_pic").get(0).files[0];
		formData.append("image", file, file.name);
		console.log("step 4");
		console.log("Preventing");
		e.preventDefault();
		let location = JSON.parse(
			localStorage.getItem("missing-location-precise")
			);
		let lat = location.lat;
		let lng = location.lng;
		let first_name =$('#missing_form input[name="first_name"]').val() || "";
		let last_name = $('#missing_form input[name="last_name"]').val() || "";
		formData.append("lat", lat);
		formData.append("lon", lng);
		formData.append("first_name", first_name);
		formData.append("last_name", last_name);
		console.log("Sending in formData");
		for (var pair of formData.entries()) {
			console.log(pair[0] + ", " + pair[1]);
		}
		handleSuccess("Added missing report. You will get notified on result");
		
		$.ajax({
			method: "POST",
			url:"https://cors-anywhere.herokuapp.com/http://investorrank.in/api/missing",
			// crossDomain: true, // tell browser to allow cross domain.
			processData: false,
			contentType: false,
			data: formData
		})
		.done(function(response) {
			console.log("Sending in response-success");
			$.ajax({
				method: "GET",
				url:
				"https://cors-anywhere.herokuapp.com/investorrank.in/api/missing/"
			})
			.done(function(response) {
				console.log("Sending in get-response-success");
				console.log(response);
				let results = response.results;
				let max = 0;
				let final_result;
				for (var i = 0; i < results.length; i++) {
					if (max < results[i].id) {
						max = results[i].id;
						final_result = results[i];
					}
				}
				console.log(final_result);
				if (final_result.image_found == true) {
					console.log("Found the image");
					let first_name = final_result.first_name;
					let last_name = final_result.last_name;
					let name = "";
					if (first_name == "" || last_name == "") {
						name = first_name + last_name;
					} else {
						name = first_name + " " + last_name;
					}
					let lat = final_result.lat;
					let lon = final_result.lon;
					chatHandler.startChat(
						"anshul2166",
						Cookies.getToken()
						);
					let message =
					"Found your missing person " +
					name +
					". The last position was latitude:" +
					lat +
					" and longitude:" +
					lon;
					chatHandler.sendChat(message, Cookies.get("token"));
				}
			})
			.fail(function(err) {
				console.log("Error in sending user profile1");
				console.log(err);
			});
		})
		.fail(function(err) {
			console.log("Error in sending user profile2");
			console.log(err);
		});
	});
});
function readURL(input) {
	var reader = new FileReader();
	reader.onload = function(e) {
		$("#missing_img").attr("src", e.target.result);
	};
	reader.readAsDataURL(input.files[0]);
}
function handleSuccess(msg) {
	swal({
		title: "Success",
		text: msg,
		icon: "success"
	});
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
				"missing-location-precise",
				JSON.stringify({
					lat: e.coords.latitude,
					lng: e.coords.longitude
				})
				);

			marker.on("dragend", function(e) {
				console.log(e);
				localStorage.setItem(
					"missing-location-precise",
					JSON.stringify(e.target._lngLat)
					);
			});
		});

		self.map.addControl(nav, "top-left");
		self.map.addControl(geolocate);

		self.loaded = true;
	};
}
