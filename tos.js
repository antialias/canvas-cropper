$("#show-terms").click(function(e){
	e.preventDefault();
	e.stopPropagation();
	if (0 === $("#tos-modal-screen").size()) {
		// TODO: pull in tos content if it is not present
		$("<div>").load("/login/htmlfragment/tos").appendTo(document.body);
	}
	$("body").addClass("tos-modal");
});
$(document.body).on('click', '.hide-tos', function(e) {
	e.preventDefault();
	$("body").removeClass("tos-modal");
});
$("#tos-checkbox").change(function () {
	var $this=$(this),
		$checkContainer=$this.parents(".field-block");
	if($this.is(":checked")){
		$checkContainer.addClass("counter-ok");
	}else{
		$checkContainer.removeClass("counter-ok");
	}
});
