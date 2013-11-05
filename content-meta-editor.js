define([
	'knockout',
	'/js/lp/models/tagger.js',
	'/js/lp/lib/core.js',
	'/js/lp/lib/dMemo.js',
	'/js/lp/lib/utils.js'
], function (
	ko,
	Tagger,
	Core,
	dMemo,
	lpUtils
) {
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
	var ContentMetaEditor = function (_args) {
		var args = $.extend({
			// preload: false,
			// showOnCreate: false,
			itemId: undefined
		}, _args);
		var metaEditor = this;
		this.model = new Tagger({
			mode: "chooser",
			categoryTypeFilter: ko.observable("topic"),
			itemId: ko.observable(),
			itemType: ko.observable(),
			itemTitle: ko.observable(),
			providerThumb: ko.observable(),
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
					metaEditor.$categoryChooser.dialog("close");
				},
				submitCategories: function (model, event) {
					// TODO figure out if the data model is in a or b
					var contentUpdateMetaRequest = { // src/java/com/ktp/caffeine/api/model/ContentUpdateMetaRequest.java
						title: (metaEditor.model.itemType() === "image") ? $("#uploadItemTitle").val() : $("#itemTitle").val(),
						description: undefined, // description from tagger model
						searchable: (-1 !== $.inArray(metaEditor.model.itemType(), ["assessmentItem", "question"])) ? !$("#unlisted").prop('checked') : undefined,
						itemType: metaEditor.model.itemType(),
						tags: metaEditor.model.model.tags(),
						categories: $.map(metaEditor.model.model.categories(), function (category) {return category.id;})
					};
					core.ajax({
						path: "/content/" + metaEditor.model.itemId() + "/meta/update", // contentUpdateMetaRequest
						type: "POST",
						requestObject: contentUpdateMetaRequest,
						dataType: "text-eaten-json",
						success: function(actionResponse) {
							metaEditor.$categoryChooser.dialog("close");
						},
						contentType: "application/xml",
						statusCode: { 401: "login" }
					});
				}
			}
		});
		metaEditor.model.itemId.subscribe(function (newItemId) {
			core.ajax({
				path: "/content/" + newItemId + "/meta",
				dataType: 'text-eaten-json'
			}).done(function (meta) {
				metaEditor.model.preload.selectedCategoryIds = $.map(lpUtils.asArray(meta.item.categories.category), function (n) {return parseInt(n);});
				// TODO: update metaEditor.model.tags
				if (metaEditor.model.tags) {
					debugger;
				}
				metaEditor.model.itemType(meta.item.itemType);
				metaEditor.model.itemTitle(meta.item.title);
				metaEditor.model.providerThumb($.grep(lpUtils.asArray(meta.item.properties.property), function () {
					return this.key === "providerThumb";
				}).pop());
				metaEditor.model.preload.defer.resolve();
			}).fail(function() {
				console.error(arguments);
			});
		});
		this.prepareToShow = dMemo(function (D) {
			gotMarkup().done(function (markup) {
				if (!metaEditor.$categoryChooser) {
					metaEditor.$categoryChooser = $("<div>").html(markup);
					$(document.body).append(metaEditor.$categoryChooser);
					metaEditor.model.applyTemplate(metaEditor.$categoryChooser.get(0));
					metaEditor.$categoryChooser.dialog({
						autoOpen: false,
						width: 800
					});
					D.resolve();
				}
			}).fail(function () {D.reject();});
		});
	};
	ContentMetaEditor.prototype.show = function() {
		var metaEditor = this;
		metaEditor.prepareToShow().done(function () {
			// TODO: hide / unhide the widget instead of changing the body class
			metaEditor.$categoryChooser.dialog("open");
		});
	};
	return ContentMetaEditor;
});