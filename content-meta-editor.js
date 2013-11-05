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
			// itemId: undefined
		}, _args);
		var metaEditor = this;
		this.model = new Tagger({
			mode: "chooser",
			categoryTypeFilter: ko.observable("topic"),
			meta: ko.observable(),
			itemId: ko.observable(),
			itemTitleNew: ko.observable(),
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
					core.ajax({
						path: "/content/" + metaEditor.model.itemId() + "/meta/update", // contentUpdateMetaRequest
						type: "POST",
						requestObject: metaPrime(),
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
		var metaPrime = ko.computed(function () { // src/java/com/ktp/caffeine/api/model/ContentUpdateMetaRequest.java
			var meta = $.extend({}, metaEditor.model.meta());
			if (metaEditor.model.itemTitleNew()) {
				meta.title = metaEditor.model.itemTitleNew();
			}
			// meta.tags = metaEditor.model.model.tags; // TODO: get tags from the model
			meta.categories = $.map(
				metaEditor.model.model.categories(),
				function (category) {return category.id;}
			);
			return meta;
		});
		metaEditor.model.providerThumb = ko.computed(function () {
			if (!metaEditor.model.meta()) {
				return;
			}
			return $.grep(lpUtils.asArray(metaEditor.model.meta().properties.property), function () {
				debugger;
				return this.key === "providerThumb";
			}).pop();
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
				metaEditor.model.preload.defer.resolve();
				metaEditor.model.meta(meta.item);
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