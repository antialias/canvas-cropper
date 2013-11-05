define(['knockout', '/js/lp/models/tagger.js', '/js/lp/lib/core.js', '/js/lp/lib/dMemo.js', '/js/lp/lib/utils.js'], function (ko, Tagger, Core, dMemo, lpUtils) {
	var core = new Core();
	var gotMarkup = dMemo(function (D) {
		$.ajax({
			waitIndicator: true,
			url: "/categories",
			dataType: 'html' // TRH: is this necessary?
		}).done(function (markup) {
			D.resolve(markup);
		}).fail(function () {
			console.error("Error getting markup for category chooser", arguments);
			D.reject();
		});
	});
	var CategoryChooserWidget = function (_args) {
		console.log("making a new CategoryChooserWidget");
		var args = $.extend({
			// preload: false,
			// showOnCreate: false,
			itemId: undefined
		}, _args);
		var categoryChooserWidget = this;
		this.model = new Tagger({
			mode: "chooser",
			categoryTypeFilter: ko.observable("topic"),
			itemId: ko.observable(),
			preload: {
				defer: new $.Deferred()
			},
			model: {
				title: ko.observable($("#pod-title").val()),
				searchable: ko.observable(!$("#unlisted").prop('checked')),
				description: ko.observable($("#pod-description").val()),
				podType: ko.observable("standard"),
				sourceType: ko.observable(3),
				questions: ko.observableArray(),
				inited: ko.observable(true)
			},
			initialized:ko.observable(false),
			disableErrors:ko.observable(true),
			saveIssues: ko.observableArray(),
			unlisted:ko.observable($("#unlisted").prop('checked')),
			handlers: {
				close: function (a,b) {
					categoryChooserWidget.$categoryChooser.dialog("close");
				},
				submitCategories: function (model, event) {
					// TODO figure out if the data model is in a or b
					var itemType=$("#assesmentItemType").val();
					var contentUpdateMetaRequest = { // src/java/com/ktp/caffeine/api/model/ContentUpdateMetaRequest.java
						title: (itemType == "image") ? $("#uploadItemTitle").val() : $("#itemTitle").val(),
						description: undefined, // description from tagger model
						searchable: (itemType=="assessmentItem" || itemType=="question") ? !$("#unlisted").prop('checked') : undefined,
						itemType: itemType,
						tags: categoryChooserWidget.model.model.tags(),
						categories: $.map(categoryChooserWidget.model.model.categories(), function (category) {return category.id;})
					};
					core.ajax({
						path: "/content/" + $("#assesmentItemId").val() + "/meta/update", // contentUpdateMetaRequest
						type: "POST",
						requestObject: contentUpdateMetaRequest,
						dataType: "text-eaten-json",
						success: function(actionResponse) {
							if (itemType == "image") { // TODO: test image mode and then remove this
								$("#popup").removeClass("upload-categories");
							}
							categoryChooserWidget.$categoryChooser.dialog("close");
						},
						contentType: "application/xml",
						statusCode: { 401: "login" }
					});
				}
			}
		});
		categoryChooserWidget.model.itemId.subscribe(function (newItemId) {
			console.log("doing preload");
			core.ajax({
				path: "/content/" + newItemId + "/meta",
				dataType: 'text-eaten-json'
			}).done(function (meta) {
				categoryChooserWidget.model.preload.selectedCategoryIds = $.map(lpUtils.asArray(meta.item.categories.category), function (n) {return parseInt(n);});
				// TODO: update categoryChooserWidget.model.tags
				if (categoryChooserWidget.model.tags) {
					debugger;
				}
				categoryChooserWidget.model.preload.defer.resolve();
			}).fail(function() {
				console.error(arguments);
				debugger;
			});
		});
		this.prepareToShow = dMemo(function (D) {
			gotMarkup().done(function (markup) {
				if (!categoryChooserWidget.$categoryChooser) {
					categoryChooserWidget.$categoryChooser = $("<div>").html(markup);
					$(document.body).append(categoryChooserWidget.$categoryChooser);
					categoryChooserWidget.model.applyTemplate(categoryChooserWidget.$categoryChooser.get(0));
					categoryChooserWidget.$categoryChooser.dialog({
						autoOpen: false,
						width: 800
					});
					D.resolve();
				}
			}).fail(function () {D.reject();});
		});
	};
	CategoryChooserWidget.prototype.show = function() {
		var categoryChooserWidget = this;
		categoryChooserWidget.prepareToShow().done(function () {
			// TODO: hide / unhide the widget instead of changing the body class
			categoryChooserWidget.$categoryChooser.dialog("open");
		});
	};
	return CategoryChooserWidget;
});