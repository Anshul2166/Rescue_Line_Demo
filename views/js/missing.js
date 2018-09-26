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
		// $("#missing_img").attr("src", );
		// updateMissingPic(formData, Cookies.get("token"));
	});
	$("#missing_form").submit(function(e) {
		// Get the files from input, create new FormData.
		console.log("Preventing");
		e.preventDefault();
		console.log("Sending in formData");
		for(var pair of formData.entries()) {
     		console.log(pair[0]+ ', '+ pair[1]); 
		}
		// console.log(formData);
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
function readURL(input) {
		var reader = new FileReader();
		reader.onload = function(e) {
			$("#missing_img").attr("src", e.target.result);
		};
		reader.readAsDataURL(input.files[0]);
}
