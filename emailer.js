define(['knockout'], function (ko) {
	return {
		composeMessage: function (_args) {
			var args = $.extend({
				subject: "",
				from: "",
				message: "",
				messageFixedBelowHTML: ""
			}, _args);
			var emailModel = {
				subject: ko.observable(args.subject),
				from: ko.observable(args.from),
				copyMe: ko.observable(false),
				message: ko.observable(args.message),
				messageFixedBelowHTML: args.messageFixedBelowHTML
			};
			var loadedFormHTML = new $.Deferred();
			var $form = $("<div>").load(
				"/email/form",
				{
					dialogHeading: "this is your happy email form"
				},
				$.proxy(loadedFormHTML, 'resolve')
			);
			$.when(loadedFormHTML).then(function () {
				$form.appendTo(document.body);
				ko.applyBindings(emailModel, $form.get(0));
				$form.dialog({
					hide: {effect: 'fade', duration: 200},
					modal: true,
					height: 412,
					width: 360,
					autoOpen: true,
					close: $.proxy($form, 'detach')
				});
				$submit = $form.find(".send-email-button");
				$submit.click(function (e) {
					e.preventDefault();
					var postData = $.extend({
						"org.codehaus.groovy.grails.SYNCHRONIZER_TOKEN": $form.find("[name=org\\.codehaus\\.groovy\\.grails\\.SYNCHRONIZER_TOKEN]").val(),
						"org.codehaus.groovy.grails.SYNCHRONIZER_URI": $form.find("[name=org\\.codehaus\\.groovy\\.grails\\.SYNCHRONIZER_URI]").val()
					}, ko.toJS(emailModel));
					console.log("postData: ", postData);
					$.post("/email/send", postData).done(function () {
						console.log("finished sending email");
					});
				});
			});
		}
	}
});