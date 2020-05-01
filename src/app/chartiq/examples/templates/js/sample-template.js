(function (definition) {
    "use strict";

	if (typeof exports === "object" && typeof module === "object") {
		module.exports = definition(require('chartiq/js/chartiq'),require('chartiq/examples/feeds/quoteFeedSimulator'),require('chartiq/examples/feeds/quoteFeedForecastSimulator'),require('chartiq/examples/markers/markersSample'));
	} else if (typeof define === "function" && define.amd) {
		define(['chartiq/js/chartiq','chartiq/examples/feeds/quoteFeedSimulator','chartiq/examples/feeds/quoteFeedForecastSimulator','chartiq/examples/markers/markersSample'], definition);
	} else if (typeof window !== "undefined" || typeof self !== "undefined") {
		var global = typeof window !== "undefined" ? window : self;
		definition(global, global, global, global);
	} else {
		throw new Error("Only CommonJS, RequireJS, and <script> tags supported for sample-template.js.");
	}

})(function(_exports, quotefeed, forecastQuoteFeed, marker){
	var CIQ=_exports.CIQ;
	var Markers=marker.MarkersSample;

	var keystrokeHub, markerImplementation, rootId="";

	var INIT_SYMBOL="AAPL";  // Set to an initial symbol to load, or leave null

	/**
	 * Check the current width of the window and assign the appropriate css class
	 * that will provide a better look and feel for your screen size.
	 * Choices are small (break-sm), medium (break-md), large (break-lg)
	 */
	function checkWidth(stx) {
		var context=$(stx.chart.container).parents("cq-context,[cq-context]");
		var contextWidth=context.width();
		var symbolInput=$('.ciq-nav [name="symbol"]', context);
		if (contextWidth > 700) {
			$('body').removeClass('break-md break-sm').addClass('break-lg');
			$('.icon-toggles', context).removeClass('sidenav active').addClass('ciq-toggles');
			stx.layout.sidenav = 'sidenavOff';
			var placeholder = stx.termStructure ? "Enter Entity" : "Enter Symbol"; // term structure charts operate on entities not individual symbols
			symbolInput.attr("placeholder", placeholder);
		}
		else if (contextWidth <= 700 && contextWidth > 584) {
			$('body').removeClass('break-lg break-sm').addClass('break-md');
			$('.icon-toggles', context).removeClass('sidenav active').addClass('ciq-toggles');
			stx.layout.sidenav = 'sidenavOff';
			var placeholder = stx.termStructure ? "Entity" : "Symbol"; // term structure charts operate on entities not individual symbols
			symbolInput.attr("placeholder", placeholder);
		}
		else if (contextWidth <= 584) {
			$('body').removeClass('break-md break-lg').addClass('break-sm');
			$('.icon-toggles', context).removeClass('ciq-toggles').addClass('sidenav');
			symbolInput.attr("placeholder", "");
		}
		$('cq-dialog').each(function(){this.center();});
	}

	function setHeight(container, topNode) {
		var windowHeight=$(window).height();
		var ciqHeight = $(container).parent('.ciq-chart').height();
		// Check for drawing palette settings bar or legacy toolbar. Set to 0 if neither are present.
		var drawingSettingsHeight = $('cq-drawing-palette .palette-settings', topNode).outerHeight() || $('cq-toolbar', topNode).outerHeight() || 0;
		if ($(topNode).hasClass("toolbar-on")) {
			$(container).height(ciqHeight - drawingSettingsHeight).css('top', drawingSettingsHeight+'px');
		} else {
			$(container).height(ciqHeight).css('top', '0px');
		}
	    	// This little snippet will ensure that dialog boxes are never larger than the screen height
		$('#maxHeightCSS').remove();
		$('head').append('<style id="maxHeightCSS">cq-dialog { max-height: ' +  windowHeight + 'px }</style>');
	}

	function setWidth(container, topNode) {
		// Adjust the width of the chart to accommodate the Drawing palette when displayed
		var ciqWidth = $('.ciq-chart', topNode).width();
		// Set to 0 if no drawing palette is present
		var drawingPaletteWidth = $('cq-drawing-palette .palette-main', topNode).outerWidth() || 0;
		if ($(topNode).hasClass("toolbar-on")) {
			$(container).width(ciqWidth - (drawingPaletteWidth+5)).css('left', (drawingPaletteWidth+5)+'px');
		} else {
			$(container).width('').css('left', '0px');
		}
	}

	function createChart(params, callbacks, root){
		// flags for addon functionality etc
		if(!params) params={
			extendedHours:true,
			forecasting:false,
			marketDepth:true,
			rangeSlider:true,
			inactivityTimer:true,
			continuousZoom:false,
			animation:false,
			tooltip:false,
			fullScreen:true
		};
		// flag for enabling persistence of settings
		if(params.storage!==false) params.storage=true;

		if(!callbacks) callbacks={};
		CIQ.ensureDefaults(callbacks, {
			layout:saveLayout,
			symbolChange:saveLayout,
			drawing:saveDrawings,
			newChart:retoggleEvents,
			preferences:savePreferences
		});
		if(typeof(params.initialSymbol)!=="undefined") INIT_SYMBOL=params.initialSymbol;

		if(!root) root=document.body;
		if(root.id) rootId=root.id;
		var stxx=new CIQ.ChartEngine({container:root.querySelector('.chartContainer'), preferences:{labels:false, currentPriceLine:true, whitespace:0}});

		// Attach an automated quote feed to the chart to handle initial load, pagination and updates at preset intervals.
		stxx.attachQuoteFeed(quotefeed.quoteFeedSimulator,{refreshInterval:1,bufferSize:200});

		// Optionally set a market factory to the chart to make it market hours aware. Otherwise it will operate in 24x7 mode.
		// This is required for the simulator, or if you intend to also enable Extended hours trading zones.
		// Please note that, this method is set to use the CIQ.Market.Symbology functions by default,
		// which must be reviewed and adjust to comply with your quote feed and symbology format before they can be used.
		stxx.setMarketFactory(CIQ.Market.Symbology.factory);

		// Custom markers from markers example - remove if not using example code
		if(Markers) markerImplementation=new Markers(stxx);

		// Extended hours trading zones -- Make sure this is instantiated before calling startUI as a timing issue with may occur
		if(params.extendedHours && CIQ.ExtendedHours) new CIQ.ExtendedHours({stx:stxx, filter:true});

		// Forecasting
		if(params.forecasting && CIQ.PlotComplementer){
			var forecaster=new CIQ.PlotComplementer({
				stx: stxx,
				id: "forecast",
				decorator: {symbol:"_fcst",display:" Forecast"},
				renderingParameters: {chartType:"channel", opacity:0.5, pattern:"dotted"}
			});
			// change this quotefeed to your forecaster quotefeed, if you have one.  Change the refreshInterval if necessary
			forecaster.setQuoteFeed({
				quoteFeed: forecastQuoteFeed.quoteFeedForecastSimulator,
				behavior: {refreshInterval:60}
			});
		}
		

		// Floating tooltip on mousehover
		// comment in the following line if you want a tooltip to display when the crosshair toggle is turned on
		// This should be used as an *alternative* to the HeadsUp (HUD).
		if(params.tooltip && CIQ.Tooltip) new CIQ.Tooltip({stx:stxx, ohl:true, volume:true, series:true, studies:true});

		// Inactivity timer
		if(params.inactivityTimer && CIQ.InactivityTimer) new CIQ.InactivityTimer({stx:stxx, minutes:30});

		// Animation (using tension requires splines.js)
		if(params.animation && CIQ.Animation) new CIQ.Animation({stx: stxx, animationParameters: {tension:0.3}});

		//Range Slider; needs to be created before startUI() is called for custom themes to apply
		if(params.rangeSlider && CIQ.RangeSlider) new CIQ.RangeSlider({stx:stxx});

		// Continuous Zoom will also enable the SmartZoom button in your chart zoom controls
		// which allows the end-user to toggle the feature on and off.
		if(params.continuousZoom && CIQ.ContinuousZoom) new CIQ.ContinuousZoom({
			stx: stxx,
			periodicities:
			[
				// daily interval data
				{period:1,   interval:"month"},
				{period:1,   interval:"week"},
				{period:1,   interval:"day"},
				// 30 minute interval data
				{period:8,   interval:30},
				{period:1,   interval:30},
				// 1 minute interval data
				{period:5,   interval:1},
				{period:1,   interval:1},
				// one second interval data
				{period:10,  interval:1,  timeUnit:"second"},
				{period:1,   interval:1,  timeUnit:"second"},
			],
			boundaries:{
				maxCandleWidth: 15,
				minCandleWidth: 3
			}
		});

		// Enables Full Screen mode toggle button in chart controls
		if(params.fullScreen && CIQ.FullScreen) new CIQ.FullScreen({stx:stxx});

		// cryptoIQ
		// Market Depth plugin must be instantiated before startUI() is called for custom themes to apply.
		// Enable the cryptoIQ Market Depth panel:
		if(params.marketDepth && CIQ.MarketDepth) new CIQ.MarketDepth({stx:stxx, volume:true, mountain:true, step:true, record:true, height:"50%", orderbook:true});
		// Start simulated L2 data.
		if(CIQ.simulateL2) CIQ.simulateL2({stx:stxx, onInterval:1000, onTrade:true});
		// **In your implementation, you must instead load L2 data using https://documentation.chartiq.com/CIQ.ChartEngine.html#updateCurrentMarketData**

		if(params.termStructure && CIQ.TermStructure) new CIQ.TermStructure({ stx: stxx });
		
		if(params.storage){
			for(var cb in callbacks){
				stxx.addEventListener(cb,callbacks[cb]);
			}
		}

		startUI(stxx, root, params.storage);

		return stxx;
	}

	function restoreLayout(stx, cb, id){
		if(!id) id="";
		var datum=CIQ.localStorage.getItem("myChartLayout"+id);
		//if(datum===null) return;  //commented to make sure cb is called even when no layout found
		function closure(){
			restoreDrawings(stx, stx.chart.symbol, id);
			if(cb) cb();
		}
		stx.importLayout(JSON.parse(datum), {managePeriodicity:true, cb: closure});
	}

	function saveLayout(obj){
		var s=JSON.stringify(obj.stx.exportLayout(true));
		CIQ.localStorageSetItem("myChartLayout"+rootId, s);
	}

	function restoreDrawings(stx, symbol, id){
		if(id!=="") id+="~";
		var memory=CIQ.localStorage.getItem(id+symbol);
		if(memory!==null){
			var parsed=JSON.parse(memory);
			if(parsed){
				stx.importDrawings(parsed);
				stx.draw();
			}
		}
	}

	function saveDrawings(obj){
		var tmp=obj.stx.exportDrawings();
		if(tmp.length===0){
			CIQ.localStorage.removeItem(rootId+"~"+obj.symbol);
		}else{
			CIQ.localStorageSetItem(rootId+"~"+obj.symbol, JSON.stringify(tmp));
		}
	}

	function restorePreferences(stx, id){
		if(!id) id="";
		var pref=CIQ.localStorage.getItem("myChartPreferences"+id);
		if (pref) stx.importPreferences(JSON.parse(pref));
	}

	function savePreferences(obj){
		CIQ.localStorageSetItem("myChartPreferences",JSON.stringify(obj.stx.exportPreferences()));
	}

	function retoggleEvents(obj){
		var active=$(obj.stx.container).find(".stx-markers .ciq-active");
		active.triggerHandler("stxtap");
	}

	function startUI(stx, root, restore){

		var UIContext=root.context=new CIQ.UI.Context(stx, $(root).find("cq-context,[cq-context]").addBack("cq-context,[cq-context]"));
		var topNode=UIContext.topNode;

		stx.setDrawingContainer(topNode.querySelector('cq-drawing-settings'));

		var resizeMe=function(){
			if(!UIContext) return;
			resizeArea(stx, topNode);
		};
		$(window).resize(resizeMe);

		var UILayout=new CIQ.UI.Layout(UIContext);
		var UIHeadsUpDynamic=new CIQ.UI.HeadsUp($("cq-hu-dynamic", topNode), UIContext, {followMouse:true, autoStart: false});
		var UIHeadsUpStatic=new CIQ.UI.HeadsUp($("cq-hu-static", topNode), UIContext, {autoStart: true});

		UIContext.changeSymbol=function(data){
			var stx=this.stx;
			if(this.loader) this.loader.show();
			if(data.symbol==data.symbol.toLowerCase())
				data.symbol=data.symbol.toUpperCase(); // set a pretty display version

			// reset comparisons - remove this loop to transfer from symbol to symbol.
			for(var field in stx.chart.series) {
				// keep studies
				if (stx.chart.series[field].parameters.bucket != "study" ) stx.removeSeries(field);
			}

			var self=this;
			stx.loadChart(data, function(err) {
				if(err){
					// add 'symbol not found error' here if one needed.
					if(self.loader) self.loader.hide();
					return;
				}
				if(self.loader) self.loader.hide();
				if(restore) restoreDrawings(stx, stx.chart.symbol, root.id);
			});
		};

		UIContext.UISymbolLookup=topNode.querySelectorAll(".ciq-search cq-lookup");
		if(UIContext.UISymbolLookup){
			UIContext.setLookupDriver(new CIQ.ChartEngine.Driver.Lookup.ChartIQ());
			for(var lookIdx=0; lookIdx < UIContext.UISymbolLookup.length; lookIdx++)
				UIContext.UISymbolLookup[lookIdx].setCallback(function(context, data){
					context.changeSymbol(data);
				});
		}

		// keystrokeHub is attached to the "body" to be able to just start typing anywhere on the page to activate the chart's symbol input box.
		// Change to a different div tag if this behavior is too broad for your particular implementation.
		if(!keystrokeHub) {
			keystrokeHub=new CIQ.UI.KeystrokeHub($("body"), UIContext, {cb:CIQ.UI.KeystrokeHub.defaultHotKeys});
		}
		// Set the active context for the keystrokeHub to the last context we moused over. We also set
		// the cq-lookup within that context to be the cq-keystroke-default for body level keystrokes
		const setKeystrokeHub = function() {
			if(keystrokeHub.context===UIContext) return;
			keystrokeHub.setActiveContext(UIContext);
			$("cq-lookup").removeAttr("cq-keystroke-default");
			UIContext.node.find("cq-menu.ciq-search cq-lookup").attr("cq-keystroke-default","");
		};
		topNode.addEventListener("mouseover", setKeystrokeHub);
		setKeystrokeHub();

		var UIDrawingEdit = new CIQ.UI.DrawingEdit(null, UIContext);

		UIDrawingEdit.preventAutoClose = true;

		UIDrawingEdit.node.addEventListener("drawing-edit-begin", function(event) {
			if ($(topNode).hasClass("toolbar-on")) return;
			UIDrawingEdit.preventAutoClose = false;

			$(".ciq-draw", topNode).each(function() {
				this.priorVectorType = event.detail.tool;
				this.set(true);
			});
		}, false);

		UIDrawingEdit.node.addEventListener("drawing-edit-end", function(event) {
			if (UIDrawingEdit.preventAutoClose) return;
			if (event.detail.action !== "edit") UIDrawingEdit.preventAutoClose = true;
			if (event.detail.action !== "close") return;

			$(".ciq-draw", topNode).each(function() {
				this.set(false);
			});
		}, false);

		var UIStudyEdit=new CIQ.UI.StudyEdit(null, UIContext);

		var UIStorage=new CIQ.NameValueStore();

		var UIThemes=topNode.querySelector("cq-themes");
		if(UIThemes) UIThemes.initialize({
			builtInThemes: {"ciq-day":"Day","ciq-night":"Night"},
			defaultTheme: "ciq-night",
			nameValueStore: UIStorage,
			id: root.id
		});

		var UIMarkers=new CIQ.UI.Markers(UIContext, {menuItemSelector:".stx-markers cq-item", implementation:markerImplementation});

		// Enable the time span event panel
		if(CIQ.TimeSpanEventPanel) new CIQ.TimeSpanEventPanel({stx: stx, context: UIContext, menuItemSelector: ".stx-markers cq-item.span-event", loadSample: true});

		var sidePanel=topNode.querySelector("cq-side-panel");
		if(sidePanel) sidePanel.registerCallback(resizeMe);

		var sideNav=topNode.querySelector(".ciq-sidenav");
		if(sideNav) sideNav.registerCallback(function (value) {
			var stx=this.context.stx;
			var sidePanelWidth = sidePanel?sidePanel.nonAnimatedWidth():0;
			if (value === 'sidenavOn') {
				var chartHolderHeight = $('.stx-holder', topNode).height();
				$('.sidenav',topNode).height(chartHolderHeight);
				this.node.addClass("active");
				stx.layout.sidenav = "sidenavOn";
				$('.sidenav',topNode).addClass("active");
			} else if (value === 'sidenavOff') {
				$('.sidenav',topNode).removeClass("active");
				this.node.removeClass("active");
				stx.layout.sidenav = "sidenavOff";
			}
			resizeMe();
		});

		var headsUp=topNode.querySelector(".ciq-HU");
		if(headsUp) headsUp.registerCallback(function(value){
			if(value==="static"){
				UIHeadsUpDynamic.end();
				UIHeadsUpStatic.begin();
				this.node.addClass("active");
			}else if(value==="dynamic"){
				if(CIQ.isMobile || this.context.stx.layout.crosshair){
					// The dynamic headsUp doesn't make any sense on mobile devices so we skip that toggle
					// by manually setting the toggle to "static"
					this.set("static");
					UIHeadsUpDynamic.end();
					UIHeadsUpStatic.begin();
					this.node.addClass("active");
				}else{
					UIHeadsUpStatic.end();
					UIHeadsUpDynamic.begin();
					this.node.addClass("active");
				}
			}else{
				UIHeadsUpStatic.end();
				UIHeadsUpDynamic.end();
				this.node.removeClass("active");
			}
		});

		// Trigger a chart resize when the drawing palette view changes
		var drawingPalette=topNode.querySelector("cq-drawing-palette");
		if(drawingPalette) drawingPalette.registerCallback(resizeMe);

		var drawingToggles=topNode.querySelectorAll(".ciq-draw");
		if(drawingToggles){
			for(var toggleIdx=0; toggleIdx<drawingToggles.length; toggleIdx++){
				drawingToggles[toggleIdx].registerCallback(function(value){
					if(value){
						$(topNode).addClass("toolbar-on");
					}else{
						$(topNode).removeClass("toolbar-on");
					}
					// There are more than one drawing toggle so they need to be synced up
					for(var drawToggleIdx=0; drawToggleIdx<drawingToggles.length; drawToggleIdx++){
						// Setting currentValue directly so the callback isn't triggered
						drawingToggles[drawToggleIdx].currentValue = value;
						// Update the toggle's active class
						if(value){
							drawingToggles[drawToggleIdx].node.addClass("active");
						}else{
							drawingToggles[drawToggleIdx].node.removeClass("active");
						}
					}
					var stx=this.context.stx, container=stx.chart.container;
					setHeight(container, topNode);
					setWidth(container, topNode);
					stx.resizeChart();
					resizeMe();

					// The scroller in the tool palette is initially disabled because of its hidden state
					// Reset the scroller once visible so it can properly calculate its scrollable area.
					if(drawingPalette) drawingPalette.resetScroller();

					var paletteDock = topNode.querySelector("cq-palette-dock");
					if(paletteDock) paletteDock.dockAllPalettes();

					// a little code here to remember what the previous drawing tool was
					// and to re-enable it when the toolbar is reopened
					if(value){
						stx.changeVectorType(this.priorVectorType);
					}else{
						this.priorVectorType=stx.currentVectorParameters.vectorType;
						stx.changeVectorType("");
					}
				});
			}
		}

		// Uncomment this to display the drawing palette immediately on page load
		//topNode.querySelector(".ciq-nav .ciq-draw").set(true);

		var toggleMagnet=topNode.querySelector('.ciq-magnet');
		if(toggleMagnet) toggleMagnet.registerCallback(function(value){
			var preferences=this.context.stx.preferences;
			if(!isNaN(parseInt(value,10))) {
				toggleMagnet.classList.add('active');
				toggleMagnet.classList.remove('strong');
			}else if(!value || value=="false"){
				toggleMagnet.classList.remove('active');
				toggleMagnet.classList.remove('strong');
			}else{
				toggleMagnet.classList.add('active');
				toggleMagnet.classList.add('strong');
			}
		}, false);

		var trading=topNode.querySelector('.stx-trade');
		if(trading) {
			trading.registerCallback(function(value) {
				var sidePanel=topNode.querySelector("cq-side-panel");
				if(value){
					sidePanel.open({selector:".stx-trade-panel",className:"active"});
					this.node.addClass("active");
					$(".stx-trade-panel",topNode).removeClass("closed");
					stx.layout.sidenav = 'sidenavOff'; // in break-sm hide sidenav when turning on tfc side panel
				}else{
					sidePanel.close();
					this.node.removeClass("active");
					$(".stx-trade-panel",topNode).addClass("closed");
				}
			});
		}

		var tradingCentral=topNode.querySelector('.stx-tradingcentral');
		if(tradingCentral) {
			tradingCentral.registerCallback(function(value) {
				var tcElement = topNode.querySelector('cq-tradingcentral');
				if(!tcElement) return;
				if (value) {
					tcElement.removeAttribute('disabled');
				} else {
					tcElement.setAttribute('disabled', 'disabled');
				}
			});
		}

		// Begin load UI for term structure chart. Needs the term structure plugin to use.
		var datepicker = topNode.querySelector("cq-datepicker");
		if (datepicker && stx.termStructure) {
			datepicker.registerCallback(function(date) {
				stx.termStructure.setCurveDate(date);
			});
		}

		var xAxisCheckbox = topNode.querySelector(".ciq-checkbox-xaxis-scaling");
		if (xAxisCheckbox) {
			xAxisCheckbox.registerCallback(function(value) {
				stx.termStructure.setSpacingType.call(stx.termStructure, value);
				xAxisCheckbox.classList.toggle("ciq-active");
			});
		}

		var shadingCheckbox = topNode.querySelector(".ciq-checkbox-shading");
		if (shadingCheckbox) {
			shadingCheckbox.registerCallback(function(value) {
				stx.termStructure.setShading.call(stx.termStructure, value);
				shadingCheckbox.classList.toggle("ciq-active");
			});
			shadingCheckbox.currentValue = true; // make sure internal state starts correctly
		}
		// End load UI for term structure chart.

		var redo=topNode.querySelector('cq-redo');
		if(redo) redo.pairUp(topNode.querySelector("cq-undo"));

		$("cq-views",topNode).each(function(){
			this.initialize();
		});

		var params={
			excludedStudies: {
				"Directional": true,
				"Gopala":true,
				"vchart":true
			},
			alwaysDisplayDialog: {"ma":true,"AVWAP":true},
			/*dialogBeforeAddingStudy: {"rsi": true} // here's how to always show a dialog before adding the study*/
		};

		$("cq-studies",topNode).each(function(){
			this.initialize(params);
		});

		$("cq-heading",topNode).each(function(){
			this.showFilterIfNecessary();
		});

		if(UIContext.loader) UIContext.loader.show();

		function loadTheChart() {
			if(restore){
				restorePreferences(stx, topNode.id);

				restoreLayout(stx, function(){
					if(UIContext.loader) UIContext.loader.hide();

					// study legend needs the chart layout restored before rendering
					var studyLegend=$('cq-study-legend',topNode);
					for(var i=0; i<studyLegend.length; i++) {
						studyLegend[i].begin();
					}
				}, root.id);
			}

			if(INIT_SYMBOL && !stx.chart.symbol){
				// **Load an initial symbol. Change to null or one of your choice
				UIContext.UISymbolLookup[0].selectItem({symbol:INIT_SYMBOL});
			}

			if (stx.termStructure) { 
				stx.setChartType('termstructure');
			}

			CIQ.UI.begin();
		}

		loadTheChart();

		//CIQ.I18N.setLanguage(stx, "zh");		// Optionally set a language for the UI, after it has been initialized, and translate.

		//Trade From Chart (TFC)
		//set account key to your custom account class, or leave as null to automatically load the Demo class (CIQ.Account.Demo)
		if(CIQ.TFC) new CIQ.TFC({stx:stx, account: null, context:UIContext});

		//Visual Earnings
		if(CIQ.VisualEarnings) new CIQ.VisualEarnings({stx:stx, context:UIContext, menuContainer:$(".ciq-dropdowns",topNode)[0]});

		resizeMe();
	}

	function resizeArea(stx, topNode){
		checkWidth(stx);
		setHeight(stx.chart.container, topNode);
		setWidth(stx.chart.container, topNode);
		
		var paletteDock = document.querySelector('cq-palette-dock');
		var sidePanel=$("cq-side-panel", topNode)[0];
		var sideNav = $('.sidenav', topNode);
		var sideNavWidth = sideNav.hasClass("active") ? sideNav.width() : 0;
		
		if(sidePanel){
			$('.ciq-chart-area', topNode).css({'left': sideNavWidth +'px', 'right': sidePanel.nonAnimatedWidth()+'px'});
			$('cq-tradingcentral', topNode).css({'margin-right': sidePanel.nonAnimatedWidth() + 15 + 'px'});
		}else{
			$('.ciq-chart-area', topNode).css({'left': sideNavWidth +'px'});
		}
		// Allow the palette dock to resize the chart container and accomodate docked palettes
		if(paletteDock) paletteDock.handleResize();
		stx.resizeChart();
	}

	if(!_exports.createChart) _exports.createChart=createChart;

	// The following code will handle creation of a chart from a component, e.g. instant-chart.
	// We need to capture both the event and test for the attribute since the chart-component loads asynchronously
	// and we don't know whether the event was dispatched before this script file was loaded.
	function chartReadyHandler(e){
		e.detail.node.stx=createChart(e.detail.params, e.detail.callbacks, e.detail.node);
	}
	$("body").on('signal-chart-ready', chartReadyHandler);
	$('[cq-event-flag]').each(function(){ chartReadyHandler(this.signalEvent); });

	return _exports;

});
