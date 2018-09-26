$(document).on("ready", function() {
	//code to run at page load
	console.log("Here in missing");
	var formData;
	var dataImage = localStorage.getItem("imgData");
	if (dataImage != null) {
		bannerImg = document.getElementById("missing_img");
		bannerImg.src = "data:image/png;base64," + dataImage;
	}
	$("#missing_pic").on("change", function() {
		// Get the files from input, create new FormData.
		var file = $("#missing_pic").get(0).files[0],
			formData = new FormData();
		formData.append("image", file, file.name);
		updateMissingPic(formData, Cookies.get("token"));
	});
	$('#missing_form').submit(function (e) {
		// Get the files from input, create new FormData.
		console.log("Preventing");
		e.preventDefault();
		console.log("Sending in formData");
		console.log(formData);
		// $.ajax({
		// 	method: "POST",
		// 	url: "http://investorrank.in/api/missing/",
		// 	processData: false,
		// 	contentType: false,
		// 	data: formData
		// }).done(function(response) {
		// 	console.log(response);
		// 	if (response.status == "success") {
		// 		handleSuccess("Updated missing pic");
		// 		$("#missing_img").attr("src", response.data["missing_img"]);
		// 	} else {
		// 		handleError(response.error);
		// 	}
		// });
	});
});

function updateMissingPic(formData, token) {
	formData.append("token", token);
	bannerImage = document.getElementById("missing_img");
	imgData = getBase64Image(bannerImage);
	localStorage.setItem("imgData", imgData);
	// $.ajax({
	//   method: "POST",
	//   url: "/api/missing/image",
	//   processData: false,
	//   contentType: false,
	//   data: formData
	// }).done(function(response){
	//   console.log(response);
	//   if (response.status == "success"){
	//     handleSuccess("Updated missing pic");
	//     $('#missing_img').attr('src',response.data["missing_img"]);
	//   } else {
	//     handleError(response.error);
	//   }
	// });
}

function getBase64Image(img) {
	var canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;

	var ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0);

	var dataURL = canvas.toDataURL("image/png");

	return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}
