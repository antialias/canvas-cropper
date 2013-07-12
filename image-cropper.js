define([
	'knockout',
	'/js/lp/lib/utils.js',
	'/js/pod.menubar.js',
	'/js/ko-bindings/ko.file.js'
], function (
	ko,
	lpUtils,
	menubar,
_) {
	$.widget( "ui.lpslider", $.ui.slider, {
		_refresh: function () {
			var sliderObj = this;
			sliderObj._superApply(arguments);
			sliderObj.sliderRight = $("<div>").addClass("ui-lpslider-right");
			sliderObj.sliderLeft = $("<div>").addClass("ui-lpslider-left");
			sliderObj.decrementButton = $("<div>").addClass("ui-lpslider-increment").data('scale', -1).text("-");
			sliderObj.incrementButton = $("<div>").addClass("ui-lpslider-decrement").data('scale', 1).text("+");
			sliderObj.incrementButton.add(sliderObj.decrementButton).addClass('unselectable').mousedown(function (event) {
				event.stopPropagation();
				sliderObj._slide(event, 0, sliderObj._trimAlignValue(sliderObj.value() + $(this).data('scale') * sliderObj.options.step));
			});
			sliderObj.element
				.append(sliderObj.sliderRight)
				.append(sliderObj.sliderLeft)
				.append(sliderObj.incrementButton)
				.append(sliderObj.decrementButton);
		},
		_refreshValue: function() {
			this._superApply(arguments);
			var percent = 100 * (this.option('value') - this.option('min')) / (this.option('max') - this.option('min'));
			if (!this.sliderRight || !this.sliderLeft) {
				return;
			}
			this.sliderRight.css('left', percent + '%');
			this.sliderLeft.css('right', (100  - percent) + '%');
		}
	});
	var ImageCropper = function (_options) {
		var options = $.extend({
			$dialog: undefined, // the element where our canvas, slider, and file chooser are
			chooseImageSelector: undefined, // selector for element inside $dialog that is the file chooser
			zoomerSelector: undefined, // selector for element that will be turned into our zoomer control
			editorCanvasSelector: undefined // the canvas where the zoomed and cropped image will be displayed
		}, _options);
		var $editorCanvas = options.$dialog.find(options.editorCanvasSelector);
		var canvasScale;
		var restrictToNativeResolution = true;
		var profileImageEditor = {
			preview: ko.observable(false),
			innerFrameWidth: ko.observable(20),			
			maxZoom: ko.observable(),
			profileImageElem: ko.observable(new Image()),
			profileImageURI: ko.observable(),
			profileImageFile: ko.observable(false),
			profileZoom: ko.observable(),
			profilePictureCenter: ko.observable({x:0,y:0})
		};
		profileImageEditor.minZoom = ko.computed(function () {
			return Math.log(($editorCanvas.width() - profileImageEditor.innerFrameWidth() * 2) / $editorCanvas.width());
		});
		profileImageEditor.minZoom.subscribe(function (newMinZoom) {
			options.$dialog.find(options.zoomerSelector).lpslider("option", "min", newMinZoom);
		});
		profileImageEditor.sliderStep = ko.computed(function () {
			return (profileImageEditor.maxZoom() - profileImageEditor.minZoom()) / 40;
		});
		profileImageEditor.sliderStep.subscribe(function (newSliderStep) {
			options.$dialog.find(options.zoomerSelector).lpslider("option", "step", newSliderStep);
		});
		profileImageEditor.maxZoom.subscribe(function (newMaxZoom) {
			options.$dialog.find(options.zoomerSelector).lpslider("option", "max", newMaxZoom); // set max zoom to image's native resolution
		});
		profileImageEditor.handlers = {};
		profileImageEditor.handlers.closeImageCropper = function () {
			options.$dialog.dialog("close");
		};
		profileImageEditor.handlers.chooseProfilePictureFile = function () {
			options.$dialog.find(options.chooseImageSelector).click();
		};
		profileImageEditor.handlers.saveProfilePicture = function () {
			// use another canvas to crop out the frame around the image
			var insideFrame = $("<canvas>").attr({
				width: profileImageEditor.__context__.canvas.width - 2*profileImageEditor.innerFrameWidth(),
				height: profileImageEditor.__context__.canvas.height - 2*profileImageEditor.innerFrameWidth()
			}).get(0);
			var insideFrameContext = insideFrame.getContext("2d");
			insideFrameContext.drawImage(
				profileImageEditor.__context__.canvas,
				-profileImageEditor.innerFrameWidth(),
				-profileImageEditor.innerFrameWidth(),
				profileImageEditor.__context__.canvas.width,
				profileImageEditor.__context__.canvas.height
			);
			var imageURL = insideFrame.toDataURL("image/jpeg", 0.8);
			// TODO: I think imageblob isnt' getting constructed properly
			var imageBlob = lpUtils.dataURItoBlob(imageURL);
			var fd = new FormData();
			fd.append('fname', 'profileImageUpload.jpg');
			fd.append('data', imageBlob);
			$.ajax({
				type: 'POST',
				url: "/avatar/large",
				data: fd,
				processData: false,
				contentType: false,
				success: function (result) {
					menubar.avatarHasChanged();
					options.$dialog.dialog("close");
				},
				error: function () {
					console.log("failure :(");
				}
			});
		};
		profileImageEditor.profileZoomExp = ko.computed(function () {
			return Math.exp(profileImageEditor.profileZoom());
		});
		profileImageEditor.profileZoom.subscribe(function (z) {
			setUserProfilePanningCoords(true); // make sure that we don't zoom out of our boundaries
			options.$dialog.find(options.zoomerSelector).lpslider("option", "value", z);
		});
		profileImageEditor.profileImageURI.subscribe(function (newProfileImageURI) {
			profileImageEditor.profileImageElem().src = newProfileImageURI;
			$(profileImageEditor.profileImageElem()).one('load', function () {
				if (this.width >= this.height) {
					canvasScale = profileImageEditor.__context__.canvas.width / this.width;
				} else {
					canvasScale = profileImageEditor.__context__.canvas.height / this.height;
				}
				if (restrictToNativeResolution) {
					profileImageEditor.maxZoom(Math.max(profileImageEditor.minZoom(), Math.log(1 / canvasScale)));
				}
				profileImageEditor.profileZoom(profileImageEditor.minZoom());
				profileImageEditor.profilePictureCenter({x:0,y:0});
			});
		});
		profileImageEditor.drawProfileImage = ko.computed(function () {
			// declare this computed's dependencies so ko will know to call this function when any of them change int he future
			var zoom = profileImageEditor.profileZoomExp();
			profileImageEditor.profileImageURI(); // make sure we redraw when it changes
			profileImageEditor.maxZoom();
			profileImageEditor.minZoom();
			profileImageEditor.profileZoom();
			var center = profileImageEditor.profilePictureCenter();
			if (!profileImageEditor.__context__) {
				return;
			}
			profileImageEditor.__context__.save();
			profileImageEditor.__context__.clearRect(0,0,profileImageEditor.__context__.canvas.width,profileImageEditor.__context__.canvas.height);
			profileImageEditor.__context__.translate(profileImageEditor.__context__.canvas.width / 2, profileImageEditor.__context__.canvas.height / 2);
			profileImageEditor.__context__.scale(canvasScale, canvasScale);
			profileImageEditor.__context__.scale(zoom, zoom);
			profileImageEditor.__context__.drawImage(profileImageEditor.profileImageElem(),
				center.x + profileImageEditor.profileImageElem().width / -2,
				center.y + profileImageEditor.profileImageElem().height / -2,
				profileImageEditor.profileImageElem().width,
				profileImageEditor.profileImageElem().height);
			profileImageEditor.__context__.beginPath();
			profileImageEditor.__context__.restore();
			var frameShowWidth = Math.min(profileImageEditor.innerFrameWidth(), profileImageEditor.innerFrameWidth() * (profileImageEditor.minZoom() - profileImageEditor.profileZoom()) / profileImageEditor.minZoom());
			var blurEncroachment = Math.max(profileImageEditor.innerFrameWidth() / 2, Math.max(0,profileImageEditor.innerFrameWidth() - frameShowWidth));
			profileImageEditor.__context__.save();
			profileImageEditor.__context__.lineWidth = 2 * frameShowWidth;
			if (profileImageEditor.preview()) {
				profileImageEditor.__context__.strokeStyle = "rgb(255,255,255)";
			} else {
				profileImageEditor.__context__.strokeStyle = "rgba(100,100,100,0.5)";
			}
			if (frameShowWidth > 0) {
				profileImageEditor.__context__.strokeRect(
					profileImageEditor.innerFrameWidth() - frameShowWidth,
					profileImageEditor.innerFrameWidth() - frameShowWidth,
					profileImageEditor.__context__.canvas.width - 2 * profileImageEditor.innerFrameWidth() + 2 * frameShowWidth,
					profileImageEditor.__context__.canvas.height - 2 * profileImageEditor.innerFrameWidth() + 2 * frameShowWidth
				);
				profileImageEditor.__context__.closePath();
			}
			profileImageEditor.__context__.restore();
			if (profileImageEditor.preview()) {
				return;
			}
			profileImageEditor.__context__.save();
			profileImageEditor.__context__.shadowColor = "rgb(255,255,255)";
			profileImageEditor.__context__.shadowOffsetX = blurEncroachment;
			profileImageEditor.__context__.shadowOffsetY = blurEncroachment;
			profileImageEditor.__context__.lineWidth = 0;
			profileImageEditor.__context__.fillStyle = "rgba(0,0,0,1)";
			profileImageEditor.__context__.shadowBlur = Math.min(profileImageEditor.innerFrameWidth() / 2, frameShowWidth);
			profileImageEditor.__context__.rect(
				-100,
				-blurEncroachment * 2,
				100,
				profileImageEditor.__context__.canvas.height + blurEncroachment * 4
			);
			profileImageEditor.__context__.rect(
				-blurEncroachment * 2,
				-100,
				profileImageEditor.__context__.canvas.width + blurEncroachment * 4,
				100
			);
			profileImageEditor.__context__.fill();
			profileImageEditor.__context__.shadowOffsetX = -blurEncroachment;
			profileImageEditor.__context__.shadowOffsetY = -blurEncroachment;
			profileImageEditor.__context__.rect(
				profileImageEditor.__context__.canvas.width,
				-blurEncroachment * 2,
				100,
				profileImageEditor.__context__.canvas.height + blurEncroachment * 4
			);
			profileImageEditor.__context__.rect(
				-blurEncroachment * 2,
				profileImageEditor.__context__.canvas.height,
				profileImageEditor.__context__.canvas.width + blurEncroachment * 4,
				100
			);
			profileImageEditor.__context__.fill();
			profileImageEditor.__context__.restore();
		});
		var setUserProfilePanningCoords = function () {
			var dX = 0, dY = 0, zoomToLast = false;
			if ("boolean" === typeof arguments[0] && arguments[0]) {
				zoomToLast = true;
			}
			if (zoomToLast) {
				if (setUserProfilePanningCoords.lastCoords) {
					profileImageEditor.profilePictureCenter(setUserProfilePanningCoords.lastCoords);
				}
			} else {
				dX = arguments[0];
				dY = arguments[1];
				setUserProfilePanningCoords.lastCoords = profileImageEditor.profilePictureCenter();
			}
			var scale = 1 / (canvasScale * profileImageEditor.profileZoomExp()),
				viewerHeightDifference = ((profileImageEditor.__context__.canvas.height - 2*profileImageEditor.innerFrameWidth()) * scale  - profileImageEditor.profileImageElem().height) / 2,
				viewerWidthDifference = ((profileImageEditor.__context__.canvas.width - 2*profileImageEditor.innerFrameWidth()) * scale  - profileImageEditor.profileImageElem().width) / 2,
				newCoords = {x:profileImageEditor.profilePictureCenter().x + dX * scale, y: profileImageEditor.profilePictureCenter().y + dY * scale},
			    xAdjustCount = 0,
				yAdjustCount = 0;
			var i = 0;
			for (i = 0; i < 2; ++i) { // TRH: there has got to be a closed-form for this, but I'm not smart enough to come up with one
				if (viewerWidthDifference > newCoords.x) {
					newCoords.x = viewerWidthDifference;
					++xAdjustCount;
				}
				if (-viewerWidthDifference < newCoords.x) {
					newCoords.x = -viewerWidthDifference;
					++xAdjustCount;
				}
			}
			for (i = 0; i < 2; ++i) {
				if (viewerHeightDifference > newCoords.y) {
					newCoords.y = viewerHeightDifference;
					++yAdjustCount;
				}
				if (-viewerHeightDifference < newCoords.y) {
					newCoords.y = -viewerHeightDifference;
					++yAdjustCount;
				}
			}
			if (2 <= xAdjustCount) {
				newCoords.x = 0;
			}
			if (2 <= yAdjustCount) {
				newCoords.y = 0;
			}
			profileImageEditor.profilePictureCenter(newCoords);
		};
		$editorCanvas.pointerLock({
			movement: setUserProfilePanningCoords
		});
		options.$dialog.dialog({
			hide: {effect: 'fade', duration: 200},
			modal: true,
			height: 412,
			width: 360,
			open: function () {
				if (!profileImageEditor.profileImageFile()) {
					profileImageEditor.handlers.chooseProfilePictureFile();
				}
			},
			autoOpen: false
		});
		$editorCanvas.each(function () {
			$(this).attr({
				width: $(this).width(),
				height: $(this).height()
			});
		});
		options.$dialog.find(options.zoomerSelector).lpslider({
			min: profileImageEditor.minZoom(),
			change: function (event, ui) {
				profileImageEditor.profileZoom(ui.value);
			},
			slide: function (event, ui) {
				profileImageEditor.profileZoom(ui.value);
			}
		});
		ko.bindingHandlers.draw = {
			init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
				viewModel.__context__ = element.getContext("2d");
			}
		};
		ko.applyBindings(profileImageEditor, options.$dialog.get(0));
		this.vm = profileImageEditor;
	};
	return ImageCropper;
});