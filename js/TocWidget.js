define([
    "dojo/_base/declare",
    "dojo/store/Memory",
    "dojo/dom-construct",
    "dojo/dom-class",
    "dojo/on",
    "dojo/_base/array",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/_Container",
    "dijit/_Contained",
    "dijit/form/CheckBox",
    "dojo/dom-attr",
    "esri/tasks/QueryTask",
    "esri/tasks/query",
    "dojo/Stateful",
    "dojo/promise/all",
    "dojox/gfx",
    "esri/symbols/jsonUtils"
],

function (declare, Memory, domConstruct, domClass, on, array, _WidgetBase, _TemplatedMixin, _WidgetsInTemplate, _Container, _Contained,
    ckBox, attr, QueryTask, esriQuery, Stateful, all, gfx, jsonUtils) {

    var boxActive = "Toggle layer display on map";
    var boxDisabled = "Zoom in to enable layer display controls";

    var featLyrSymbolTemplate = "<div><span class='TOCfeatSymbol' data-dojo-attach-point='symNode'></span> <span data-dojo-attach-point='labelNode' class='TOCswatchLabel'> ${!Label}</span></div>";

    var featureLyrTemplate = "<div><input data-dojo-type='dijit/form/CheckBox' data-dojo-attach-point='toggleBox' name='layerBox' class='${BoxClass}' " +
        "title='${BoxTitle}' value=${BoxValue} /><span class='TOCfeatSymbol' data-dojo-attach-point='symNode'></span> <span data-dojo-attach-point='labelNode' class='TOClayerLabel'> ${!Name}</span></div>";

    var symbolTemplate = "<div><img src='${ImgSrc}' class='TOCMultiSwatch' alt='${!Label}' /> <span data-dojo-attach-point='labelNode' class='TOCswatchLabel'> ${!Label}</span></div>";

    var featureTemplate = "<div><input data-dojo-type='dijit/form/CheckBox' data-dojo-attach-point='toggleBox' class='${BoxClass}' title='${BoxTitle}' value=${BoxValue} />" +
        "<img src='${ImgSrc}' data-dojo-attach-point='swatchNode' class='TOCswatch' alt='${!Name}' /> <span data-dojo-attach-point='labelNode' class='TOClayerLabel'> ${!Name}</span></div>";

    var textTemplate = "<div><input data-dojo-type='dijit/form/CheckBox' data-dojo-attach-point='toggleBox' " +
        "class='${BoxClass}' title='${BoxTitle}' value=${BoxValue} /> <span data-dojo-attach-point='labelNode' class='TOClayerLabel'> ${!Name}</span></div>";

    var groupNodeTemplate = "<div data-dojo-attach-point='parentItemNode'>" +
        "<span data-dojo-attach-point='iconNode' class='expandoIconTOC' data-dojo-attach-event='onclick: toggleGroup'></span>" +
        "<input data-dojo-type='dijit/form/CheckBox' data-dojo-attach-point='toggleBox' class='${BoxClass}' title='${BoxTitle}' value=${BoxValue} />" +
        "<span data-dojo-attach-point='labelNode' class='TOClayerLabel'> ${!Name}</span>" +
        "<div data-dojo-attach-point='containerNode' class='${NodeClass}'></div></div>";

    var FeatureLayerNode = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplate, _Container, _Contained, Stateful], {
        templateString: featureLyrTemplate,
        widgetsInTemplate: true,
        baseClass: "TOCFeatureLyrNode",
        BoxTitle: boxActive,

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.Toc = args.Toc;
            this.MapControl = this.Toc.MapControl;
            this.Visible = args.Item.defaultVisibility;
            this.Item = args.Item;
            this.Disabled = args.Disabled;
            this.Name = args.Item.name;
            this.Symbol = args.Symbol;
            this.BoxValue = args.Item.mapID;
            this.ShowToggleBox = args.Item.CanToggle;
            if (!this.ShowToggleBox) { this.BoxClass = "hideTOCBox"; }
            else { this.BoxClass = "showTOCBox"; }
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.Disabled) { domClass.add(this.labelNode, "TOCItemDisabled"); }
            if (this.ShowToggleBox) {
                if (this.Disabled) { this.toggleBox.set("title", boxDisabled); this.toggleBox.set("disabled", "disabled"); }
                if (this.Visible) { this.toggleBox.set("checked", "checked"); }
            }
            if (this.Symbol.type === "picturemarkersymbol") {
                var url = this.Item.url + "/images/" + this.Symbol.imageData;
                domConstruct.create("img", { src: url }, this.symNode);
            } else {
                var mySurface = gfx.createSurface(this.symNode, 40, 40);
                var descriptors = jsonUtils.getShapeDescriptors(this.Symbol);
                var shape = mySurface.createShape(descriptors.defaultShape).setFill(descriptors.fill).setStroke(descriptors.stroke);
                shape.applyTransform({ dx: 20, dy: 20 });
            }
        }
    });

    var FeatureLyrSymbolNode = declare([_WidgetBase, _TemplatedMixin, _Contained], {
        templateString: featLyrSymbolTemplate,
        baseClass: "TOCSymbolNode",

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.Label = args.label;
            this.Symbol = args.Symbol;
            this.Item = args.Item;
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.Symbol.type === "picturemarkersymbol") {
                var url = this.Item.url + "/images/" + this.Symbol.imageData;
                domConstruct.create("img", { src: url }, this.symNode);
            } else {
                var mySurface = gfx.createSurface(this.symNode, 40, 40);
                var descriptors = jsonUtils.getShapeDescriptors(this.Symbol);
                var shape = mySurface.createShape(descriptors.defaultShape).setFill(descriptors.fill).setStroke(descriptors.stroke);
                shape.applyTransform({ dx: 20, dy: 20 });
            }
        }
    });

    var GroupNode = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplate, _Container, _Contained, Stateful], {
        templateString: groupNodeTemplate,
        widgetsInTemplate: true,
        baseClass: "TOCGroupNode",
        BoxTitle: boxActive,
        NodeClass: "TOCsubLayerList",

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.Toc = args.Toc;
            this.MapControl = this.Toc.MapControl;
            this.GroupVis = args.Item.defaultVisibility;
            this.Item = args.Item;
            this.Name = args.Item.name;
            this.ShowToggleBox = args.Item.CanToggle;
            this.Disabled = args.Disabled;
            this.BoxValue = args.Item.id;
            if (this.ShowToggleBox) { this.BoxClass = "showTOCBox"; }
            else { this.BoxClass = "hideTOCBox"; }
            this.isExpanded = this.Item.isExpanded;
            this.expand = this.Item.expand;
        },

        toggleGroup: function () {
            var parent = this;
            if (parent.isExpanded) {
                domClass.replace(parent.iconNode, "TOCparentRow-collapsed", "TOCparentRow-expanded");
                domClass.add(parent.containerNode, "hideTOCItem");
            } else {
                domClass.replace(parent.iconNode, "TOCparentRow-expanded", "TOCparentRow-collapsed");
                domClass.remove(parent.containerNode, "hideTOCItem");
            }
            parent.set("isExpanded", !parent.isExpanded);
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.Disabled) { domClass.add(this.labelNode, "TOCItemDisabled"); }
            if (this.ShowToggleBox) {
                if (this.Disabled) { this.toggleBox.set("title", boxDisabled); this.toggleBox.set("disabled", "disabled"); }
                if (this.GroupVis) { this.toggleBox.set("checked", "checked"); }
            }
            if (this.expand) {
                var rowClass;
                if (this.isExpanded) {
                    rowClass = "TOCparentRow-expanded";
                } else { rowClass = "TOCparentRow-collapsed"; domClass.add(this.containerNode, "hideTOCItem"); }
                domClass.add(this.iconNode, rowClass);
            }
        }
    });

    var SymbolGroupNode = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplate, _Container, _Contained, Stateful], {
        templateString: groupNodeTemplate,
        widgetsInTemplate: true,
        baseClass: "TOCsymbolParentNode",
        BoxTitle: boxActive,
        NodeClass: "TOCsymbolList",

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.Toc = args.Toc;
            this.MapControl = this.Toc.MapControl;
            this.Visible = args.Item.defaultVisibility;
            this.Disabled = args.Disabled;
            this.Item = args.Item;
            this.Name = args.Item.name;
            this.ShowToggleBox = args.Item.CanToggle;
            this.BoxValue = args.Item.id;
            if (!this.ShowToggleBox) { this.BoxClass = "hideTOCBox"; }
            else { this.BoxClass = "showTOCBox"; }
            this.isExpanded = this.Item.isExpanded;
            this.expand = this.Item.expand;
        },

        toggleGroup: function () {
            var parent = this;
            if (parent.isExpanded) {
                domClass.replace(parent.iconNode, "TOCparentRow-collapsed", "TOCparentRow-expanded");
                domClass.add(parent.containerNode, "hideTOCItem");
            } else {
                domClass.replace(parent.iconNode, "TOCparentRow-expanded", "TOCparentRow-collapsed");
                domClass.remove(parent.containerNode, "hideTOCItem");
            }
            parent.set("isExpanded", !parent.isExpanded);
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.Disabled) { domClass.add(this.labelNode, "TOCItemDisabled"); }
            if (this.ShowToggleBox) {
                if (this.Disabled) { this.toggleBox.set("title", boxDisabled); this.toggleBox.set("disabled", "disabled"); }
                if (this.Visible) { this.toggleBox.set("checked", "checked"); }
            }
            if (this.expand) {
                var rowClass;
                if (this.isExpanded) {
                    rowClass = "TOCparentRow-expanded";
                } else { rowClass = "TOCparentRow-collapsed"; domClass.add(this.containerNode, "hideTOCItem"); }
                domClass.add(this.iconNode, rowClass);
            }
        }
    });

    var FeatureNode = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplate, _Container, _Contained, Stateful], {
        templateString: featureTemplate,
        widgetsInTemplate: true,
        baseClass: "TOCFeatureNode",
        BoxTitle: boxActive,

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.Toc = args.Toc;
            this.MapControl = this.Toc.MapControl;
            this.Visible = args.Item.defaultVisibility;
            this.Disabled = args.Disabled;
            this.Item = args.Item;
            this.Name = args.Item.name;
            var url = args.Symbol;
            var src = this.Toc.MapServiceURL + "/" + args.Item.id + "/images/" + url;
            this.ImgSrc = src;
            this.BoxValue = args.Item.id;
            this.ShowToggleBox = args.Item.CanToggle;
            if (!this.ShowToggleBox) { this.BoxClass = "hideTOCBox"; }
            else { this.BoxClass = "showTOCBox"; }
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.Disabled) { domClass.add(this.labelNode, "TOCItemDisabled"); }
            if (this.ShowToggleBox) {
                if (this.Disabled) { this.toggleBox.set("title", boxDisabled); this.toggleBox.set("disabled", "disabled"); }
                if (this.Visible) { this.toggleBox.set("checked", "checked"); }
            } else { domClass.add(this.swatchNode, "noSwatch"); }
        }
    });

    var SymbolNode = declare([_WidgetBase, _TemplatedMixin, _Contained], {
        templateString: symbolTemplate,
        baseClass: "TOCSymbolNode",

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.ImgSrc = args.ImgSrc;
            this.Label = args.label;
        },

        postCreate: function () {
            this.inherited(arguments);
        }
    });

    var AnnoNode = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplate, _Container, _Contained, Stateful], {
        templateString: textTemplate,
        widgetsInTemplate: true,
        baseClass: "TOCLabelNode",
        BoxTitle: boxActive,

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.Toc = args.Toc;
            this.MapControl = this.Toc.MapControl;
            this.Visible = args.Item.defaultVisibility;
            this.Item = args.Item;
            this.Name = args.Item.name;
            this.BoxValue = args.Item.id;
            this.ShowToggleBox = args.Item.CanToggle;
            this.Disabled = args.Disabled;
            if (!this.ShowToggleBox) { this.BoxClass = "hideTOCBox"; }
            else { this.BoxClass = "showTOCBox"; }
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.Disabled) { domClass.add(this.labelNode, "TOCItemDisabled"); }
            if (this.ShowToggleBox) {
                if (this.Disabled) { this.toggleBox.set("title", boxDisabled); this.toggleBox.set("disabled", "disabled"); }
                if (this.Visible) { this.toggleBox.set("checked", "checked"); }
            }
        }
    });

    var AnnoChildNode = declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplate, _Container, _Contained, Stateful], {
        templateString: textTemplate,
        widgetsInTemplate: true,
        baseClass: "TOCLabelNode",
        BoxTitle: boxActive,

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.Toc = args.Toc;
            this.MapControl = this.Toc.MapControl;
            this.Visible = args.Item.defaultVisibility;
            this.Item = args.Item;
            this.Name = args.Item.name;
            this.BoxValue = args.Item.id;
            this.ShowToggleBox = args.Item.CanToggle;
            this.Disabled = args.Disabled;
            if (!this.ShowToggleBox) { this.BoxClass = "hideTOCBox"; }
            else { this.BoxClass = "showTOCBox"; }
        },

        postCreate: function () {
            this.inherited(arguments);
            if (this.Disabled) { domClass.add(this.labelNode, "TOCItemDisabled"); }
            if (this.ShowToggleBox) {
                if (this.Disabled) { this.toggleBox.set("title", boxDisabled); this.toggleBox.set("disabled", "disabled"); }
                if (this.Visible) { this.toggleBox.set("checked", "checked"); }
                domClass.replace(this.labelNode, "TOCcbLabel", "TOClayerLabel");
                this.toggleBox.set("style", "margin-left: 20px;");
            } else { domClass.replace(this.labelNode, "TOCsubLabel", "TOClayerLabel"); }
        }
    });

    return declare([_WidgetBase, _Container, Stateful], {
        loaded: false,
        HideLayersList: null,
        ShowAllLayers: true,
        LayersToToggle: null,
        FeatureService: false,
        MapService: null,
        FeatureLayers: null,
        Title: null,
        ShowCheckBoxes: true,
        ToggleAll: true,

        constructor: function (args) {
            declare.safeMixin(this, args);
            this.MapControl = args.MapControl;
            this.MapService = args.MapService;
            if (args.FeatureService) {
                this.FeatureService = true;
                if (!args.FeatureLayers) { this._throwError("FeatureLayers array required"); }
                else { this.FeatureLayers = args.FeatureLayers; }
            } else {
                if (!args.MapService) { this._throwError("MapService required"); }
                else { this.MapServiceURL = args.MapService.url; }
            }
            if (args.Title) { this.Title = args.Title; }
            if (args.HideLayersList) {
                this.ShowAllLayers = false;
                this.HideLayersList = args.HideLayersList;
            }
            if (args.ShowCheckBoxes !== "undefined") {
                this.ShowCheckBoxes = args.ShowCheckBoxes;
                if (args.ToggleAll === false) {
                    this.ToggleAll = args.ToggleAll;
                    this.LayersToToggle = args.LayersToToggle;
                }
            }
            if (!args.Expand) {
                this._throwError("Expand setting is required");
            } else {
                this.ExpandOption = args.Expand.options;
                this.ExpandIDs = args.Expand.expandLayers;
            }
            if (args.className) { this.className = args.className; }
            this.LegendStore = new Memory({ idProperty: "layerId" });
            this.LayerStore = new Memory({ idProperty: "id" });
            this.GroupLayerIds = [];
            this.Nodes = {};
        },

        _queryAllLayers: function () {
            var self = this, queryLayersURL = self.MapServiceURL + "/layers?f=json";
            var layersTask = new QueryTask(queryLayersURL);
            var layersQuery = new esriQuery();
            layersQuery.returnGeometry = false;
            layersQuery.where = "id > 0";
            var layersResults = layersTask.execute(layersQuery);
            return layersResults.promise;
        },

        _queryLegendLayers: function () {
            var self = this, queryLegendURL = self.MapServiceURL + "/legend?f=json";
            var legendTask = new QueryTask(queryLegendURL);
            var legendQuery = new esriQuery();
            legendQuery.returnGeometry = false;
            legendQuery.where = "layerId > 0";
            var legendResults = legendTask.execute(legendQuery);
            return legendResults.promise;
        },

        _loadLegend: function (results, self) {
            /* Load legend symbols from REST url */
            var legendLyrs = array.filter(results[1].layers, function (legendItem) {
                var cut = array.some(self.HideLayersList, function (hideLyrId) { return hideLyrId === legendItem.layerId; });
                if ((self.ShowAllLayers) || (!cut)) { return legendItem; }
            });
            self.LegendStore.setData(legendLyrs);
            self._loadLayers(results[0], self);
        },

        _showChildren: function (sublyrs, self) {
            /* Check if sublayers are hidden. If all are listed as hidden layers, do not expand parent layer */
            var keepChildren = false;
            if (array.every(sublyrs, function (child) { return array.indexOf(self.HideLayersList, child.id) >= 0; })) {
                keepChildren = false;
            } else { keepChildren = true; }
            return keepChildren;
        },

        _loadLayers: function (results, self) {
            if (results.length === 0) { self._throwError("The service query failed. Please check your map service settings."); }
            var expandAll = false;
            if (self.ExpandOption === "all") { expandAll = true; }
            if ((self.ShowCheckBoxes) && (!self.ToggleAll) && (!self.LayersToToggle)) { self._throwError("LayersToToggle setting is required"); }
            /* Indicate any layers in the HideLayersList array */
            /* They still need to be included in LayerStore in order to maintain layer visibility settings */
            var allData = array.map(results.layers, function (lyr) {
                var cut = false;
                if (!self.ShowAllLayers) { cut = array.some(self.HideLayersList, function (hideLyrId) { return hideLyrId === lyr.id; }); }
                if (!cut) { lyr.ShowNode = true; return lyr; }
                else if (cut) { lyr.ShowNode = false; return lyr; }
            });
            self.LayerStore.setData(allData);

            self.LayerStore.query({ ShowNode: true }).forEach(function (item) {
                /* Configuration of layer item properties here enables proper tree organization */
                item.isChild = false;
                if ((item.type === "Group Layer") || (item.subLayers.length > 0)) {
                    //if (item.type === "Group Layer") {
                    self.GroupLayerIds.push(item.id);
                    item.hasChildren = true;
                    if (!self.ShowAllLayers) {
                        var listChildren = self._showChildren(item.subLayers, self);
                        if (listChildren) {
                            item.showChildren = true;
                            item.expand = true;
                        } else { item.showChildren = false; item.expand = false; }
                    } else { item.expand = true; item.showChildren = true; }
                    if (!item.parentLayer) { item.parent = null; item.isChild = false; }
                    else { item.parent = item.parentLayer.id; item.isChild = true; }
                }
                if (item.parentLayer) { item.parent = item.parentLayer.id; item.isChild = true; }
                if ((item.type === "Feature Layer") && (item.drawingInfo) && (item.drawingInfo.renderer.type !== "simple")) {
                    item.hasSymbolChildren = true;
                    item.hasChildren = false;
                    item.expand = true;
                }
                if ((expandAll) || (array.indexOf(self.ExpandIDs, item.id) > -1)) { item.isExpanded = true; }
                else { item.isExpanded = false; }
                if ((self.ToggleAll) || (array.indexOf(self.LayersToToggle, item.id) > -1)) { item.CanToggle = true; }
                self.LayerStore.put(item);
            });
            var tocItems = self.LayerStore.query({ isChild: false });
            self._loadItems(self, tocItems);
        },

        _loadFeatureLayers: function (flayers) {
            var self = this, featData = [];
            if (flayers.length === 0) { self._throwError("No Feature Layers were loaded. Please check your settings."); }
            if ((self.ShowCheckBoxes) && (!self.ToggleAll) && (!self.LayersToToggle)) { self._throwError("LayersToToggle setting is required"); }
            if (self.ExpandOption === "all") { expandAll = true; }
            else { expandAll = false; }
            /* Load symbol renderer for Feature Layers */
            array.forEach(flayers, function (layer) {
                var lyrItem = {
                    minScale: layer.minScale,
                    maxScale: layer.maxScale,
                    defaultVisibility: layer.visible,
                    name: layer.name,
                    mapID: layer.id,
                    id: layer.layerId,
                    url: layer.url
                };
                if (layer.renderer.symbol) {
                    lyrItem.symbol = layer.renderer.symbol;
                } else { lyrItem.symbol = layer.renderer.infos; }
                featData.push(lyrItem);
            });
            self.LayerStore.setData(featData);

            /* Configuration of layer item properties here enables proper tree organization */
            self.LayerStore.query().forEach(function (item) {
                var scaleDependent = false, layerVis = self._getLayerVis(item);
                if ((item.minScale > 0) || (item.maxScale > 0)) { scaleDependent = true; }
                if ((self.ToggleAll) || (array.indexOf(self.LayersToToggle, item.id) > -1)) { item.CanToggle = true; }
                if (item.symbol.length > 1) {
                    item.hasSymbolChildren = true;
                    item.hasChildren = false;
                    item.expand = true;
                    if ((expandAll) || (array.indexOf(self.ExpandIDs, item.id) > -1)) { item.isExpanded = true; }
                    else { item.isExpanded = false; }
                    var parentSymbolNode = new SymbolGroupNode({ Item: item, Toc: self, Disabled: !layerVis, DisplayScale: scaleDependent, className: "parent-row" });
                    self.addChild(parentSymbolNode);
                    if (item.CanToggle) { parentSymbolNode.toggleBox.on("click", self._toggleFeatureLayer); }
                    parentSymbolNode.watch("Disabled", self._itemState);
                    array.forEach(item.symbol, function (symbol) {
                        var symNode = new FeatureLyrSymbolNode({ Label: symbol.label, Symbol: symbol.symbol, Item: item });
                        parentSymbolNode.addChild(symNode);
                    });
                    self.LayerStore.put(item);
                } else {
                    var featureNode = new FeatureLayerNode({ Item: item, Toc: self, Disabled: !layerVis, DisplayScale: scaleDependent, Symbol: item.symbol });
                    self.addChild(featureNode);
                    if (item.CanToggle) { featureNode.toggleBox.on("click", self._toggleFeatureLayer); }
                    featureNode.watch("Disabled", self._itemState);
                }
            });
            /* Connect map zoom to set Disabled properties for legend items */
            on(self.MapControl, "zoom-end", function () { self._onMapZoom(self); });
            /* Set loaded property. */
            self.set("loaded", true);
        },

        _loadChildren: function (parent, subLayers) {
            var toc = this;
            array.forEach(subLayers, function (childItem) {
                var layerVis = toc._getLayerVis(childItem);
                var svcVisAtScale = toc.MapService.visibleAtMapScale, svcVis = toc.MapService.visible, scaleDependent = false, itemDisabled = true;
                if ((layerVis) && (svcVisAtScale) && (svcVis) && (!parent.Disabled)) { itemDisabled = false; }
                if ((childItem.minScale > 0) || (childItem.maxScale > 0)) { scaleDependent = true; }
                if ((childItem.type === "Feature Layer") || (childItem.type === "Raster Layer")) {
                    var legendItem = toc.LegendStore.get(childItem.id);
                    if (childItem.hasSymbolChildren) {
                        var parentSymbolNode = new SymbolGroupNode({ Item: childItem, Toc: toc, Disabled: itemDisabled, DisplayScale: scaleDependent });
                        parent.addChild(parentSymbolNode);
                        if (childItem.CanToggle) {
                            parentSymbolNode.toggleBox.on("click", toc._toggleLayer);
                        }
                        parentSymbolNode.watch("Disabled", toc._itemState);
                        if (childItem.expand) {
                            var imgBase = toc.MapServiceURL + "/";
                            array.forEach(legendItem.legend, function (legendChild) {
                                var imgURL = imgBase + childItem.id + "/images/" + legendChild.url
                                var symNode = new SymbolNode({ Label: legendChild.label, ImgSrc: imgURL });
                                parentSymbolNode.addChild(symNode);
                            });
                        }
                        toc.Nodes[childItem.name] = parentSymbolNode;
                    } else {
                        var featureNode = new FeatureNode({ Item: childItem, Toc: toc, Disabled: itemDisabled, DisplayScale: scaleDependent, Symbol: legendItem.legend[0].url });
                        parent.addChild(featureNode);
                        if (childItem.CanToggle) {
                            featureNode.toggleBox.on("click", toc._toggleLayer);
                        }
                        featureNode.watch("Disabled", toc._itemState);
                        toc.Nodes[childItem.name] = featureNode;
                    }
                } else if (childItem.type === "Group Layer") {
                    var parentNode = new GroupNode({ Item: childItem, Toc: toc, Disabled: itemDisabled, DisplayScale: scaleDependent });
                    parent.addChild(parentNode);
                    if (childItem.showChildren) {
                        var subLayers = toc.LayerStore.query({ parent: childItem.id });
                        if (childItem.expand) { toc._loadChildren(parentNode, subLayers); }
                        if (childItem.CanToggle) {
                            parentNode.toggleBox.on("click", toc._toggleGroupLayer);
                        }
                    }
                    parentNode.watch("Disabled", toc._itemState);
                    toc.Nodes[childItem.name] = parentNode;
                } else if (childItem.type === "Annotation Layer") {
                    var annoNode = new AnnoChildNode({ Item: childItem, Disabled: itemDisabled, DisplayScale: scaleDependent, Toc: toc });
                    parent.addChild(annoNode);
                    if (childItem.CanToggle) {
                        annoNode.toggleBox.on("click", toc._toggleLayer);
                    }
                    annoNode.watch("Disabled", toc._itemState);
                    toc.Nodes[childItem.name] = annoNode;
                }
            });
            if (!parent.isExpanded) { domClass.add(parent.containerNode, "hideTOCItem;"); }
        },

        _loadItems: function (toc, tocItems) {
            var imgBase = toc.MapServiceURL + "/";
            array.forEach(tocItems, function (item) {
                var layerVis = toc._getLayerVis(item);
                var svcVisAtScale = toc.MapService.visibleAtMapScale, svcVis = toc.MapService.visible, scaleDependent = false, itemDisabled = true;
                if ((layerVis) && (svcVisAtScale) && (svcVis)) { itemDisabled = false; }
                if ((item.minScale > 0) || (item.maxScale > 0)) { scaleDependent = true; }
                if (item.type === "Group Layer") {
                    var parentNode = new GroupNode({ Item: item, Toc: toc, Disabled: itemDisabled, DisplayScale: scaleDependent });
                    toc.addChild(parentNode);
                    if ((item.showChildren) && (item.expand)) {
                        var subLayers = toc.LayerStore.query({ parent: item.id });
                        toc._loadChildren(parentNode, subLayers);
                    }
                    if (item.CanToggle) {
                        parentNode.toggleBox.on("click", toc._toggleGroupLayer);
                    }
                    parentNode.watch("Disabled", toc._itemState);
                    toc.Nodes[item.name] = parentNode;
                } else if ((item.type === "Feature Layer") || (item.type === "Raster Layer")) {
                    var legendItem = toc.LegendStore.get(item.id);
                    if (item.hasSymbolChildren) {
                        var parentSymbolNode = new SymbolGroupNode({ Item: item, Toc: toc, Disabled: itemDisabled, DisplayScale: scaleDependent });
                        toc.addChild(parentSymbolNode);
                        if (item.CanToggle) {
                            parentSymbolNode.toggleBox.on("click", toc._toggleLayer);
                        }
                        parentSymbolNode.watch("Disabled", toc._itemState);
                        var imgBase = toc.MapServiceURL + "/";
                        array.forEach(legendItem.legend, function (legendChild) {
                            var imgURL = imgBase + item.id + "/images/" + legendChild.url
                            var symNode = new SymbolNode({ Label: legendChild.label, ImgSrc: imgURL });
                            parentSymbolNode.addChild(symNode);
                        });
                        toc.Nodes[item.name] = parentSymbolNode;
                    } else {
                        var featureNode = new FeatureNode({ Item: item, Toc: toc, Disabled: itemDisabled, DisplayScale: scaleDependent, Symbol: legendItem.legend[0].url });
                        toc.addChild(featureNode);
                        if (item.CanToggle) {
                            featureNode.toggleBox.on("click", toc._toggleLayer);
                        }
                        featureNode.watch("Disabled", toc._itemState);
                        toc.Nodes[item.name] = featureNode;
                    }
                }
                else if (item.type === "Annotation Layer") {
                    var annoNode = new AnnoNode({ Item: item, Toc: toc, Disabled: itemDisabled, DisplayScale: scaleDependent });
                    toc.addChild(annoNode);
                    if (item.CanToggle) {
                        if (item.subLayers[0]) { annoNode.toggleBox.on("click", toc._toggleGroupLayer); }
                        else { annoNode.toggleBox.on("click", toc._toggleLayer); }
                    }
                    annoNode.watch("Disabled", toc._itemState);
                    toc.Nodes[item.name] = annoNode;
                }
            });
            /* Connect map zoom to set Disabled properties for legend items */
            on(toc.MapControl, "zoom-end", function () { toc._onMapZoom(toc); });
            /* Connect map service visibility to set Disabled properties for legend items */
            toc.MapService.on("visibility-change", function (vis) { toc._onSvcVisibilityChange(toc, vis); });
            /* Set loaded property. */
            toc.set("loaded", true);
        },

        _onSvcVisibilityChange: function (toc, vis) {
            array.forEach(Object.keys(toc.Nodes), function (nodeName) {
                var item = toc.Nodes[nodeName];
                var layerVis = toc._getLayerVis(item.Item);
                if ((vis.visible) && (item.Disabled) && (layerVis)) { item.set("Disabled", false); }
                else if ((!vis.visible) && (!item.Disabled)) { item.set("Disabled", true); }
            });
        },

        _itemState: function (prop, oldVal, newVal) {
            var toc = this.Toc;
            if (!newVal) {
                domClass.remove(this.labelNode, "TOCItemDisabled");
                if (this.Item.CanToggle) {
                    this.toggleBox.set("disabled", false);
                    this.toggleBox.set("title", boxActive);
                }
            } else {
                domClass.add(this.labelNode, "TOCItemDisabled");
                if (this.Item.CanToggle) {
                    this.toggleBox.set("disabled", "disabled");
                    this.toggleBox.set("title", boxDisabled);
                }
            }
        },

        _onMapZoom: function (toc) {
            if (toc.FeatureService) {
                array.forEach(toc.getChildren(), function (item) {
                    var flyr = toc.MapControl.getLayer(item.Item.mapID);
                    var visAtScale = flyr.visibleAtMapScale;
                    if ((!visAtScale) && (!item.Disabled)) {
                        item.set("Disabled", true);
                    } else if ((visAtScale) && (item.Disabled)) { item.set("Disabled", false); }
                });
            } else {
                var svcVisAtScale = toc.MapService.visibleAtMapScale, svcVis = toc.MapService.visible;
                array.forEach(toc.getChildren(), function (item) {
                    if (item.Item) {
                        if (((!svcVis) || (!svcVisAtScale)) && (!item.Disabled)) {
                            item.set("Disabled", true);
                        } else if ((svcVis) && (svcVisAtScale) && (!item.DisplayScale) && (item.Disabled)) {
                            item.set("Disabled", false);
                        } else if ((svcVis) && (svcVisAtScale) && (item.DisplayScale)) {
                            var layerVis = toc._getLayerVis(item.Item);
                            if ((layerVis) && (item.Disabled)) { item.set("Disabled", false); }
                            else if ((!layerVis) && (!item.Disabled)) { item.set("Disabled", true); }
                        }
                        //CHECK CHILDREN
                        if ((item.Item.hasChildren) && (item.Disabled)) {
                            array.forEach(item.getChildren(), function (child) {
                                child.set("Disabled", true);
                                if (child.Item.hasChildren) {
                                    array.forEach(child.getChildren(), function (sub) { sub.set("Disabled", true); });
                                }
                            });
                        } else if ((item.Item.hasChildren) && (!item.Disabled)) {
                            array.forEach(item.getChildren(), function (child) {
                                if ((svcVis) && (svcVisAtScale) && (!child.DisplayScale) && (child.Disabled)) {
                                    child.set("Disabled", false);
                                } else if ((svcVis) && (svcVisAtScale) && (child.DisplayScale)) {
                                    var layerVis = toc._getLayerVis(child.Item);
                                    if ((layerVis) && (child.Disabled)) { child.set("Disabled", false); }
                                    else if ((!layerVis) && (!child.Disabled)) { child.set("Disabled", true); }
                                }
                                if ((child.Item) && (child.Item.hasChildren)) {
                                    //if (child.Item.hasChildren) {
                                    array.forEach(child.getChildren(), function (sub) {
                                        if ((svcVis) && (svcVisAtScale) && (!sub.DisplayScale) && (sub.Disabled)) {
                                            sub.set("Disabled", false);
                                        } else if ((svcVis) && (svcVisAtScale) && (sub.DisplayScale)) {
                                            var layerVis = toc._getLayerVis(sub.Item);
                                            if ((layerVis) && (sub.Disabled)) { sub.set("Disabled", false); }
                                            else if ((!layerVis) && (!sub.Disabled)) { sub.set("Disabled", true); }
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            }
        },

        _handleGroupLayerVis: function (toc, visibleLayers) {
            /* This function reconciles parent/child visibility for all group layers */
            var groupItems = toc.LayerStore.query({ hasChildren: true });
            array.forEach(groupItems, function (parentLyr) {
                var grpIndex = array.indexOf(visibleLayers, parentLyr.id);
                /* Always remove group layer IDs, they will interfere with child visibility settings */
                if (grpIndex >= 0) { visibleLayers.splice(grpIndex, 1); }
                var grpNode = toc.Nodes[parentLyr.name];
                /* If the parent layer is not visible, remove all child layer IDs */
                if (!grpNode.GroupVis) {
                    array.forEach(parentLyr.subLayers, function (child) {
                        var childIndex = array.indexOf(visibleLayers, child.id);
                        if (childIndex >= 0) { visibleLayers.splice(childIndex, 1); }
                        var subLayers = toc.LayerStore.get(child.id).subLayers;
                        if (subLayers.length > 0) {
                            array.forEach(subLayers, function (sub) {
                                var subIndex = array.indexOf(visibleLayers, sub.id);
                                if (subIndex >= 0) { visibleLayers.splice(subIndex, 1); }
                            });
                        }
                    });
                }
            });
            return visibleLayers;
        },

        _toggleLayer: function (evt) {
            var tocNode = this.getParent(), toc = tocNode.Toc;
            var layerId = tocNode.Item.id, visibleLayers = toc.MapService.visibleLayers;
            /* If all layers were hidden, remove -1 value from array before adding visible layer ID */
            if (visibleLayers[0] === -1) { visibleLayers = []; }
            if ((this.checked) || (this.checked === "checked")) {
                tocNode.set("Visible", true);
                /* Make sure layer is not already set to visible on the map */
                if (array.indexOf(visibleLayers, layerId) === -1) {
                    if (tocNode.Item.isChild) {
                        /* This is a child layer, make sure its parent is visible before we add it to visibleLayers */
                        var parentItem = toc.LayerStore.get(tocNode.Item.parent);
                        var parentNode = toc.Nodes[parentItem.name];
                        if ((parentNode.GroupVis) && (!parentNode.Item.isChild)) { visibleLayers.push(layerId); }
                        else if ((parentNode.GroupVis) && (parentNode.Item.isChild)) {
                            var grandParent = toc.LayerStore.get(parentNode.Item.parent);
                            var grandParentNode = toc.Nodes[grandParent.name];
                            if (grandParentNode.GroupVis) { visibleLayers.push(layerId); }
                        }
                    } else { visibleLayers.push(layerId); }
                    if (visibleLayers.length === 0) { visibleLayers.push(-1); }
                    toc.MapService.setVisibleLayers(visibleLayers);
                }
            } else {
                tocNode.set("Visible", false);
                var lyrIndex = array.indexOf(visibleLayers, layerId);
                if (lyrIndex >= 0) { visibleLayers.splice(lyrIndex, 1); }
                visibleLayers = toc._handleGroupLayerVis(toc, visibleLayers);
                if (visibleLayers.length === 0) { visibleLayers.push(-1); }
                toc.MapService.setVisibleLayers(visibleLayers);
            }
        },

        _toggleGroupLayer: function (evt) {
            var tocNode = this.getParent();
            var toc = tocNode.Toc, visibleLayers = toc.MapService.visibleLayers, layerId = tocNode.Item.id;
            if ((this.checked) || (this.checked === "checked")) {
                /* If all layers were hidden, remove -1 value from array before adding visible layer ID */
                if (visibleLayers[0] === -1) { visibleLayers = []; }
                tocNode.set("GroupVis", true);
                /* Always remove group layer ID, they will interfere with child visibility settings */
                var lyrIndex = array.indexOf(visibleLayers, layerId);
                if (lyrIndex >= 0) { visibleLayers.splice(lyrIndex, 1); }
                var showChildren = false;
                /* If this group layer is also a child layer, make sure the parent layer is visible before we turn on all child layers */
                if (tocNode.Item.isChild) {
                    var parentItem = toc.LayerStore.get(tocNode.Item.parent);
                    var parentNode = toc.Nodes[parentItem.name];
                    if ((parentNode.GroupVis) && (!parentNode.Item.isChild)) { showChildren = true; }
                } else { showChildren = true; }
                if (showChildren) {
                    /* Turn on display for any child layers that are checked */
                    array.forEach(tocNode.Item.subLayers, function (child) {
                        var childVis, childNode = toc.Nodes[child.name];
                        var childIndex = array.indexOf(visibleLayers, child.id);
                        /* If this child layer is also a group layer, it does not have a Visible property */
                        if ((childNode) && (!childNode.Item.hasChildren)) { childVis = childNode.Visible; }
                        /* This layer is hidden from the legend, check its default map visibility */
                        else if (!childNode) { var childVis = toc.LayerStore.get(child.id).defaultVisibility; }
                        /* This layer needs to be added to the map */
                        if ((childVis) && (childIndex < 0)) { visibleLayers.push(child.id); }
                        /* If this child layer is also a group layer, manage subLayer visibility */
                        var subLayers = toc.LayerStore.get(child.id).subLayers;
                        if (subLayers) {
                            array.forEach(subLayers, function (sub) {
                                var subVis, subNode = toc.Nodes[sub.name];
                                var subIndex = array.indexOf(visibleLayers, sub.id);
                                if (subNode) {
                                    subVis = subNode.Visible;
                                } else { subVis = toc.LayerStore.get(sub.id).defaultVisibility; }
                                if ((subVis) && (subIndex < 0)) { visibleLayers.push(sub.id); }
                            });
                        }
                    });
                }
                if (visibleLayers.length === 0) { visibleLayers.push(-1); }
                toc.MapService.setVisibleLayers(visibleLayers);
            } else {
                tocNode.set("GroupVis", false);
                visibleLayers = toc._handleGroupLayerVis(toc, visibleLayers);
                if (visibleLayers.length === 0) { visibleLayers.push(-1); }
                toc.MapService.setVisibleLayers(visibleLayers);
            }
        },

        _toggleFeatureLayer: function (evt) {
            var tocItem = this.getParent(), mapControl = tocItem.MapControl;
            var layerId = tocItem.Item.mapID;
            if ((this.checked) || (this.checked === "checked")) {
                mapControl.getLayer(layerId).show();
            } else { mapControl.getLayer(layerId).hide(); }
        },

        _getLayerVis: function (lyrItem) {
            var mapControl = this.MapControl;
            var mapScale = mapControl.getScale(), setVis = true;
            if (((lyrItem.maxScale > 0) && (mapScale < lyrItem.maxScale)) || ((lyrItem.minScale > 0) && (mapScale > lyrItem.minScale))) { setVis = false; }
            return setVis;
        },

        _throwError: function (msg) {
            console.log(msg);
            alert("TOC Legend Error: " + msg);
            return;
        },

        postCreate: function () {
            var self = this; //console.log("load toc");
            if (!self.MapControl) { self._throwError("MapControl required"); }
            if (self.FeatureService) {
                self._loadFeatureLayers(self.FeatureLayers);
            } else if (self.MapService) {
                all([self._queryAllLayers(), self._queryLegendLayers()]).then(function (results) {
                    self._loadLegend(results, self);
                });
            } else { self._throwError("There was a problem loading the TOC Legend. \nPlease check your settings and try again."); }
            domClass.add(self.containerNode, self.className);
            if (self.Title) { domConstruct.create("h2", { innerHTML: self.Title, className: "TocTitle" }, self.domNode, 0); }
        }
    });
});