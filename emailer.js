define(['knockout', '/js/lp/lib/utils.js'], function (ko, lpUtils) {
	lpUtils.ajaxStatusCode401Login();
	return {
		composeMessage: function (_args) {
			var args = $.extend({
				fixedFields: [],
				submitTo: undefined,
				subject: "",
				from: "",
				message: "",
				attachedHTML: ""
			}, _args);
			var emailModel = {
				sendingStatus: ko.observable("send"),
				fixedFields: ko.observableArray(args.fixedFields),
				emailContent: {
					subject: ko.observable(args.subject),
					to: ko.observable(args.to),
					from: ko.observable(args.from),
					copyMe: ko.observable(false),
					message: ko.observable(args.message)
				},
				attachedHTML: ko.observable(args.attachedHTML)
			};
			emailModel.commaFormat = function(val){
				return lpUtils.commaFormat(val);
			};
			var loadedFormHTML = new $.Deferred();
			var $form = $("<div>").load(
				"/email/form",
				{
					dialogHeading: "Email this Question"
				},
				$.proxy(loadedFormHTML, 'resolve')
			);
			$.when(loadedFormHTML).then(function () {
				$form.appendTo(document.body);
				ko.applyBindings(emailModel, $form.get(0));
				$form.dialog({
					position: { my: "top", at: "top+10", of: $("#global-container") },
					hide: {effect: 'fade', duration: 200},
					modal: true,
					width: 600,
					autoOpen: true,
					close: function () {$form.detach();}
				});
				$submit = $form.find(".send-email-button");
				$form.find(".close-form").click(function(e){
					$form.dialog( "close" );
				});
				$submit.click(function (e) {
					e.preventDefault();
					// TODO: replace this validation code with a ko.validation binding in the markup
					var allOk=true,
						first=true,
						$required=$form.find("input.required, input.email, textarea");
					$form.find('.field-block').removeClass("active-error");
					$required.each(function(){
						var $this=$(this),
							$parent=$(this).parents('.field-block'),
							invalidContent=false,
							maxLength=$this.data("max-length"),
							message="blank";
						if($this.hasClass("required")&&(!$this.val()||$.trim($this.val()) === "")){
							invalidContent=true;
						}else if($this.hasClass("email") && !lpUtils.validateEmail($this.val())){
							invalidContent=true;
							message="invalid-email";
						}else if(maxLength && $.trim($this.val()).length>maxLength){
							invalidContent=true;
							message="size";
						}
						if(invalidContent){
							message=$parent.data(message);
							$parent.find(".tooltip-error span").html(message);
							$parent.addClass("active-error");
							if(first){
								$this.focus();
								first=false;
							}
							
							allOk=false;
						}
					});
					if(!allOk){
						return;
					}
					var postData = $.extend({
						"org.codehaus.groovy.grails.SYNCHRONIZER_TOKEN": $form.find("[name=org\\.codehaus\\.groovy\\.grails\\.SYNCHRONIZER_TOKEN]").val(),
						"org.codehaus.groovy.grails.SYNCHRONIZER_URI": $form.find("[name=org\\.codehaus\\.groovy\\.grails\\.SYNCHRONIZER_URI]").val()
					}, ko.toJS(emailModel.emailContent));
					emailModel.sendingStatus("sending...");
					$.ajax({
						type: 'POST',
						url: args.submitTo,
						data: postData,
						statusCode: {401: "login"},
						success: function () {
							emailModel.sendingStatus("sent");
							$("body,html").animate({scrollTop: $form.offset().top - $("#global-navigation").height()});
						}
					}).fail(function () {
						emailModel.sendingStatus("error");
					});
				});
			});
			return {
				loadedFormHTML: loadedFormHTML,
				model: emailModel
			};
		}
	};
});