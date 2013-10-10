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
					hide: {effect: 'fade', duration: 200},
					modal: true,
					width: 600,
					autoOpen: true,
					close: function () {$form.detach();}
				});
				$submit = $form.find(".send-email-button");
				$submit.click(function (e) {
					e.preventDefault();
					var postData = $.extend({
						"org.codehaus.groovy.grails.SYNCHRONIZER_TOKEN": $form.find("[name=org\\.codehaus\\.groovy\\.grails\\.SYNCHRONIZER_TOKEN]").val(),
						"org.codehaus.groovy.grails.SYNCHRONIZER_URI": $form.find("[name=org\\.codehaus\\.groovy\\.grails\\.SYNCHRONIZER_URI]").val()
					}, ko.toJS(emailModel.emailContent));
					$.ajax({
						type: 'POST',
						url: args.submitTo,
						data: postData,
						statusCode: {401: "login"},
						success: function () {
							$form.dialog("close");
						}
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