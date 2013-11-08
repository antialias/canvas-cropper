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
		var submitCount = 0;
		this.model = new Tagger({
			mode: "chooser",
			categoryTypeFilter: ko.observable("topic"),
			meta: ko.observable(),
			itemId: ko.observable(),
			itemTitleNew: ko.observable(),
			userMessage: ko.observable(),
			userMessageSubtext: ko.observable(),
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
					metaEditor.$newPage.hide();
					metaEditor.$mainPage.show();
					$('html, body').animate({scrollTop: metaEditor.mainScrolltopBeforeOpen},0);
				},
				submitCategories: function (model, event) {
					var ourSubmit = submitCount;
					if ("pending" === itemIdHasBeenSet.state()) {
						metaEditor.model.handlers.close();
					}
					itemIdHasBeenSet.done(function () {
						var didDefer = ourSubmit !== submitCount;
						core.ajax({
							path: "/content/" + metaEditor.model.itemId() + "/meta/update", // contentUpdateMetaRequest
							type: "POST",
							requestObject: metaPrime(),
							dataType: "text-eaten-json",
							success: function(actionResponse) {
								if (!didDefer) {
									metaEditor.model.handlers.close();
								}
							},
							contentType: "application/xml",
							statusCode: { 401: "login" }
						});
					});
					++submitCount;
				}
			}
		});
		var metaPrime = ko.computed(function () { // src/java/com/ktp/caffeine/api/model/ContentUpdateMetaRequest.java
			var meta = $.extend({}, metaEditor.model.meta());
			if (metaEditor.model.itemTitleNew()) {
				meta.title = metaEditor.model.itemTitleNew();
			}
			meta.tags = metaEditor.model.model.tags();
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
				return this.key === "providerThumb";
			}).pop();
		});
		var itemIdHasBeenSet = new $.Deferred();
		metaEditor.model.itemId.subscribe(function (newItemId) {
			core.ajax({
				path: "/content/" + newItemId + "/meta",
				dataType: 'text-eaten-json'
			}).done(function (meta) {
				metaEditor.model.meta(meta.item);
				if ("pending" === itemIdHasBeenSet.state()) {
					itemIdHasBeenSet.resolve();
				}
				metaEditor.model.preload.selectedCategoryIds = $.map(
					lpUtils.asArray(meta.item.categories.category),
					function (n) { return window.parseInt(n, 10); }
				);
				metaEditor.model.model.tags(lpUtils.asArray(meta.item.tags.tag));
				metaEditor.model.preload.defer.resolve();
			}).fail(function() {
				console.error(arguments);
			});
		});
		this.$newPage = $('<div>').addClass('page');
		this.$mainPage = $('body .page');
		this.prepareToShow = dMemo(function (D) {
			gotMarkup().done(function (markup) {
				if (!metaEditor.$categoryChooser) {
					metaEditor.$categoryChooser = $("<div style='display:none;' data-bind='visible:true'>").html(markup);
					metaEditor.$newPage.hide().insertBefore(metaEditor.$mainPage).append(metaEditor.$categoryChooser);
					metaEditor.model.applyTemplate(metaEditor.$categoryChooser.get(0));
					D.resolve();
				}
			}).fail(function () {D.reject();});
		});
	};
	ContentMetaEditor.prototype.show = function(_args) {
		var args = $.extend({
			userMessage: undefined,
			userMessageSubtext: undefined
		}, _args);
		var metaEditor = this;
		metaEditor.prepareToShow().done(function () {
			metaEditor.model.userMessage(args.userMessage);
			metaEditor.model.userMessageSubtext(args.userMessageSubtext);
			metaEditor.mainScrolltopBeforeOpen = $(window).scrollTop();
			$('html, body').animate({scrollTop: 0},0);
			metaEditor.$mainPage.hide();
			metaEditor.$newPage.show();
		});
	};
	var metaEditorCache = {};
	ContentMetaEditor.getForItemId = function (itemId) {
		if (!metaEditorCache.hasOwnProperty(itemId)) {
			metaEditorCache[itemId] = new ContentMetaEditor({});
			metaEditorCache[itemId].model.itemId(itemId);
		}
		return metaEditorCache[itemId];
	};
	return ContentMetaEditor;
});