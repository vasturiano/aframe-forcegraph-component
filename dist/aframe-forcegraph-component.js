/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	/* global AFRAME */

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	var accessorFn = __webpack_require__(1);
	var ThreeForceGraph = __webpack_require__(2);

	if (ThreeForceGraph.hasOwnProperty('default')) {
	  // unwrap default export
	  ThreeForceGraph = ThreeForceGraph.default;
	}

	var parseAccessor = function(prop) {
	  var geval = eval; // Avoid using eval directly https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval
	  try {
	    var evalled = geval('(' + prop + ')');
	    if (evalled instanceof Function) {
	      prop = evalled;
	    }
	  }
	  catch (e) {} // Can't eval, not a function
	  return prop;
	};

	/**
	 * 3D Force-Directed Graph component for A-Frame.
	 */
	AFRAME.registerComponent('forcegraph', {
	  schema: {
	    jsonUrl: {type: 'string', default: ''},
	    nodes: {parse: JSON.parse, default: '[]'},
	    links: {parse: JSON.parse, default: '[]'},
	    numDimensions: {type: 'number', default: 3},
	    nodeRelSize: {type: 'number', default: 4}, // volume per val unit
	    nodeId: {type: 'string', default: 'id'},
	    nodeLabel: {parse: parseAccessor, default: 'name'},
	    nodeDesc: {parse: parseAccessor, default: 'desc'},
	    nodeVal: {parse: parseAccessor, default: 'val'},
	    nodeResolution: {type: 'number', default: 8}, // how many slice segments in the sphere's circumference
	    nodeColor: {parse: parseAccessor, default: 'color'},
	    nodeAutoColorBy: {parse: parseAccessor, default: ''}, // color nodes with the same field equally
	    nodeThreeObject: {parse: parseAccessor, default: null},
	    linkSource: {type: 'string', default: 'source'},
	    linkTarget: {type: 'string', default: 'target'},
	    linkLabel: {parse: parseAccessor, default: 'name'},
	    linkDesc: {parse: parseAccessor, default: 'desc'},
	    linkHoverPrecision: {type: 'number', default: 2},
	    linkColor: {parse: parseAccessor, default: 'color'},
	    linkAutoColorBy: {parse: parseAccessor, default: ''}, // color links with the same field equally
	    linkOpacity: {type: 'number', default: 0.2},
	    forceEngine: {type: 'string', default: 'd3'}, // 'd3' or 'ngraph'
	    d3AlphaDecay: {type: 'number', default: 0.0228},
	    d3VelocityDecay: {type: 'number', default: 0.4},
	    warmupTicks: {type: 'int', default: 0}, // how many times to tick the force engine at init before starting to render
	    cooldownTicks: {type: 'int', default: 1e18}, // Simulate infinity (int parser doesn't accept Infinity object)
	    cooldownTime: {type: 'int', default: 15000} // ms
	  },

	  init: function () {
	    var state = this.state = {}; // Internal state

	    // Add info msg
	    state.infoEl = document.createElement('a-text');
	    state.infoEl.setAttribute('position', '0 -0.1 -1'); // Canvas center
	    state.infoEl.setAttribute('width', 1);
	    state.infoEl.setAttribute('align', 'center');
	    state.infoEl.setAttribute('color', 'lavender');

	    // Setup tooltip
	    state.tooltipEl = document.createElement('a-text');
	    state.tooltipEl.setAttribute('position', '0 -0.5 -1'); // Aligned to canvas bottom
	    state.tooltipEl.setAttribute('width', 2);
	    state.tooltipEl.setAttribute('align', 'center');
	    state.tooltipEl.setAttribute('color', 'lavender');
	    state.tooltipEl.setAttribute('value', '');

	    // Setup sub-tooltip
	    state.subTooltipEl = document.createElement('a-text');
	    state.subTooltipEl.setAttribute('position', '0 -0.6 -1'); // Aligned to canvas bottom
	    state.subTooltipEl.setAttribute('width', 1.5);
	    state.subTooltipEl.setAttribute('align', 'center');
	    state.subTooltipEl.setAttribute('color', 'lavender');
	    state.subTooltipEl.setAttribute('value', '');

	    // Get camera dom element and attach fixed view elements to camera
	    var cameraEl = document.querySelector('a-entity[camera], a-camera');
	    cameraEl.appendChild(state.infoEl);
	    cameraEl.appendChild(state.tooltipEl);
	    cameraEl.appendChild(state.subTooltipEl);

	    // Keep reference to Three camera object
	    state.cameraObj = cameraEl.object3D.children
	      .filter(function(child) { return child.type === 'PerspectiveCamera' })[0];

	    // On camera switch
	    this.el.sceneEl.addEventListener('camera-set-active', function(evt) {
	      // Switch camera reference
	      state.cameraObj = evt.detail.cameraEl.components.camera.camera;
	    });

	    // setup FG object
	    this.el.object3D.add(state.forceGraph = new ThreeForceGraph());

	    state.forceGraph
	      .onLoading(function() {
	        state.infoEl.setAttribute('value', 'Loading...'); // Add loading msg
	      })
	      .onFinishLoading(function() {
	        state.infoEl.setAttribute('value', '');
	      });

	  },

	  remove: function () {
	    // Clean-up elems
	    this.state.infoEl.remove();
	    this.state.tooltipEl.remove();
	    this.state.subTooltipEl.remove();
	  },

	  update: function (oldData) {
	    var comp = this,
	      elData = this.data,
	      diff = AFRAME.utils.diff(elData, oldData);

	    var fgProps = [
	      'jsonUrl',
	      'numDimensions',
	      'nodeRelSize',
	      'nodeId',
	      'nodeVal',
	      'nodeResolution',
	      'nodeColor',
	      'nodeAutoColorBy',
	      'nodeThreeObject',
	      'linkSource',
	      'linkTarget',
	      'linkColor',
	      'linkAutoColorBy',
	      'linkOpacity',
	      'forceEngine',
	      'd3AlphaDecay',
	      'd3VelocityDecay',
	      'warmupTicks',
	      'cooldownTicks',
	      'cooldownTime'
	    ];

	    fgProps
	      .filter(function(p) { return p in diff; })
	      .forEach(function(p) { comp.state.forceGraph[p](elData[p] !== '' ? elData[p] : null); }); // Convert blank values into nulls

	    if ('nodes' in diff || 'links' in diff) {
	      comp.state.forceGraph.graphData({
	        nodes: elData.nodes,
	        links: elData.links
	      });
	    }
	  },

	  tick: function(t, td) {
	    // Update tooltip
	    var centerRaycaster = new THREE.Raycaster();
	    centerRaycaster.linePrecision = this.data.linkHoverPrecision;
	    centerRaycaster.setFromCamera(
	      new THREE.Vector2(0, 0), // Canvas center
	      this.state.cameraObj
	    );

	    var intersects = centerRaycaster.intersectObjects(this.state.forceGraph.children)
	      .filter(function(o) { // Check only node/link objects
	        return ['node', 'link'].indexOf(o.object.__graphObjType) !== -1;
	      })
	      .sort(function(a, b) { // Prioritize nodes over links
	        return isNode(b) - isNode(a);
	        function isNode(o) { return o.object.__graphObjType === 'node'; }
	      });

	    var topObject = intersects.length ? intersects[0].object : null;

	    if (topObject !== this.state.hoverObj) {
	      this.state.hoverObj = topObject;
	      this.state.tooltipEl.setAttribute('value', topObject ? accessorFn(this.data[topObject.__graphObjType + 'Label'])(topObject.__data) || '' : '' );
	      this.state.subTooltipEl.setAttribute('value', topObject ? accessorFn(this.data[topObject.__graphObjType + 'Desc'])(topObject.__data) || '' : '' );
	    }

	    // Run force-graph ticker
	    this.state.forceGraph.tickFrame();
	  }
	});


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	!function(e,t){ true?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.accessorFn=t():e.accessorFn=t()}(this,function(){return function(e){function t(o){if(n[o])return n[o].exports;var r=n[o]={i:o,l:!1,exports:{}};return e[o].call(r.exports,r,r.exports,t),r.l=!0,r.exports}var n={};return t.m=e,t.c=n,t.d=function(e,n,o){t.o(e,n)||Object.defineProperty(e,n,{configurable:!1,enumerable:!0,get:o})},t.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(n,"a",n),n},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=0)}([function(e,t,n){var o,r,u;!function(n,c){r=[e,t],void 0!==(u="function"==typeof(o=c)?o.apply(t,r):o)&&(e.exports=u)}(0,function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e){return e instanceof Function?e:"string"==typeof e?function(t){return t[e]}:function(t){return e}},e.exports=t.default})}])});

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var three = __webpack_require__(3);
	var d3Force3d = __webpack_require__(4);
	var graph = _interopDefault(__webpack_require__(11));
	var forcelayout = _interopDefault(__webpack_require__(13));
	var forcelayout3d = _interopDefault(__webpack_require__(29));
	var Kapsule = _interopDefault(__webpack_require__(52));
	var qwest = _interopDefault(__webpack_require__(53));
	var accessorFn = _interopDefault(__webpack_require__(1));
	var d3ScaleChromatic = __webpack_require__(59);
	var tinyColor = _interopDefault(__webpack_require__(62));

	var colorStr2Hex = function colorStr2Hex(str) {
	  return isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;
	};

	// Autoset attribute colorField by colorByAccessor property
	// If an object has already a color, don't set it
	// Objects can be nodes or links
	function autoColorObjects(objects, colorByAccessor, colorField) {
	  if (!colorByAccessor || typeof colorField !== 'string') return;

	  var colors = d3ScaleChromatic.schemePaired; // Paired color set from color brewer

	  var uncoloredObjects = objects.filter(function (obj) {
	    return !obj[colorField];
	  });
	  var objGroups = {};

	  uncoloredObjects.forEach(function (obj) {
	    objGroups[colorByAccessor(obj)] = null;
	  });
	  Object.keys(objGroups).forEach(function (group, idx) {
	    objGroups[group] = idx;
	  });

	  uncoloredObjects.forEach(function (obj) {
	    obj[colorField] = colors[objGroups[colorByAccessor(obj)] % colors.length];
	  });
	}

	var three$1 = window.THREE ? window.THREE // Prefer consumption from global THREE, if exists
	: {
	  SphereGeometry: three.SphereGeometry,
	  BufferGeometry: three.BufferGeometry,
	  BufferAttribute: three.BufferAttribute,
	  Mesh: three.Mesh,
	  MeshLambertMaterial: three.MeshLambertMaterial,
	  Line: three.Line,
	  LineBasicMaterial: three.LineBasicMaterial
	};

	var ngraph = { graph: graph, forcelayout: forcelayout, forcelayout3d: forcelayout3d };

	//

	var ForceGraph = Kapsule({

	  props: {
	    jsonUrl: {},
	    graphData: {
	      default: {
	        nodes: [],
	        links: []
	      },
	      onChange: function onChange(_, state) {
	        state.onFrame = null;
	      } // Pause simulation

	    },
	    numDimensions: {
	      default: 3,
	      onChange: function onChange(numDim, state) {
	        if (numDim < 3) {
	          eraseDimension(state.graphData.nodes, 'z');
	        }
	        if (numDim < 2) {
	          eraseDimension(state.graphData.nodes, 'y');
	        }

	        function eraseDimension(nodes, dim) {
	          nodes.forEach(function (d) {
	            delete d[dim]; // position
	            delete d['v' + dim]; // velocity
	          });
	        }
	      }
	    },
	    nodeRelSize: { default: 4 }, // volume per val unit
	    nodeId: { default: 'id' },
	    nodeVal: { default: 'val' },
	    nodeResolution: { default: 8 }, // how many slice segments in the sphere's circumference
	    nodeColor: { default: 'color' },
	    nodeAutoColorBy: {},
	    nodeThreeObject: {},
	    linkSource: { default: 'source' },
	    linkTarget: { default: 'target' },
	    linkColor: { default: 'color' },
	    linkAutoColorBy: {},
	    linkOpacity: { default: 0.2 },
	    forceEngine: { default: 'd3' }, // d3 or ngraph
	    d3AlphaDecay: { default: 0.0228 },
	    d3VelocityDecay: { default: 0.4 },
	    warmupTicks: { default: 0 }, // how many times to tick the force engine at init before starting to render
	    cooldownTicks: { default: Infinity },
	    cooldownTime: { default: 15000 }, // ms
	    onLoading: { default: function _default() {}, triggerUpdate: false },
	    onFinishLoading: { default: function _default() {}, triggerUpdate: false }
	  },

	  aliases: {
	    autoColorBy: 'nodeAutoColorBy'
	  },

	  methods: {
	    // Expose d3 forces for external manipulation
	    d3Force: function d3Force(state, forceName, forceFn) {
	      if (forceFn === undefined) {
	        return state.d3ForceLayout.force(forceName); // Force getter
	      }
	      state.d3ForceLayout.force(forceName, forceFn); // Force setter
	      return this;
	    },
	    tickFrame: function tickFrame(state) {
	      if (state.onFrame) state.onFrame();
	      return this;
	    }
	  },

	  stateInit: function stateInit() {
	    return {
	      d3ForceLayout: d3Force3d.forceSimulation().force('link', d3Force3d.forceLink()).force('charge', d3Force3d.forceManyBody()).force('center', d3Force3d.forceCenter()).stop()
	    };
	  },

	  init: function init(threeObj, state) {
	    // Main three object to manipulate
	    state.graphScene = threeObj;
	  },
	  update: function update(state) {
	    state.onFrame = null; // Pause simulation
	    state.onLoading();

	    if (state.graphData.nodes.length || state.graphData.links.length) {
	      console.info('force-graph loading', state.graphData.nodes.length + ' nodes', state.graphData.links.length + ' links');
	    }

	    if (!state.fetchingJson && state.jsonUrl && !state.graphData.nodes.length && !state.graphData.links.length) {
	      // (Re-)load data
	      state.fetchingJson = true;
	      qwest.get(state.jsonUrl).then(function (_, json) {
	        state.fetchingJson = false;
	        state.graphData = json;
	        state._rerender(); // Force re-update
	      });
	    }

	    if (state.nodeAutoColorBy !== null) {
	      // Auto add color to uncolored nodes
	      autoColorObjects(state.graphData.nodes, accessorFn(state.nodeAutoColorBy), state.nodeColor);
	    }
	    if (state.linkAutoColorBy !== null) {
	      // Auto add color to uncolored links
	      autoColorObjects(state.graphData.links, accessorFn(state.linkAutoColorBy), state.linkColor);
	    }

	    // parse links
	    state.graphData.links.forEach(function (link) {
	      link.source = link[state.linkSource];
	      link.target = link[state.linkTarget];
	    });

	    // Add WebGL objects
	    while (state.graphScene.children.length) {
	      state.graphScene.remove(state.graphScene.children[0]);
	    } // Clear the place

	    var customNodeObjectAccessor = accessorFn(state.nodeThreeObject);
	    var valAccessor = accessorFn(state.nodeVal);
	    var colorAccessor = accessorFn(state.nodeColor);
	    var sphereGeometries = {}; // indexed by node value
	    var sphereMaterials = {}; // indexed by color
	    state.graphData.nodes.forEach(function (node) {
	      var customObj = customNodeObjectAccessor(node);

	      var obj = void 0;
	      if (customObj) {
	        obj = customObj.clone();
	      } else {
	        // Default object (sphere mesh)
	        var val = valAccessor(node) || 1;
	        if (!sphereGeometries.hasOwnProperty(val)) {
	          sphereGeometries[val] = new three$1.SphereGeometry(Math.cbrt(val) * state.nodeRelSize, state.nodeResolution, state.nodeResolution);
	        }

	        var color = colorAccessor(node);
	        if (!sphereMaterials.hasOwnProperty(color)) {
	          sphereMaterials[color] = new three$1.MeshLambertMaterial({
	            color: colorStr2Hex(color || '#ffffaa'),
	            transparent: true,
	            opacity: 0.75
	          });
	        }

	        obj = new three$1.Mesh(sphereGeometries[val], sphereMaterials[color]);
	      }

	      obj.__graphObjType = 'node'; // Add object type
	      obj.__data = node; // Attach node data

	      state.graphScene.add(node.__threeObj = obj);
	    });

	    var linkColorAccessor = accessorFn(state.linkColor);
	    var lineMaterials = {}; // indexed by color
	    state.graphData.links.forEach(function (link) {
	      var color = linkColorAccessor(link);
	      if (!lineMaterials.hasOwnProperty(color)) {
	        lineMaterials[color] = new three$1.LineBasicMaterial({
	          color: colorStr2Hex(color || '#f0f0f0'),
	          transparent: true,
	          opacity: state.linkOpacity
	        });
	      }

	      var geometry = new three$1.BufferGeometry();
	      geometry.addAttribute('position', new three$1.BufferAttribute(new Float32Array(2 * 3), 3));
	      var lineMaterial = lineMaterials[color];
	      var line = new three$1.Line(geometry, lineMaterial);

	      line.renderOrder = 10; // Prevent visual glitches of dark lines on top of nodes by rendering them last

	      line.__graphObjType = 'link'; // Add object type
	      line.__data = link; // Attach link data

	      state.graphScene.add(link.__lineObj = line);
	    });

	    // Feed data to force-directed layout
	    var isD3Sim = state.forceEngine !== 'ngraph';
	    var layout = void 0;
	    if (isD3Sim) {
	      // D3-force
	      (layout = state.d3ForceLayout).stop().alpha(1) // re-heat the simulation
	      .alphaDecay(state.d3AlphaDecay).velocityDecay(state.d3VelocityDecay).numDimensions(state.numDimensions).nodes(state.graphData.nodes).force('link').id(function (d) {
	        return d[state.nodeId];
	      }).links(state.graphData.links);
	    } else {
	      // ngraph
	      var _graph = ngraph.graph();
	      state.graphData.nodes.forEach(function (node) {
	        _graph.addNode(node[state.nodeId]);
	      });
	      state.graphData.links.forEach(function (link) {
	        _graph.addLink(link.source, link.target);
	      });
	      layout = ngraph['forcelayout' + (state.numDimensions === 2 ? '' : '3d')](_graph);
	      layout.graph = _graph; // Attach graph reference to layout
	    }

	    for (var i = 0; i < state.warmupTicks; i++) {
	      layout[isD3Sim ? 'tick' : 'step']();
	    } // Initial ticks before starting to render

	    var cntTicks = 0;
	    var startTickTime = new Date();
	    state.onFrame = layoutTick;
	    state.onFinishLoading();

	    //

	    function layoutTick() {
	      if (++cntTicks > state.cooldownTicks || new Date() - startTickTime > state.cooldownTime) {
	        state.onFrame = null; // Stop ticking graph
	      } else {
	        layout[isD3Sim ? 'tick' : 'step'](); // Tick it
	      }

	      // Update nodes position
	      state.graphData.nodes.forEach(function (node) {
	        var obj = node.__threeObj;
	        if (!obj) return;

	        var pos = isD3Sim ? node : layout.getNodePosition(node[state.nodeId]);

	        obj.position.x = pos.x;
	        obj.position.y = pos.y || 0;
	        obj.position.z = pos.z || 0;
	      });

	      // Update links position
	      state.graphData.links.forEach(function (link) {
	        var line = link.__lineObj;
	        if (!line) return;

	        var pos = isD3Sim ? link : layout.getLinkPosition(layout.graph.getLink(link.source, link.target).id),
	            start = pos[isD3Sim ? 'source' : 'from'],
	            end = pos[isD3Sim ? 'target' : 'to'],
	            linePos = line.geometry.attributes.position;

	        linePos.array[0] = start.x;
	        linePos.array[1] = start.y || 0;
	        linePos.array[2] = start.z || 0;
	        linePos.array[3] = end.x;
	        linePos.array[4] = end.y || 0;
	        linePos.array[5] = end.z || 0;

	        linePos.needsUpdate = true;
	        line.geometry.computeBoundingSphere();
	      });
	    }
	  }
	});

	var classCallCheck = function (instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	};











	var inherits = function (subClass, superClass) {
	  if (typeof superClass !== "function" && superClass !== null) {
	    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	  }

	  subClass.prototype = Object.create(superClass && superClass.prototype, {
	    constructor: {
	      value: subClass,
	      enumerable: false,
	      writable: true,
	      configurable: true
	    }
	  });
	  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
	};











	var possibleConstructorReturn = function (self, call) {
	  if (!self) {
	    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	  }

	  return call && (typeof call === "object" || typeof call === "function") ? call : self;
	};



















	var toConsumableArray = function (arr) {
	  if (Array.isArray(arr)) {
	    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

	    return arr2;
	  } else {
	    return Array.from(arr);
	  }
	};

	function fromKapsule (kapsule) {
	  var baseClass = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Object;
	  var initKapsuleWithSelf = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	  var FromKapsule = function (_baseClass) {
	    inherits(FromKapsule, _baseClass);

	    function FromKapsule() {
	      var _ref;

	      classCallCheck(this, FromKapsule);

	      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
	        args[_key] = arguments[_key];
	      }

	      var _this = possibleConstructorReturn(this, (_ref = FromKapsule.__proto__ || Object.getPrototypeOf(FromKapsule)).call.apply(_ref, [this].concat(args)));

	      _this.__kapsuleInstance = kapsule().apply(undefined, [].concat(toConsumableArray(initKapsuleWithSelf ? [_this] : []), args));
	      return _this;
	    }

	    return FromKapsule;
	  }(baseClass);

	  // attach kapsule props/methods to class prototype


	  Object.keys(kapsule()).forEach(function (m) {
	    return FromKapsule.prototype[m] = function () {
	      var _kapsuleInstance;

	      var returnVal = (_kapsuleInstance = this.__kapsuleInstance)[m].apply(_kapsuleInstance, arguments);

	      return returnVal === this.__kapsuleInstance ? this // chain based on this class, not the kapsule obj
	      : returnVal;
	    };
	  });

	  return FromKapsule;
	}

	var threeForcegraph = fromKapsule(ForceGraph, three.Group, true);

	module.exports = threeForcegraph;


/***/ }),
/* 3 */
/***/ (function(module, exports) {

	module.exports = THREE;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	// https://github.com/vasturiano/d3-force-3d Version 1.1.0. Copyright 2018 Vasco Asturiano.
	(function (global, factory) {
		 true ? factory(exports, __webpack_require__(5), __webpack_require__(6), __webpack_require__(7), __webpack_require__(8), __webpack_require__(9), __webpack_require__(10)) :
		typeof define === 'function' && define.amd ? define(['exports', 'd3-binarytree', 'd3-quadtree', 'd3-octree', 'd3-collection', 'd3-dispatch', 'd3-timer'], factory) :
		(factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3,global.d3,global.d3,global.d3));
	}(this, (function (exports,d3Binarytree,d3Quadtree,d3Octree,d3Collection,d3Dispatch,d3Timer) { 'use strict';

	var center = function(x, y, z) {
	  var nodes;

	  if (x == null) x = 0;
	  if (y == null) y = 0;
	  if (z == null) z = 0;

	  function force() {
	    var i,
	        n = nodes.length,
	        node,
	        sx = 0,
	        sy = 0,
	        sz = 0;

	    for (i = 0; i < n; ++i) {
	      node = nodes[i], sx += node.x || 0, sy += node.y || 0, sz += node.z || 0;
	    }

	    for (sx = sx / n - x, sy = sy / n - y, sz = sz / n - z, i = 0; i < n; ++i) {
	      node = nodes[i];
	      if (sx) { node.x -= sx; }
	      if (sy) { node.y -= sy; }
	      if (sz) { node.z -= sz; }
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = +_, force) : x;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = +_, force) : y;
	  };

	  force.z = function(_) {
	    return arguments.length ? (z = +_, force) : z;
	  };

	  return force;
	};

	var constant = function(x) {
	  return function() {
	    return x;
	  };
	};

	var jiggle = function() {
	  return (Math.random() - 0.5) * 1e-6;
	};

	function x(d) {
	  return d.x + d.vx;
	}

	function y(d) {
	  return d.y + d.vy;
	}

	function z(d) {
	  return d.z + d.vz;
	}

	var collide = function(radius) {
	  var nodes,
	      nDim,
	      radii,
	      strength = 1,
	      iterations = 1;

	  if (typeof radius !== "function") radius = constant(radius == null ? 1 : +radius);

	  function force() {
	    var i, n = nodes.length,
	        tree,
	        node,
	        xi,
	        yi,
	        zi,
	        ri,
	        ri2;

	    for (var k = 0; k < iterations; ++k) {
	      tree =
	          (nDim === 1 ? d3Binarytree.binarytree(nodes, x)
	          :(nDim === 2 ? d3Quadtree.quadtree(nodes, x, y)
	          :(nDim === 3 ? d3Octree.octree(nodes, x, y, z)
	          :null
	      ))).visitAfter(prepare);

	      for (i = 0; i < n; ++i) {
	        node = nodes[i];
	        ri = radii[node.index], ri2 = ri * ri;
	        xi = node.x + node.vx;
	        if (nDim > 1) { yi = node.y + node.vy; }
	        if (nDim > 2) { zi = node.z + node.vz; }
	        tree.visit(apply);
	      }
	    }

	    function apply(treeNode, arg1, arg2, arg3, arg4, arg5, arg6) {
	      var args = [arg1, arg2, arg3, arg4, arg5, arg6];
	      var x0 = args[0],
	          y0 = args[1],
	          z0 = args[2],
	          x1 = args[nDim],
	          y1 = args[nDim+1],
	          z1 = args[nDim+2];

	      var data = treeNode.data, rj = treeNode.r, r = ri + rj;
	      if (data) {
	        if (data.index > node.index) {
	          var x = xi - data.x - data.vx,
	              y = (nDim > 1 ? yi - data.y - data.vy : 0),
	              z = (nDim > 2 ? zi - data.z - data.vz : 0),
	              l = x * x + y * y + z * z;
	          if (l < r * r) {
	            if (x === 0) x = jiggle(), l += x * x;
	            if (nDim > 1 && y === 0) y = jiggle(), l += y * y;
	            if (nDim > 2 && z === 0) z = jiggle(), l += z * z;
	            l = (r - (l = Math.sqrt(l))) / l * strength;

	            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
	            if (nDim > 1) { node.vy += (y *= l) * r; }
	            if (nDim > 2) { node.vz += (z *= l) * r; }

	            data.vx -= x * (r = 1 - r);
	            if (nDim > 1) { data.vy -= y * r; }
	            if (nDim > 2) { data.vz -= z * r; }
	          }
	        }
	        return;
	      }
	      return x0 > xi + r || x1 < xi - r
	          || (nDim > 1 && (y0 > yi + r || y1 < yi - r))
	          || (nDim > 2 && (z0 > zi + r || z1 < zi - r));
	    }
	  }

	  function prepare(treeNode) {
	    if (treeNode.data) return treeNode.r = radii[treeNode.data.index];
	    for (var i = treeNode.r = 0; i < Math.pow(2, nDim); ++i) {
	      if (treeNode[i] && treeNode[i].r > treeNode.r) {
	        treeNode.r = treeNode[i].r;
	      }
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length, node;
	    radii = new Array(n);
	    for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
	  }

	  force.initialize = function(initNodes, numDimensions) {
	    nodes = initNodes;
	    nDim = numDimensions;
	    initialize();
	  };

	  force.iterations = function(_) {
	    return arguments.length ? (iterations = +_, force) : iterations;
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = +_, force) : strength;
	  };

	  force.radius = function(_) {
	    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
	  };

	  return force;
	};

	function index(d) {
	  return d.index;
	}

	function find(nodeById, nodeId) {
	  var node = nodeById.get(nodeId);
	  if (!node) throw new Error("missing: " + nodeId);
	  return node;
	}

	var link = function(links) {
	  var id = index,
	      strength = defaultStrength,
	      strengths,
	      distance = constant(30),
	      distances,
	      nodes,
	      nDim,
	      count,
	      bias,
	      iterations = 1;

	  if (links == null) links = [];

	  function defaultStrength(link) {
	    return 1 / Math.min(count[link.source.index], count[link.target.index]);
	  }

	  function force(alpha) {
	    for (var k = 0, n = links.length; k < iterations; ++k) {
	      for (var i = 0, link, source, target, x = 0, y = 0, z = 0, l, b; i < n; ++i) {
	        link = links[i], source = link.source, target = link.target;
	        x = target.x + target.vx - source.x - source.vx || jiggle();
	        if (nDim > 1) { y = target.y + target.vy - source.y - source.vy || jiggle(); }
	        if (nDim > 2) { z = target.z + target.vz - source.z - source.vz || jiggle(); }
	        l = Math.sqrt(x * x + y * y + z * z);
	        l = (l - distances[i]) / l * alpha * strengths[i];
	        x *= l, y *= l, z *= l;

	        target.vx -= x * (b = bias[i]);
	        if (nDim > 1) { target.vy -= y * b; }
	        if (nDim > 2) { target.vz -= z * b; }

	        source.vx += x * (b = 1 - b);
	        if (nDim > 1) { source.vy += y * b; }
	        if (nDim > 2) { source.vz += z * b; }
	      }
	    }
	  }

	  function initialize() {
	    if (!nodes) return;

	    var i,
	        n = nodes.length,
	        m = links.length,
	        nodeById = d3Collection.map(nodes, id),
	        link;

	    for (i = 0, count = new Array(n); i < m; ++i) {
	      link = links[i], link.index = i;
	      if (typeof link.source !== "object") link.source = find(nodeById, link.source);
	      if (typeof link.target !== "object") link.target = find(nodeById, link.target);
	      count[link.source.index] = (count[link.source.index] || 0) + 1;
	      count[link.target.index] = (count[link.target.index] || 0) + 1;
	    }

	    for (i = 0, bias = new Array(m); i < m; ++i) {
	      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
	    }

	    strengths = new Array(m), initializeStrength();
	    distances = new Array(m), initializeDistance();
	  }

	  function initializeStrength() {
	    if (!nodes) return;

	    for (var i = 0, n = links.length; i < n; ++i) {
	      strengths[i] = +strength(links[i], i, links);
	    }
	  }

	  function initializeDistance() {
	    if (!nodes) return;

	    for (var i = 0, n = links.length; i < n; ++i) {
	      distances[i] = +distance(links[i], i, links);
	    }
	  }

	  force.initialize = function(initNodes, numDimensions) {
	    nodes = initNodes;
	    nDim = numDimensions;
	    initialize();
	  };

	  force.links = function(_) {
	    return arguments.length ? (links = _, initialize(), force) : links;
	  };

	  force.id = function(_) {
	    return arguments.length ? (id = _, force) : id;
	  };

	  force.iterations = function(_) {
	    return arguments.length ? (iterations = +_, force) : iterations;
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initializeStrength(), force) : strength;
	  };

	  force.distance = function(_) {
	    return arguments.length ? (distance = typeof _ === "function" ? _ : constant(+_), initializeDistance(), force) : distance;
	  };

	  return force;
	};

	var MAX_DIMENSIONS = 3;

	function x$1(d) {
	  return d.x;
	}

	function y$1(d) {
	  return d.y;
	}

	function z$1(d) {
	  return d.z;
	}

	var initialRadius = 10;
	var initialAngleRoll = Math.PI * (3 - Math.sqrt(5));
	var initialAngleYaw = Math.PI / 24; // Sequential

	var simulation = function(nodes, numDimensions) {
	  numDimensions = numDimensions || 2;

	  var nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(numDimensions))),
	      simulation,
	      alpha = 1,
	      alphaMin = 0.001,
	      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
	      alphaTarget = 0,
	      velocityDecay = 0.6,
	      forces = d3Collection.map(),
	      stepper = d3Timer.timer(step),
	      event = d3Dispatch.dispatch("tick", "end");

	  if (nodes == null) nodes = [];

	  function step() {
	    tick();
	    event.call("tick", simulation);
	    if (alpha < alphaMin) {
	      stepper.stop();
	      event.call("end", simulation);
	    }
	  }

	  function tick() {
	    var i, n = nodes.length, node;

	    alpha += (alphaTarget - alpha) * alphaDecay;

	    forces.each(function(force) {
	      force(alpha);
	    });

	    for (i = 0; i < n; ++i) {
	      node = nodes[i];
	      if (node.fx == null) node.x += node.vx *= velocityDecay;
	      else node.x = node.fx, node.vx = 0;
	      if (nDim > 1) {
	        if (node.fy == null) node.y += node.vy *= velocityDecay;
	        else node.y = node.fy, node.vy = 0;
	      }
	      if (nDim > 2) {
	        if (node.fz == null) node.z += node.vz *= velocityDecay;
	        else node.z = node.fz, node.vz = 0;
	      }
	    }
	  }

	  function initializeNodes() {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.index = i;
	      if (isNaN(node.x) || (nDim > 1 && isNaN(node.y)) || (nDim > 2 && isNaN(node.z))) {
	        var radius = initialRadius * (nDim > 2 ? Math.cbrt(i) : (nDim > 1 ? Math.sqrt(i) : i)),
	          rollAngle = i * initialAngleRoll,
	          yawAngle = i * initialAngleYaw;
	        node.x = radius * (nDim > 1 ? Math.cos(rollAngle) : 1);
	        if (nDim > 1) { node.y = radius * Math.sin(rollAngle); }
	        if (nDim > 2) { node.z = radius * Math.sin(yawAngle); }
	      }
	      if (isNaN(node.vx) || (nDim > 1 && isNaN(node.vy)) || (nDim > 2 && isNaN(node.vz))) {
	        node.vx = 0;
	        if (nDim > 1) { node.vy = 0; }
	        if (nDim > 2) { node.vz = 0; }
	      }
	    }
	  }

	  function initializeForce(force) {
	    if (force.initialize) force.initialize(nodes, nDim);
	    return force;
	  }

	  initializeNodes();

	  return simulation = {
	    tick: tick,

	    restart: function() {
	      return stepper.restart(step), simulation;
	    },

	    stop: function() {
	      return stepper.stop(), simulation;
	    },

	    numDimensions: function(_) {
	      return arguments.length
	          ? (nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(_))), forces.each(initializeForce), simulation)
	          : nDim;
	    },

	    nodes: function(_) {
	      return arguments.length ? (nodes = _, initializeNodes(), forces.each(initializeForce), simulation) : nodes;
	    },

	    alpha: function(_) {
	      return arguments.length ? (alpha = +_, simulation) : alpha;
	    },

	    alphaMin: function(_) {
	      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
	    },

	    alphaDecay: function(_) {
	      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
	    },

	    alphaTarget: function(_) {
	      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
	    },

	    velocityDecay: function(_) {
	      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
	    },

	    force: function(name, _) {
	      return arguments.length > 1 ? (_ == null ? forces.remove(name) : forces.set(name, initializeForce(_)), simulation) : forces.get(name);
	    },

	    find: function() {
	      var args = Array.prototype.slice.call(arguments);
	      var x = args.shift() || 0,
	          y = (nDim > 1 ? args.shift() : null) || 0,
	          z = (nDim > 2 ? args.shift() : null) || 0,
	          radius = args.shift() || Infinity;

	      var i = 0,
	          n = nodes.length,
	          dx,
	          dy,
	          dz,
	          d2,
	          node,
	          closest;

	      radius *= radius;

	      for (i = 0; i < n; ++i) {
	        node = nodes[i];
	        dx = x - node.x;
	        dy = y - (node.y || 0);
	        dz = z - (node.z ||0);
	        d2 = dx * dx + dy * dy + dz * dz;
	        if (d2 < radius) closest = node, radius = d2;
	      }

	      return closest;
	    },

	    on: function(name, _) {
	      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
	    }
	  };
	};

	var manyBody = function() {
	  var nodes,
	      nDim,
	      node,
	      alpha,
	      strength = constant(-30),
	      strengths,
	      distanceMin2 = 1,
	      distanceMax2 = Infinity,
	      theta2 = 0.81;

	  function force(_) {
	    var i,
	        n = nodes.length,
	        tree =
	            (nDim === 1 ? d3Binarytree.binarytree(nodes, x$1)
	            :(nDim === 2 ? d3Quadtree.quadtree(nodes, x$1, y$1)
	            :(nDim === 3 ? d3Octree.octree(nodes, x$1, y$1, z$1)
	            :null
	        ))).visitAfter(accumulate);

	    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length, node;
	    strengths = new Array(n);
	    for (i = 0; i < n; ++i) node = nodes[i], strengths[node.index] = +strength(node, i, nodes);
	  }

	  function accumulate(treeNode) {
	    var strength = 0, q, c, weight = 0, x, y, z, i;

	    // For internal nodes, accumulate forces from children.
	    if (treeNode.length) {
	      for (x = y = z = i = 0; i < 4; ++i) {
	        if ((q = treeNode[i]) && (c = Math.abs(q.value))) {
	          strength += q.value, weight += c, x += c * (q.x || 0), y += c * (q.y || 0), z += c * (q.z || 0);
	        }
	      }
	      treeNode.x = x / weight;
	      if (nDim > 1) { treeNode.y = y / weight; }
	      if (nDim > 2) { treeNode.z = z / weight; }
	    }

	    // For leaf nodes, accumulate forces from coincident nodes.
	    else {
	      q = treeNode;
	      q.x = q.data.x;
	      if (nDim > 1) { q.y = q.data.y; }
	      if (nDim > 2) { q.z = q.data.z; }
	      do strength += strengths[q.data.index];
	      while (q = q.next);
	    }

	    treeNode.value = strength;
	  }

	  function apply(treeNode, x1, arg1, arg2, arg3) {
	    if (!treeNode.value) return true;
	    var x2 = [arg1, arg2, arg3][nDim-1];

	    var x = treeNode.x - node.x,
	        y = (nDim > 1 ? treeNode.y - node.y : 0),
	        z = (nDim > 2 ? treeNode.z - node.z : 0),
	        w = x2 - x1,
	        l = x * x + y * y + z * z;

	    // Apply the Barnes-Hut approximation if possible.
	    // Limit forces for very close nodes; randomize direction if coincident.
	    if (w * w / theta2 < l) {
	      if (l < distanceMax2) {
	        if (x === 0) x = jiggle(), l += x * x;
	        if (nDim > 1 && y === 0) y = jiggle(), l += y * y;
	        if (nDim > 2 && z === 0) z = jiggle(), l += z * z;
	        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
	        node.vx += x * treeNode.value * alpha / l;
	        if (nDim > 1) { node.vy += y * treeNode.value * alpha / l; }
	        if (nDim > 2) { node.vz += z * treeNode.value * alpha / l; }
	      }
	      return true;
	    }

	    // Otherwise, process points directly.
	    else if (treeNode.length || l >= distanceMax2) return;

	    // Limit forces for very close nodes; randomize direction if coincident.
	    if (treeNode.data !== node || treeNode.next) {
	      if (x === 0) x = jiggle(), l += x * x;
	      if (nDim > 1 && y === 0) y = jiggle(), l += y * y;
	      if (nDim > 2 && z === 0) z = jiggle(), l += z * z;
	      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
	    }

	    do if (treeNode.data !== node) {
	      w = strengths[treeNode.data.index] * alpha / l;
	      node.vx += x * w;
	      if (nDim > 1) { node.vy += y * w; }
	      if (nDim > 2) { node.vz += z * w; }
	    } while (treeNode = treeNode.next);
	  }

	  force.initialize = function(initNodes, numDimensions) {
	    nodes = initNodes;
	    nDim = numDimensions;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.distanceMin = function(_) {
	    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
	  };

	  force.distanceMax = function(_) {
	    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
	  };

	  force.theta = function(_) {
	    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
	  };

	  return force;
	};

	var radial = function(radius, x, y, z) {
	  var nodes,
	      nDim,
	      strength = constant(0.1),
	      strengths,
	      radiuses;

	  if (typeof radius !== "function") radius = constant(+radius);
	  if (x == null) x = 0;
	  if (y == null) y = 0;
	  if (z == null) z = 0;

	  function force(alpha) {
	    for (var i = 0, n = nodes.length; i < n; ++i) {
	      var node = nodes[i],
	          dx = node.x - x || 1e-6,
	          dy = (node.y || 0) - y || 1e-6,
	          dz = (node.z || 0) - z || 1e-6,
	          r = Math.sqrt(dx * dx + dy * dy + dz * dz),
	          k = (radiuses[i] - r) * strengths[i] * alpha / r;
	      node.vx += dx * k;
	      if (nDim>1) { node.vy += dy * k; }
	      if (nDim>2) { node.vz += dz * k; }
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    radiuses = new Array(n);
	    for (i = 0; i < n; ++i) {
	      radiuses[i] = +radius(nodes[i], i, nodes);
	      strengths[i] = isNaN(radiuses[i]) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(initNodes, numDimensions) {
	    nodes = initNodes;
	    nDim = numDimensions;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.radius = function(_) {
	    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = +_, force) : x;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = +_, force) : y;
	  };

	  force.z = function(_) {
	    return arguments.length ? (z = +_, force) : z;
	  };

	  return force;
	};

	var x$2 = function(x) {
	  var strength = constant(0.1),
	      nodes,
	      strengths,
	      xz;

	  if (typeof x !== "function") x = constant(x == null ? 0 : +x);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    xz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
	  };

	  return force;
	};

	var y$2 = function(y) {
	  var strength = constant(0.1),
	      nodes,
	      strengths,
	      yz;

	  if (typeof y !== "function") y = constant(y == null ? 0 : +y);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vy += (yz[i] - node.y) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    yz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(yz[i] = +y(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = typeof _ === "function" ? _ : constant(+_), initialize(), force) : y;
	  };

	  return force;
	};

	var z$2 = function(z) {
	  var strength = constant(0.1),
	      nodes,
	      strengths,
	      zz;

	  if (typeof z !== "function") z = constant(z == null ? 0 : +z);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.vz += (zz[i] - node.z) * strengths[i] * alpha;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    zz = new Array(n);
	    for (i = 0; i < n; ++i) {
	      strengths[i] = isNaN(zz[i] = +z(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _;
	    initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.z = function(_) {
	    return arguments.length ? (z = typeof _ === "function" ? _ : constant(+_), initialize(), force) : z;
	  };

	  return force;
	};

	exports.forceCenter = center;
	exports.forceCollide = collide;
	exports.forceLink = link;
	exports.forceManyBody = manyBody;
	exports.forceRadial = radial;
	exports.forceSimulation = simulation;
	exports.forceX = x$2;
	exports.forceY = y$2;
	exports.forceZ = z$2;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	// https://github.com/vasturiano/d3-binarytree Version 0.1.2. Copyright 2017 Vasco Asturiano.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var tree_add = function(d) {
	  var x = +this._x.call(null, d);
	  return add(this.cover(x), x, d);
	};

	function add(tree, x, d) {
	  if (isNaN(x)) return tree; // ignore invalid points

	  var parent,
	      node = tree._root,
	      leaf = {data: d},
	      x0 = tree._x0,
	      x1 = tree._x1,
	      xm,
	      xp,
	      right,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return tree._root = leaf, tree;

	  // Find the existing leaf for the new point, or add it.
	  while (node.length) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (parent = node, !(node = node[i = +right])) return parent[i] = leaf, tree;
	  }

	  // Is the new point is exactly coincident with the existing point?
	  xp = +tree._x.call(null, node.data);
	  if (x === xp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

	  // Otherwise, split the leaf node until the old and new point are separated.
	  do {
	    parent = parent ? parent[i] = new Array(2) : tree._root = new Array(2);
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	  } while ((i = +right) === (j = +(xp >= xm)));
	  return parent[j] = node, parent[i] = leaf, tree;
	}

	function addAll(data) {
	  var i, n = data.length,
	      x,
	      xz = new Array(n),
	      x0 = Infinity,
	      x1 = -Infinity;

	  // Compute the points and their extent.
	  for (i = 0; i < n; ++i) {
	    if (isNaN(x = +this._x.call(null, data[i]))) continue;
	    xz[i] = x;
	    if (x < x0) x0 = x;
	    if (x > x1) x1 = x;
	  }

	  // If there were no (valid) points, inherit the existing extent.
	  if (x1 < x0) x0 = this._x0, x1 = this._x1;

	  // Expand the tree to cover the new points.
	  this.cover(x0).cover(x1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], data[i]);
	  }

	  return this;
	}

	var tree_cover = function(x) {
	  if (isNaN(x = +x)) return this; // ignore invalid points

	  var x0 = this._x0,
	      x1 = this._x1;

	  // If the binarytree has no extent, initialize them.
	  // Integer extent are necessary so that if we later double the extent,
	  // the existing half boundaries don’t change due to floating point error!
	  if (isNaN(x0)) {
	    x1 = (x0 = Math.floor(x)) + 1;
	  }

	  // Otherwise, double repeatedly to cover.
	  else if (x0 > x || x > x1) {
	    var z = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    switch (i = +(x < (x0 + x1) / 2)) {
	      case 0: {
	        do parent = new Array(2), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, x > x1);
	        break;
	      }
	      case 1: {
	        do parent = new Array(2), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, x0 > x);
	        break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  // If the binarytree covers the point already, just return.
	  else return this;

	  this._x0 = x0;
	  this._x1 = x1;
	  return this;
	};

	var tree_data = function() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	};

	var tree_extent = function(_) {
	  return arguments.length
	      ? this.cover(+_[0][0]).cover(+_[1][0])
	      : isNaN(this._x0) ? undefined : [[this._x0], [this._x1]];
	};

	var Half = function(node, x0, x1) {
	  this.node = node;
	  this.x0 = x0;
	  this.x1 = x1;
	};

	var tree_find = function(x, radius) {
	  var data,
	      x0 = this._x0,
	      x1,
	      x2,
	      x3 = this._x1,
	      halves = [],
	      node = this._root,
	      q,
	      i;

	  if (node) halves.push(new Half(node, x0, x3));
	  if (radius == null) radius = Infinity;
	  else {
	    x0 = x - radius;
	    x3 = x + radius;
	  }

	  while (q = halves.pop()) {

	    // Stop searching if this half can’t contain a closer node.
	    if (!(node = q.node)
	        || (x1 = q.x0) > x3
	        || (x2 = q.x1) < x0) continue;

	    // Bisect the current half.
	    if (node.length) {
	      var xm = (x1 + x2) / 2;

	      halves.push(
	        new Half(node[1], xm, x2),
	        new Half(node[0], x1, xm)
	      );

	      // Visit the closest half first.
	      if (i = +(x >= xm)) {
	        q = halves[halves.length - 1];
	        halves[halves.length - 1] = halves[halves.length - 1 - i];
	        halves[halves.length - 1 - i] = q;
	      }
	    }

	    // Visit this point. (Visiting coincident points isn’t necessary!)
	    else {
	      var d = Math.abs(x - +this._x.call(null, node.data));
	      if (d < radius) {
	        radius = d;
	        x0 = x - d;
	        x3 = x + d;
	        data = node.data;
	      }
	    }
	  }

	  return data;
	};

	var tree_remove = function(d) {
	  if (isNaN(x = +this._x.call(null, d))) return this; // ignore invalid points

	  var parent,
	      node = this._root,
	      retainer,
	      previous,
	      next,
	      x0 = this._x0,
	      x1 = this._x1,
	      x,
	      xm,
	      right,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return this;

	  // Find the leaf node for the point.
	  // While descending, also retain the deepest parent with a non-removed sibling.
	  if (node.length) while (true) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (!(parent = node, node = node[i = +right])) return this;
	    if (!node.length) break;
	    if (parent[(i + 1) & 1]) retainer = parent, j = i;
	  }

	  // Find the point to remove.
	  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
	  if (next = node.next) delete node.next;

	  // If there are multiple coincident points, remove just the point.
	  if (previous) return (next ? previous.next = next : delete previous.next), this;

	  // If this is the root point, remove it.
	  if (!parent) return this._root = next, this;

	  // Remove this leaf.
	  next ? parent[i] = next : delete parent[i];

	  // If the parent now contains exactly one leaf, collapse superfluous parents.
	  if ((node = parent[0] || parent[1])
	      && node === (parent[1] || parent[0])
	      && !node.length) {
	    if (retainer) retainer[j] = node;
	    else this._root = node;
	  }

	  return this;
	};

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	var tree_root = function() {
	  return this._root;
	};

	var tree_size = function() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	};

	var tree_visit = function(callback) {
	  var halves = [], q, node = this._root, child, x0, x1;
	  if (node) halves.push(new Half(node, this._x0, this._x1));
	  while (q = halves.pop()) {
	    if (!callback(node = q.node, x0 = q.x0, x1 = q.x1) && node.length) {
	      var xm = (x0 + x1) / 2;
	      if (child = node[1]) halves.push(new Half(child, xm, x1));
	      if (child = node[0]) halves.push(new Half(child, x0, xm));
	    }
	  }
	  return this;
	};

	var tree_visitAfter = function(callback) {
	  var halves = [], next = [], q;
	  if (this._root) halves.push(new Half(this._root, this._x0, this._x1));
	  while (q = halves.pop()) {
	    var node = q.node;
	    if (node.length) {
	      var child, x0 = q.x0, x1 = q.x1, xm = (x0 + x1) / 2;
	      if (child = node[0]) halves.push(new Half(child, x0, xm));
	      if (child = node[1]) halves.push(new Half(child, xm, x1));
	    }
	    next.push(q);
	  }
	  while (q = next.pop()) {
	    callback(q.node, q.x0, q.x1);
	  }
	  return this;
	};

	function defaultX(d) {
	  return d[0];
	}

	var tree_x = function(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	};

	function binarytree(nodes, x) {
	  var tree = new Binarytree(x == null ? defaultX : x, NaN, NaN);
	  return nodes == null ? tree : tree.addAll(nodes);
	}

	function Binarytree(x, x0, x1) {
	  this._x = x;
	  this._x0 = x0;
	  this._x1 = x1;
	  this._root = undefined;
	}

	function leaf_copy(leaf) {
	  var copy = {data: leaf.data}, next = copy;
	  while (leaf = leaf.next) next = next.next = {data: leaf.data};
	  return copy;
	}

	var treeProto = binarytree.prototype = Binarytree.prototype;

	treeProto.copy = function() {
	  var copy = new Binarytree(this._x, this._x0, this._x1),
	      node = this._root,
	      nodes,
	      child;

	  if (!node) return copy;

	  if (!node.length) return copy._root = leaf_copy(node), copy;

	  nodes = [{source: node, target: copy._root = new Array(2)}];
	  while (node = nodes.pop()) {
	    for (var i = 0; i < 2; ++i) {
	      if (child = node.source[i]) {
	        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(2)});
	        else node.target[i] = leaf_copy(child);
	      }
	    }
	  }

	  return copy;
	};

	treeProto.add = tree_add;
	treeProto.addAll = addAll;
	treeProto.cover = tree_cover;
	treeProto.data = tree_data;
	treeProto.extent = tree_extent;
	treeProto.find = tree_find;
	treeProto.remove = tree_remove;
	treeProto.removeAll = removeAll;
	treeProto.root = tree_root;
	treeProto.size = tree_size;
	treeProto.visit = tree_visit;
	treeProto.visitAfter = tree_visitAfter;
	treeProto.x = tree_x;

	exports.binarytree = binarytree;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-quadtree/ Version 1.0.3. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var tree_add = function(d) {
	  var x = +this._x.call(null, d),
	      y = +this._y.call(null, d);
	  return add(this.cover(x, y), x, y, d);
	};

	function add(tree, x, y, d) {
	  if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

	  var parent,
	      node = tree._root,
	      leaf = {data: d},
	      x0 = tree._x0,
	      y0 = tree._y0,
	      x1 = tree._x1,
	      y1 = tree._y1,
	      xm,
	      ym,
	      xp,
	      yp,
	      right,
	      bottom,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return tree._root = leaf, tree;

	  // Find the existing leaf for the new point, or add it.
	  while (node.length) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
	  }

	  // Is the new point is exactly coincident with the existing point?
	  xp = +tree._x.call(null, node.data);
	  yp = +tree._y.call(null, node.data);
	  if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

	  // Otherwise, split the leaf node until the old and new point are separated.
	  do {
	    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
	  return parent[j] = node, parent[i] = leaf, tree;
	}

	function addAll(data) {
	  var d, i, n = data.length,
	      x,
	      y,
	      xz = new Array(n),
	      yz = new Array(n),
	      x0 = Infinity,
	      y0 = Infinity,
	      x1 = -Infinity,
	      y1 = -Infinity;

	  // Compute the points and their extent.
	  for (i = 0; i < n; ++i) {
	    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
	    xz[i] = x;
	    yz[i] = y;
	    if (x < x0) x0 = x;
	    if (x > x1) x1 = x;
	    if (y < y0) y0 = y;
	    if (y > y1) y1 = y;
	  }

	  // If there were no (valid) points, inherit the existing extent.
	  if (x1 < x0) x0 = this._x0, x1 = this._x1;
	  if (y1 < y0) y0 = this._y0, y1 = this._y1;

	  // Expand the tree to cover the new points.
	  this.cover(x0, y0).cover(x1, y1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], yz[i], data[i]);
	  }

	  return this;
	}

	var tree_cover = function(x, y) {
	  if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

	  var x0 = this._x0,
	      y0 = this._y0,
	      x1 = this._x1,
	      y1 = this._y1;

	  // If the quadtree has no extent, initialize them.
	  // Integer extent are necessary so that if we later double the extent,
	  // the existing quadrant boundaries don’t change due to floating point error!
	  if (isNaN(x0)) {
	    x1 = (x0 = Math.floor(x)) + 1;
	    y1 = (y0 = Math.floor(y)) + 1;
	  }

	  // Otherwise, double repeatedly to cover.
	  else if (x0 > x || x > x1 || y0 > y || y > y1) {
	    var z = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    switch (i = (y < (y0 + y1) / 2) << 1 | (x < (x0 + x1) / 2)) {
	      case 0: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, y1 = y0 + z, x > x1 || y > y1);
	        break;
	      }
	      case 1: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, y1 = y0 + z, x0 > x || y > y1);
	        break;
	      }
	      case 2: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x1 = x0 + z, y0 = y1 - z, x > x1 || y0 > y);
	        break;
	      }
	      case 3: {
	        do parent = new Array(4), parent[i] = node, node = parent;
	        while (z *= 2, x0 = x1 - z, y0 = y1 - z, x0 > x || y0 > y);
	        break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  // If the quadtree covers the point already, just return.
	  else return this;

	  this._x0 = x0;
	  this._y0 = y0;
	  this._x1 = x1;
	  this._y1 = y1;
	  return this;
	};

	var tree_data = function() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	};

	var tree_extent = function(_) {
	  return arguments.length
	      ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
	      : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
	};

	var Quad = function(node, x0, y0, x1, y1) {
	  this.node = node;
	  this.x0 = x0;
	  this.y0 = y0;
	  this.x1 = x1;
	  this.y1 = y1;
	};

	var tree_find = function(x, y, radius) {
	  var data,
	      x0 = this._x0,
	      y0 = this._y0,
	      x1,
	      y1,
	      x2,
	      y2,
	      x3 = this._x1,
	      y3 = this._y1,
	      quads = [],
	      node = this._root,
	      q,
	      i;

	  if (node) quads.push(new Quad(node, x0, y0, x3, y3));
	  if (radius == null) radius = Infinity;
	  else {
	    x0 = x - radius, y0 = y - radius;
	    x3 = x + radius, y3 = y + radius;
	    radius *= radius;
	  }

	  while (q = quads.pop()) {

	    // Stop searching if this quadrant can’t contain a closer node.
	    if (!(node = q.node)
	        || (x1 = q.x0) > x3
	        || (y1 = q.y0) > y3
	        || (x2 = q.x1) < x0
	        || (y2 = q.y1) < y0) continue;

	    // Bisect the current quadrant.
	    if (node.length) {
	      var xm = (x1 + x2) / 2,
	          ym = (y1 + y2) / 2;

	      quads.push(
	        new Quad(node[3], xm, ym, x2, y2),
	        new Quad(node[2], x1, ym, xm, y2),
	        new Quad(node[1], xm, y1, x2, ym),
	        new Quad(node[0], x1, y1, xm, ym)
	      );

	      // Visit the closest quadrant first.
	      if (i = (y >= ym) << 1 | (x >= xm)) {
	        q = quads[quads.length - 1];
	        quads[quads.length - 1] = quads[quads.length - 1 - i];
	        quads[quads.length - 1 - i] = q;
	      }
	    }

	    // Visit this point. (Visiting coincident points isn’t necessary!)
	    else {
	      var dx = x - +this._x.call(null, node.data),
	          dy = y - +this._y.call(null, node.data),
	          d2 = dx * dx + dy * dy;
	      if (d2 < radius) {
	        var d = Math.sqrt(radius = d2);
	        x0 = x - d, y0 = y - d;
	        x3 = x + d, y3 = y + d;
	        data = node.data;
	      }
	    }
	  }

	  return data;
	};

	var tree_remove = function(d) {
	  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

	  var parent,
	      node = this._root,
	      retainer,
	      previous,
	      next,
	      x0 = this._x0,
	      y0 = this._y0,
	      x1 = this._x1,
	      y1 = this._y1,
	      x,
	      y,
	      xm,
	      ym,
	      right,
	      bottom,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return this;

	  // Find the leaf node for the point.
	  // While descending, also retain the deepest parent with a non-removed sibling.
	  if (node.length) while (true) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
	    if (!node.length) break;
	    if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
	  }

	  // Find the point to remove.
	  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
	  if (next = node.next) delete node.next;

	  // If there are multiple coincident points, remove just the point.
	  if (previous) return (next ? previous.next = next : delete previous.next), this;

	  // If this is the root point, remove it.
	  if (!parent) return this._root = next, this;

	  // Remove this leaf.
	  next ? parent[i] = next : delete parent[i];

	  // If the parent now contains exactly one leaf, collapse superfluous parents.
	  if ((node = parent[0] || parent[1] || parent[2] || parent[3])
	      && node === (parent[3] || parent[2] || parent[1] || parent[0])
	      && !node.length) {
	    if (retainer) retainer[j] = node;
	    else this._root = node;
	  }

	  return this;
	};

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	var tree_root = function() {
	  return this._root;
	};

	var tree_size = function() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	};

	var tree_visit = function(callback) {
	  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
	  if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
	  while (q = quads.pop()) {
	    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
	      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
	      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
	      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
	      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
	      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
	    }
	  }
	  return this;
	};

	var tree_visitAfter = function(callback) {
	  var quads = [], next = [], q;
	  if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
	  while (q = quads.pop()) {
	    var node = q.node;
	    if (node.length) {
	      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
	      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
	      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
	      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
	      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
	    }
	    next.push(q);
	  }
	  while (q = next.pop()) {
	    callback(q.node, q.x0, q.y0, q.x1, q.y1);
	  }
	  return this;
	};

	function defaultX(d) {
	  return d[0];
	}

	var tree_x = function(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	};

	function defaultY(d) {
	  return d[1];
	}

	var tree_y = function(_) {
	  return arguments.length ? (this._y = _, this) : this._y;
	};

	function quadtree(nodes, x, y) {
	  var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
	  return nodes == null ? tree : tree.addAll(nodes);
	}

	function Quadtree(x, y, x0, y0, x1, y1) {
	  this._x = x;
	  this._y = y;
	  this._x0 = x0;
	  this._y0 = y0;
	  this._x1 = x1;
	  this._y1 = y1;
	  this._root = undefined;
	}

	function leaf_copy(leaf) {
	  var copy = {data: leaf.data}, next = copy;
	  while (leaf = leaf.next) next = next.next = {data: leaf.data};
	  return copy;
	}

	var treeProto = quadtree.prototype = Quadtree.prototype;

	treeProto.copy = function() {
	  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
	      node = this._root,
	      nodes,
	      child;

	  if (!node) return copy;

	  if (!node.length) return copy._root = leaf_copy(node), copy;

	  nodes = [{source: node, target: copy._root = new Array(4)}];
	  while (node = nodes.pop()) {
	    for (var i = 0; i < 4; ++i) {
	      if (child = node.source[i]) {
	        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
	        else node.target[i] = leaf_copy(child);
	      }
	    }
	  }

	  return copy;
	};

	treeProto.add = tree_add;
	treeProto.addAll = addAll;
	treeProto.cover = tree_cover;
	treeProto.data = tree_data;
	treeProto.extent = tree_extent;
	treeProto.find = tree_find;
	treeProto.remove = tree_remove;
	treeProto.removeAll = removeAll;
	treeProto.root = tree_root;
	treeProto.size = tree_size;
	treeProto.visit = tree_visit;
	treeProto.visitAfter = tree_visitAfter;
	treeProto.x = tree_x;
	treeProto.y = tree_y;

	exports.quadtree = quadtree;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	// https://github.com/vasturiano/d3-octree Version 0.1.2. Copyright 2017 Vasco Asturiano.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var tree_add = function(d) {
	  var x = +this._x.call(null, d),
	      y = +this._y.call(null, d),
	      z = +this._z.call(null, d);
	  return add(this.cover(x, y, z), x, y, z, d);
	};

	function add(tree, x, y, z, d) {
	  if (isNaN(x) || isNaN(y) || isNaN(z)) return tree; // ignore invalid points

	  var parent,
	      node = tree._root,
	      leaf = {data: d},
	      x0 = tree._x0,
	      y0 = tree._y0,
	      z0 = tree._z0,
	      x1 = tree._x1,
	      y1 = tree._y1,
	      z1 = tree._z1,
	      xm,
	      ym,
	      zm,
	      xp,
	      yp,
	      zp,
	      right,
	      bottom,
	      deep,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return tree._root = leaf, tree;

	  // Find the existing leaf for the new point, or add it.
	  while (node.length) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
	    if (parent = node, !(node = node[i = deep << 2 | bottom << 1 | right])) return parent[i] = leaf, tree;
	  }

	  // Is the new point is exactly coincident with the existing point?
	  xp = +tree._x.call(null, node.data);
	  yp = +tree._y.call(null, node.data);
	  zp = +tree._z.call(null, node.data);
	  if (x === xp && y === yp && z === zp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

	  // Otherwise, split the leaf node until the old and new point are separated.
	  do {
	    parent = parent ? parent[i] = new Array(8) : tree._root = new Array(8);
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
	  } while ((i = deep << 2 | bottom << 1 | right) === (j = (zp >= zm) << 2 | (yp >= ym) << 1 | (xp >= xm)));
	  return parent[j] = node, parent[i] = leaf, tree;
	}

	function addAll(data) {
	  var d, i, n = data.length,
	      x,
	      y,
	      z,
	      xz = new Array(n),
	      yz = new Array(n),
	      zz = new Array(n),
	      x0 = Infinity,
	      y0 = Infinity,
	      z0 = Infinity,
	      x1 = -Infinity,
	      y1 = -Infinity,
	      z1 = -Infinity;

	  // Compute the points and their extent.
	  for (i = 0; i < n; ++i) {
	    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d)) || isNaN(z = +this._z.call(null, d))) continue;
	    xz[i] = x;
	    yz[i] = y;
	    zz[i] = z;
	    if (x < x0) x0 = x;
	    if (x > x1) x1 = x;
	    if (y < y0) y0 = y;
	    if (y > y1) y1 = y;
	    if (z < z0) z0 = z;
	    if (z > z1) z1 = z;
	  }

	  // If there were no (valid) points, inherit the existing extent.
	  if (x1 < x0) x0 = this._x0, x1 = this._x1;
	  if (y1 < y0) y0 = this._y0, y1 = this._y1;
	  if (z1 < z0) z0 = this._z0, z1 = this._z1;

	  // Expand the tree to cover the new points.
	  this.cover(x0, y0, z0).cover(x1, y1, z1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], yz[i], zz[i], data[i]);
	  }

	  return this;
	}

	var tree_cover = function(x, y, z) {
	  if (isNaN(x = +x) || isNaN(y = +y) || isNaN(z = +z)) return this; // ignore invalid points

	  var x0 = this._x0,
	      y0 = this._y0,
	      z0 = this._z0,
	      x1 = this._x1,
	      y1 = this._y1,
	      z1 = this._z1;

	  // If the octree has no extent, initialize them.
	  // Integer extent are necessary so that if we later double the extent,
	  // the existing octant boundaries don’t change due to floating point error!
	  if (isNaN(x0)) {
	    x1 = (x0 = Math.floor(x)) + 1;
	    y1 = (y0 = Math.floor(y)) + 1;
	    z1 = (z0 = Math.floor(z)) + 1;
	  }

	  // Otherwise, double repeatedly to cover.
	  else if (x0 > x || x > x1 || y0 > y || y > y1 || z0 > z || z > z1) {
	    var t = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    switch (i = (z < (z0 + z1) / 2) << 2 | (y < (y0 + y1) / 2) << 1 | (x < (x0 + x1) / 2)) {
	      case 0: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y1 = y0 + t, z1 = z0 + t, x > x1 || y > y1 || z > z1);
	        break;
	      }
	      case 1: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y1 = y0 + t, z1 = z0 + t, x0 > x || y > y1 || z > z1);
	        break;
	      }
	      case 2: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y0 = y1 - t, z1 = z0 + t, x > x1 || y0 > y || z > z1);
	        break;
	      }
	      case 3: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y0 = y1 - t, z1 = z0 + t, x0 > x || y0 > y || z > z1);
	        break;
	      }
	      case 4: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y1 = y0 + t, z0 = z1 - t, x > x1 || y > y1 || z0 > z);
	        break;
	      }
	      case 5: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y1 = y0 + t, z0 = z1 - t, x0 > x || y > y1 || z0 > z);
	        break;
	      }
	      case 6: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x1 = x0 + t, y0 = y1 - t, z0 = z1 - t, x > x1 || y0 > y || z0 > z);
	        break;
	      }
	      case 7: {
	        do parent = new Array(8), parent[i] = node, node = parent;
	        while (t *= 2, x0 = x1 - t, y0 = y1 - t, z0 = z1 - t, x0 > x || y0 > y || z0 > z);
	        break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  // If the octree covers the point already, just return.
	  else return this;

	  this._x0 = x0;
	  this._y0 = y0;
	  this._z0 = z0;
	  this._x1 = x1;
	  this._y1 = y1;
	  this._z1 = z1;
	  return this;
	};

	var tree_data = function() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	};

	var tree_extent = function(_) {
	  return arguments.length
	      ? this.cover(+_[0][0], +_[0][1], +_[0][2]).cover(+_[1][0], +_[1][1], +_[1][2])
	      : isNaN(this._x0) ? undefined : [[this._x0, this._y0, this._z0], [this._x1, this._y1, this._z1]];
	};

	var Octant = function(node, x0, y0, z0, x1, y1, z1) {
	  this.node = node;
	  this.x0 = x0;
	  this.y0 = y0;
	  this.z0 = z0;
	  this.x1 = x1;
	  this.y1 = y1;
	  this.z1 = z1;
	};

	var tree_find = function(x, y, z, radius) {
	  var data,
	      x0 = this._x0,
	      y0 = this._y0,
	      z0 = this._z0,
	      x1,
	      y1,
	      z1,
	      x2,
	      y2,
	      z2,
	      x3 = this._x1,
	      y3 = this._y1,
	      z3 = this._z1,
	      octs = [],
	      node = this._root,
	      q,
	      i;

	  if (node) octs.push(new Octant(node, x0, y0, z0, x3, y3, z3));
	  if (radius == null) radius = Infinity;
	  else {
	    x0 = x - radius, y0 = y - radius, z0 = z - radius;
	    x3 = x + radius, y3 = y + radius, z3 = z + radius;
	    radius *= radius;
	  }

	  while (q = octs.pop()) {

	    // Stop searching if this octant can’t contain a closer node.
	    if (!(node = q.node)
	        || (x1 = q.x0) > x3
	        || (y1 = q.y0) > y3
	        || (z1 = q.z0) > z3
	        || (x2 = q.x1) < x0
	        || (y2 = q.y1) < y0
	        || (z2 = q.z1) < z0) continue;

	    // Bisect the current octant.
	    if (node.length) {
	      var xm = (x1 + x2) / 2,
	          ym = (y1 + y2) / 2,
	          zm = (z1 + z2) / 2;

	      octs.push(
	        new Octant(node[7], xm, ym, zm, x2, y2, z2),
	        new Octant(node[6], x1, ym, zm, xm, y2, z2),
	        new Octant(node[5], xm, y1, zm, x2, ym, z2),
	        new Octant(node[4], x1, y1, zm, xm, ym, z2),
	        new Octant(node[3], xm, ym, z1, x2, y2, zm),
	        new Octant(node[2], x1, ym, z1, xm, y2, zm),
	        new Octant(node[1], xm, y1, z1, x2, ym, zm),
	        new Octant(node[0], x1, y1, z1, xm, ym, zm)
	      );

	      // Visit the closest octant first.
	      if (i = (z >= zm) << 2 | (y >= ym) << 1 | (x >= xm)) {
	        q = octs[octs.length - 1];
	        octs[octs.length - 1] = octs[octs.length - 1 - i];
	        octs[octs.length - 1 - i] = q;
	      }
	    }

	    // Visit this point. (Visiting coincident points isn’t necessary!)
	    else {
	      var dx = x - +this._x.call(null, node.data),
	          dy = y - +this._y.call(null, node.data),
	          dz = z - +this._z.call(null, node.data),
	          d2 = dx * dx + dy * dy + dz * dz;
	      if (d2 < radius) {
	        var d = Math.sqrt(radius = d2);
	        x0 = x - d, y0 = y - d, z0 = z - d;
	        x3 = x + d, y3 = y + d, z3 = z + d;
	        data = node.data;
	      }
	    }
	  }

	  return data;
	};

	var tree_remove = function(d) {
	  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d)) || isNaN(z = +this._z.call(null, d))) return this; // ignore invalid points

	  var parent,
	      node = this._root,
	      retainer,
	      previous,
	      next,
	      x0 = this._x0,
	      y0 = this._y0,
	      z0 = this._z0,
	      x1 = this._x1,
	      y1 = this._y1,
	      z1 = this._z1,
	      x,
	      y,
	      z,
	      xm,
	      ym,
	      zm,
	      right,
	      bottom,
	      deep,
	      i,
	      j;

	  // If the tree is empty, initialize the root as a leaf.
	  if (!node) return this;

	  // Find the leaf node for the point.
	  // While descending, also retain the deepest parent with a non-removed sibling.
	  if (node.length) while (true) {
	    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
	    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
	    if (deep = z >= (zm = (z0 + z1) / 2)) z0 = zm; else z1 = zm;
	    if (!(parent = node, node = node[i = deep << 2 | bottom << 1 | right])) return this;
	    if (!node.length) break;
	    if (parent[(i + 1) & 7] || parent[(i + 2) & 7] || parent[(i + 3) & 7] || parent[(i + 4) & 7] || parent[(i + 5) & 7] || parent[(i + 6) & 7] || parent[(i + 7) & 7]) retainer = parent, j = i;
	  }

	  // Find the point to remove.
	  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
	  if (next = node.next) delete node.next;

	  // If there are multiple coincident points, remove just the point.
	  if (previous) return (next ? previous.next = next : delete previous.next), this;

	  // If this is the root point, remove it.
	  if (!parent) return this._root = next, this;

	  // Remove this leaf.
	  next ? parent[i] = next : delete parent[i];

	  // If the parent now contains exactly one leaf, collapse superfluous parents.
	  if ((node = parent[0] || parent[1] || parent[2] || parent[3] || parent[4] || parent[5] || parent[6] || parent[7])
	      && node === (parent[7] || parent[6] || parent[5] || parent[4] || parent[3] || parent[2] || parent[1] || parent[0])
	      && !node.length) {
	    if (retainer) retainer[j] = node;
	    else this._root = node;
	  }

	  return this;
	};

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	var tree_root = function() {
	  return this._root;
	};

	var tree_size = function() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	};

	var tree_visit = function(callback) {
	  var octs = [], q, node = this._root, child, x0, y0, z0, x1, y1, z1;
	  if (node) octs.push(new Octant(node, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
	  while (q = octs.pop()) {
	    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1) && node.length) {
	      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
	      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
	      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
	      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
	      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
	      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
	      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
	      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
	      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
	    }
	  }
	  return this;
	};

	var tree_visitAfter = function(callback) {
	  var octs = [], next = [], q;
	  if (this._root) octs.push(new Octant(this._root, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1));
	  while (q = octs.pop()) {
	    var node = q.node;
	    if (node.length) {
	      var child, x0 = q.x0, y0 = q.y0, z0 = q.z0, x1 = q.x1, y1 = q.y1, z1 = q.z1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2;
	      if (child = node[0]) octs.push(new Octant(child, x0, y0, z0, xm, ym, zm));
	      if (child = node[1]) octs.push(new Octant(child, xm, y0, z0, x1, ym, zm));
	      if (child = node[2]) octs.push(new Octant(child, x0, ym, z0, xm, y1, zm));
	      if (child = node[3]) octs.push(new Octant(child, xm, ym, z0, x1, y1, zm));
	      if (child = node[4]) octs.push(new Octant(child, x0, y0, zm, xm, ym, z1));
	      if (child = node[5]) octs.push(new Octant(child, xm, y0, zm, x1, ym, z1));
	      if (child = node[6]) octs.push(new Octant(child, x0, ym, zm, xm, y1, z1));
	      if (child = node[7]) octs.push(new Octant(child, xm, ym, zm, x1, y1, z1));
	    }
	    next.push(q);
	  }
	  while (q = next.pop()) {
	    callback(q.node, q.x0, q.y0, q.z0, q.x1, q.y1, q.z1);
	  }
	  return this;
	};

	function defaultX(d) {
	  return d[0];
	}

	var tree_x = function(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	};

	function defaultY(d) {
	  return d[1];
	}

	var tree_y = function(_) {
	  return arguments.length ? (this._y = _, this) : this._y;
	};

	function defaultZ(d) {
	  return d[2];
	}

	var tree_z = function(_) {
	  return arguments.length ? (this._z = _, this) : this._z;
	};

	function octree(nodes, x, y, z) {
	  var tree = new Octree(x == null ? defaultX : x, y == null ? defaultY : y, z == null ? defaultZ : z, NaN, NaN, NaN, NaN, NaN, NaN);
	  return nodes == null ? tree : tree.addAll(nodes);
	}

	function Octree(x, y, z, x0, y0, z0, x1, y1, z1) {
	  this._x = x;
	  this._y = y;
	  this._z = z;
	  this._x0 = x0;
	  this._y0 = y0;
	  this._z0 = z0;
	  this._x1 = x1;
	  this._y1 = y1;
	  this._z1 = z1;
	  this._root = undefined;
	}

	function leaf_copy(leaf) {
	  var copy = {data: leaf.data}, next = copy;
	  while (leaf = leaf.next) next = next.next = {data: leaf.data};
	  return copy;
	}

	var treeProto = octree.prototype = Octree.prototype;

	treeProto.copy = function() {
	  var copy = new Octree(this._x, this._y, this._z, this._x0, this._y0, this._z0, this._x1, this._y1, this._z1),
	      node = this._root,
	      nodes,
	      child;

	  if (!node) return copy;

	  if (!node.length) return copy._root = leaf_copy(node), copy;

	  nodes = [{source: node, target: copy._root = new Array(8)}];
	  while (node = nodes.pop()) {
	    for (var i = 0; i < 8; ++i) {
	      if (child = node.source[i]) {
	        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(8)});
	        else node.target[i] = leaf_copy(child);
	      }
	    }
	  }

	  return copy;
	};

	treeProto.add = tree_add;
	treeProto.addAll = addAll;
	treeProto.cover = tree_cover;
	treeProto.data = tree_data;
	treeProto.extent = tree_extent;
	treeProto.find = tree_find;
	treeProto.remove = tree_remove;
	treeProto.removeAll = removeAll;
	treeProto.root = tree_root;
	treeProto.size = tree_size;
	treeProto.visit = tree_visit;
	treeProto.visitAfter = tree_visitAfter;
	treeProto.x = tree_x;
	treeProto.y = tree_y;
	treeProto.z = tree_z;

	exports.octree = octree;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-collection/ Version 1.0.4. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var prefix = "$";

	function Map() {}

	Map.prototype = map.prototype = {
	  constructor: Map,
	  has: function(key) {
	    return (prefix + key) in this;
	  },
	  get: function(key) {
	    return this[prefix + key];
	  },
	  set: function(key, value) {
	    this[prefix + key] = value;
	    return this;
	  },
	  remove: function(key) {
	    var property = prefix + key;
	    return property in this && delete this[property];
	  },
	  clear: function() {
	    for (var property in this) if (property[0] === prefix) delete this[property];
	  },
	  keys: function() {
	    var keys = [];
	    for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
	    return keys;
	  },
	  values: function() {
	    var values = [];
	    for (var property in this) if (property[0] === prefix) values.push(this[property]);
	    return values;
	  },
	  entries: function() {
	    var entries = [];
	    for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
	    return entries;
	  },
	  size: function() {
	    var size = 0;
	    for (var property in this) if (property[0] === prefix) ++size;
	    return size;
	  },
	  empty: function() {
	    for (var property in this) if (property[0] === prefix) return false;
	    return true;
	  },
	  each: function(f) {
	    for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
	  }
	};

	function map(object, f) {
	  var map = new Map;

	  // Copy constructor.
	  if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });

	  // Index array by numeric index or specified key function.
	  else if (Array.isArray(object)) {
	    var i = -1,
	        n = object.length,
	        o;

	    if (f == null) while (++i < n) map.set(i, object[i]);
	    else while (++i < n) map.set(f(o = object[i], i, object), o);
	  }

	  // Convert object to map.
	  else if (object) for (var key in object) map.set(key, object[key]);

	  return map;
	}

	var nest = function() {
	  var keys = [],
	      sortKeys = [],
	      sortValues,
	      rollup,
	      nest;

	  function apply(array, depth, createResult, setResult) {
	    if (depth >= keys.length) {
	      if (sortValues != null) array.sort(sortValues);
	      return rollup != null ? rollup(array) : array;
	    }

	    var i = -1,
	        n = array.length,
	        key = keys[depth++],
	        keyValue,
	        value,
	        valuesByKey = map(),
	        values,
	        result = createResult();

	    while (++i < n) {
	      if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
	        values.push(value);
	      } else {
	        valuesByKey.set(keyValue, [value]);
	      }
	    }

	    valuesByKey.each(function(values, key) {
	      setResult(result, key, apply(values, depth, createResult, setResult));
	    });

	    return result;
	  }

	  function entries(map$$1, depth) {
	    if (++depth > keys.length) return map$$1;
	    var array, sortKey = sortKeys[depth - 1];
	    if (rollup != null && depth >= keys.length) array = map$$1.entries();
	    else array = [], map$$1.each(function(v, k) { array.push({key: k, values: entries(v, depth)}); });
	    return sortKey != null ? array.sort(function(a, b) { return sortKey(a.key, b.key); }) : array;
	  }

	  return nest = {
	    object: function(array) { return apply(array, 0, createObject, setObject); },
	    map: function(array) { return apply(array, 0, createMap, setMap); },
	    entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
	    key: function(d) { keys.push(d); return nest; },
	    sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
	    sortValues: function(order) { sortValues = order; return nest; },
	    rollup: function(f) { rollup = f; return nest; }
	  };
	};

	function createObject() {
	  return {};
	}

	function setObject(object, key, value) {
	  object[key] = value;
	}

	function createMap() {
	  return map();
	}

	function setMap(map$$1, key, value) {
	  map$$1.set(key, value);
	}

	function Set() {}

	var proto = map.prototype;

	Set.prototype = set.prototype = {
	  constructor: Set,
	  has: proto.has,
	  add: function(value) {
	    value += "";
	    this[prefix + value] = value;
	    return this;
	  },
	  remove: proto.remove,
	  clear: proto.clear,
	  values: proto.keys,
	  size: proto.size,
	  empty: proto.empty,
	  each: proto.each
	};

	function set(object, f) {
	  var set = new Set;

	  // Copy constructor.
	  if (object instanceof Set) object.each(function(value) { set.add(value); });

	  // Otherwise, assume it’s an array.
	  else if (object) {
	    var i = -1, n = object.length;
	    if (f == null) while (++i < n) set.add(object[i]);
	    else while (++i < n) set.add(f(object[i], i, object));
	  }

	  return set;
	}

	var keys = function(map) {
	  var keys = [];
	  for (var key in map) keys.push(key);
	  return keys;
	};

	var values = function(map) {
	  var values = [];
	  for (var key in map) values.push(map[key]);
	  return values;
	};

	var entries = function(map) {
	  var entries = [];
	  for (var key in map) entries.push({key: key, value: map[key]});
	  return entries;
	};

	exports.nest = nest;
	exports.set = set;
	exports.map = map;
	exports.keys = keys;
	exports.values = values;
	exports.entries = entries;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-dispatch/ Version 1.0.3. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var noop = {value: function() {}};

	function dispatch() {
	  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
	    if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
	    _[t] = [];
	  }
	  return new Dispatch(_);
	}

	function Dispatch(_) {
	  this._ = _;
	}

	function parseTypenames(typenames, types) {
	  return typenames.trim().split(/^|\s+/).map(function(t) {
	    var name = "", i = t.indexOf(".");
	    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
	    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
	    return {type: t, name: name};
	  });
	}

	Dispatch.prototype = dispatch.prototype = {
	  constructor: Dispatch,
	  on: function(typename, callback) {
	    var _ = this._,
	        T = parseTypenames(typename + "", _),
	        t,
	        i = -1,
	        n = T.length;

	    // If no callback was specified, return the callback of the given type and name.
	    if (arguments.length < 2) {
	      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
	      return;
	    }

	    // If a type was specified, set the callback for the given type and name.
	    // Otherwise, if a null callback was specified, remove callbacks of the given name.
	    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
	    while (++i < n) {
	      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
	      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
	    }

	    return this;
	  },
	  copy: function() {
	    var copy = {}, _ = this._;
	    for (var t in _) copy[t] = _[t].slice();
	    return new Dispatch(copy);
	  },
	  call: function(type, that) {
	    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  },
	  apply: function(type, that, args) {
	    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
	  }
	};

	function get(type, name) {
	  for (var i = 0, n = type.length, c; i < n; ++i) {
	    if ((c = type[i]).name === name) {
	      return c.value;
	    }
	  }
	}

	function set(type, name, callback) {
	  for (var i = 0, n = type.length; i < n; ++i) {
	    if (type[i].name === name) {
	      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
	      break;
	    }
	  }
	  if (callback != null) type.push({name: name, value: callback});
	  return type;
	}

	exports.dispatch = dispatch;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-timer/ Version 1.0.7. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var frame = 0;
	var timeout = 0;
	var interval = 0;
	var pokeDelay = 1000;
	var taskHead;
	var taskTail;
	var clockLast = 0;
	var clockNow = 0;
	var clockSkew = 0;
	var clock = typeof performance === "object" && performance.now ? performance : Date;
	var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

	function now() {
	  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
	}

	function clearNow() {
	  clockNow = 0;
	}

	function Timer() {
	  this._call =
	  this._time =
	  this._next = null;
	}

	Timer.prototype = timer.prototype = {
	  constructor: Timer,
	  restart: function(callback, delay, time) {
	    if (typeof callback !== "function") throw new TypeError("callback is not a function");
	    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
	    if (!this._next && taskTail !== this) {
	      if (taskTail) taskTail._next = this;
	      else taskHead = this;
	      taskTail = this;
	    }
	    this._call = callback;
	    this._time = time;
	    sleep();
	  },
	  stop: function() {
	    if (this._call) {
	      this._call = null;
	      this._time = Infinity;
	      sleep();
	    }
	  }
	};

	function timer(callback, delay, time) {
	  var t = new Timer;
	  t.restart(callback, delay, time);
	  return t;
	}

	function timerFlush() {
	  now(); // Get the current time, if not already set.
	  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
	  var t = taskHead, e;
	  while (t) {
	    if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
	    t = t._next;
	  }
	  --frame;
	}

	function wake() {
	  clockNow = (clockLast = clock.now()) + clockSkew;
	  frame = timeout = 0;
	  try {
	    timerFlush();
	  } finally {
	    frame = 0;
	    nap();
	    clockNow = 0;
	  }
	}

	function poke() {
	  var now = clock.now(), delay = now - clockLast;
	  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
	}

	function nap() {
	  var t0, t1 = taskHead, t2, time = Infinity;
	  while (t1) {
	    if (t1._call) {
	      if (time > t1._time) time = t1._time;
	      t0 = t1, t1 = t1._next;
	    } else {
	      t2 = t1._next, t1._next = null;
	      t1 = t0 ? t0._next = t2 : taskHead = t2;
	    }
	  }
	  taskTail = t0;
	  sleep(time);
	}

	function sleep(time) {
	  if (frame) return; // Soonest alarm already set, or will be.
	  if (timeout) timeout = clearTimeout(timeout);
	  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
	  if (delay > 24) {
	    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
	    if (interval) interval = clearInterval(interval);
	  } else {
	    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
	    frame = 1, setFrame(wake);
	  }
	}

	var timeout$1 = function(callback, delay, time) {
	  var t = new Timer;
	  delay = delay == null ? 0 : +delay;
	  t.restart(function(elapsed) {
	    t.stop();
	    callback(elapsed + delay);
	  }, delay, time);
	  return t;
	};

	var interval$1 = function(callback, delay, time) {
	  var t = new Timer, total = delay;
	  if (delay == null) return t.restart(callback, delay, time), t;
	  delay = +delay, time = time == null ? now() : +time;
	  t.restart(function tick(elapsed) {
	    elapsed += total;
	    t.restart(tick, total += delay, time);
	    callback(elapsed);
	  }, delay, time);
	  return t;
	};

	exports.now = now;
	exports.timer = timer;
	exports.timerFlush = timerFlush;
	exports.timeout = timeout$1;
	exports.interval = interval$1;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * @fileOverview Contains definition of the core graph object.
	 */

	// TODO: need to change storage layer:
	// 1. Be able to get all nodes O(1)
	// 2. Be able to get number of links O(1)

	/**
	 * @example
	 *  var graph = require('ngraph.graph')();
	 *  graph.addNode(1);     // graph has one node.
	 *  graph.addLink(2, 3);  // now graph contains three nodes and one link.
	 *
	 */
	module.exports = createGraph;

	var eventify = __webpack_require__(12);

	/**
	 * Creates a new graph
	 */
	function createGraph(options) {
	  // Graph structure is maintained as dictionary of nodes
	  // and array of links. Each node has 'links' property which
	  // hold all links related to that node. And general links
	  // array is used to speed up all links enumeration. This is inefficient
	  // in terms of memory, but simplifies coding.
	  options = options || {};
	  if ('uniqueLinkId' in options) {
	    console.warn(
	      'ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\n' +
	      'Use `multigraph` option instead\n',
	      '\n',
	      'Note: there is also change in default behavior: From now own each graph\n'+
	      'is considered to be not a multigraph by default (each edge is unique).'
	    );

	    options.multigraph = options.uniqueLinkId;
	  }

	  // Dear reader, the non-multigraphs do not guarantee that there is only
	  // one link for a given pair of node. When this option is set to false
	  // we can save some memory and CPU (18% faster for non-multigraph);
	  if (options.multigraph === undefined) options.multigraph = false;

	  var nodes = typeof Object.create === 'function' ? Object.create(null) : {},
	    links = [],
	    // Hash of multi-edges. Used to track ids of edges between same nodes
	    multiEdges = {},
	    nodesCount = 0,
	    suspendEvents = 0,

	    forEachNode = createNodeIterator(),
	    createLink = options.multigraph ? createUniqueLink : createSingleLink,

	    // Our graph API provides means to listen to graph changes. Users can subscribe
	    // to be notified about changes in the graph by using `on` method. However
	    // in some cases they don't use it. To avoid unnecessary memory consumption
	    // we will not record graph changes until we have at least one subscriber.
	    // Code below supports this optimization.
	    //
	    // Accumulates all changes made during graph updates.
	    // Each change element contains:
	    //  changeType - one of the strings: 'add', 'remove' or 'update';
	    //  node - if change is related to node this property is set to changed graph's node;
	    //  link - if change is related to link this property is set to changed graph's link;
	    changes = [],
	    recordLinkChange = noop,
	    recordNodeChange = noop,
	    enterModification = noop,
	    exitModification = noop;

	  // this is our public API:
	  var graphPart = {
	    /**
	     * Adds node to the graph. If node with given id already exists in the graph
	     * its data is extended with whatever comes in 'data' argument.
	     *
	     * @param nodeId the node's identifier. A string or number is preferred.
	     * @param [data] additional data for the node being added. If node already
	     *   exists its data object is augmented with the new one.
	     *
	     * @return {node} The newly added node or node with given id if it already exists.
	     */
	    addNode: addNode,

	    /**
	     * Adds a link to the graph. The function always create a new
	     * link between two nodes. If one of the nodes does not exists
	     * a new node is created.
	     *
	     * @param fromId link start node id;
	     * @param toId link end node id;
	     * @param [data] additional data to be set on the new link;
	     *
	     * @return {link} The newly created link
	     */
	    addLink: addLink,

	    /**
	     * Removes link from the graph. If link does not exist does nothing.
	     *
	     * @param link - object returned by addLink() or getLinks() methods.
	     *
	     * @returns true if link was removed; false otherwise.
	     */
	    removeLink: removeLink,

	    /**
	     * Removes node with given id from the graph. If node does not exist in the graph
	     * does nothing.
	     *
	     * @param nodeId node's identifier passed to addNode() function.
	     *
	     * @returns true if node was removed; false otherwise.
	     */
	    removeNode: removeNode,

	    /**
	     * Gets node with given identifier. If node does not exist undefined value is returned.
	     *
	     * @param nodeId requested node identifier;
	     *
	     * @return {node} in with requested identifier or undefined if no such node exists.
	     */
	    getNode: getNode,

	    /**
	     * Gets number of nodes in this graph.
	     *
	     * @return number of nodes in the graph.
	     */
	    getNodesCount: function () {
	      return nodesCount;
	    },

	    /**
	     * Gets total number of links in the graph.
	     */
	    getLinksCount: function () {
	      return links.length;
	    },

	    /**
	     * Gets all links (inbound and outbound) from the node with given id.
	     * If node with given id is not found null is returned.
	     *
	     * @param nodeId requested node identifier.
	     *
	     * @return Array of links from and to requested node if such node exists;
	     *   otherwise null is returned.
	     */
	    getLinks: getLinks,

	    /**
	     * Invokes callback on each node of the graph.
	     *
	     * @param {Function(node)} callback Function to be invoked. The function
	     *   is passed one argument: visited node.
	     */
	    forEachNode: forEachNode,

	    /**
	     * Invokes callback on every linked (adjacent) node to the given one.
	     *
	     * @param nodeId Identifier of the requested node.
	     * @param {Function(node, link)} callback Function to be called on all linked nodes.
	     *   The function is passed two parameters: adjacent node and link object itself.
	     * @param oriented if true graph treated as oriented.
	     */
	    forEachLinkedNode: forEachLinkedNode,

	    /**
	     * Enumerates all links in the graph
	     *
	     * @param {Function(link)} callback Function to be called on all links in the graph.
	     *   The function is passed one parameter: graph's link object.
	     *
	     * Link object contains at least the following fields:
	     *  fromId - node id where link starts;
	     *  toId - node id where link ends,
	     *  data - additional data passed to graph.addLink() method.
	     */
	    forEachLink: forEachLink,

	    /**
	     * Suspend all notifications about graph changes until
	     * endUpdate is called.
	     */
	    beginUpdate: enterModification,

	    /**
	     * Resumes all notifications about graph changes and fires
	     * graph 'changed' event in case there are any pending changes.
	     */
	    endUpdate: exitModification,

	    /**
	     * Removes all nodes and links from the graph.
	     */
	    clear: clear,

	    /**
	     * Detects whether there is a link between two nodes.
	     * Operation complexity is O(n) where n - number of links of a node.
	     * NOTE: this function is synonim for getLink()
	     *
	     * @returns link if there is one. null otherwise.
	     */
	    hasLink: getLink,

	    /**
	     * Detects whether there is a node with given id
	     * 
	     * Operation complexity is O(1)
	     * NOTE: this function is synonim for getNode()
	     *
	     * @returns node if there is one; Falsy value otherwise.
	     */
	    hasNode: getNode,

	    /**
	     * Gets an edge between two nodes.
	     * Operation complexity is O(n) where n - number of links of a node.
	     *
	     * @param {string} fromId link start identifier
	     * @param {string} toId link end identifier
	     *
	     * @returns link if there is one. null otherwise.
	     */
	    getLink: getLink
	  };

	  // this will add `on()` and `fire()` methods.
	  eventify(graphPart);

	  monitorSubscribers();

	  return graphPart;

	  function monitorSubscribers() {
	    var realOn = graphPart.on;

	    // replace real `on` with our temporary on, which will trigger change
	    // modification monitoring:
	    graphPart.on = on;

	    function on() {
	      // now it's time to start tracking stuff:
	      graphPart.beginUpdate = enterModification = enterModificationReal;
	      graphPart.endUpdate = exitModification = exitModificationReal;
	      recordLinkChange = recordLinkChangeReal;
	      recordNodeChange = recordNodeChangeReal;

	      // this will replace current `on` method with real pub/sub from `eventify`.
	      graphPart.on = realOn;
	      // delegate to real `on` handler:
	      return realOn.apply(graphPart, arguments);
	    }
	  }

	  function recordLinkChangeReal(link, changeType) {
	    changes.push({
	      link: link,
	      changeType: changeType
	    });
	  }

	  function recordNodeChangeReal(node, changeType) {
	    changes.push({
	      node: node,
	      changeType: changeType
	    });
	  }

	  function addNode(nodeId, data) {
	    if (nodeId === undefined) {
	      throw new Error('Invalid node identifier');
	    }

	    enterModification();

	    var node = getNode(nodeId);
	    if (!node) {
	      node = new Node(nodeId, data);
	      nodesCount++;
	      recordNodeChange(node, 'add');
	    } else {
	      node.data = data;
	      recordNodeChange(node, 'update');
	    }

	    nodes[nodeId] = node;

	    exitModification();
	    return node;
	  }

	  function getNode(nodeId) {
	    return nodes[nodeId];
	  }

	  function removeNode(nodeId) {
	    var node = getNode(nodeId);
	    if (!node) {
	      return false;
	    }

	    enterModification();

	    var prevLinks = node.links;
	    if (prevLinks) {
	      node.links = null;
	      for(var i = 0; i < prevLinks.length; ++i) {
	        removeLink(prevLinks[i]);
	      }
	    }

	    delete nodes[nodeId];
	    nodesCount--;

	    recordNodeChange(node, 'remove');

	    exitModification();

	    return true;
	  }


	  function addLink(fromId, toId, data) {
	    enterModification();

	    var fromNode = getNode(fromId) || addNode(fromId);
	    var toNode = getNode(toId) || addNode(toId);

	    var link = createLink(fromId, toId, data);

	    links.push(link);

	    // TODO: this is not cool. On large graphs potentially would consume more memory.
	    addLinkToNode(fromNode, link);
	    if (fromId !== toId) {
	      // make sure we are not duplicating links for self-loops
	      addLinkToNode(toNode, link);
	    }

	    recordLinkChange(link, 'add');

	    exitModification();

	    return link;
	  }

	  function createSingleLink(fromId, toId, data) {
	    var linkId = makeLinkId(fromId, toId);
	    return new Link(fromId, toId, data, linkId);
	  }

	  function createUniqueLink(fromId, toId, data) {
	    // TODO: Get rid of this method.
	    var linkId = makeLinkId(fromId, toId);
	    var isMultiEdge = multiEdges.hasOwnProperty(linkId);
	    if (isMultiEdge || getLink(fromId, toId)) {
	      if (!isMultiEdge) {
	        multiEdges[linkId] = 0;
	      }
	      var suffix = '@' + (++multiEdges[linkId]);
	      linkId = makeLinkId(fromId + suffix, toId + suffix);
	    }

	    return new Link(fromId, toId, data, linkId);
	  }

	  function getLinks(nodeId) {
	    var node = getNode(nodeId);
	    return node ? node.links : null;
	  }

	  function removeLink(link) {
	    if (!link) {
	      return false;
	    }
	    var idx = indexOfElementInArray(link, links);
	    if (idx < 0) {
	      return false;
	    }

	    enterModification();

	    links.splice(idx, 1);

	    var fromNode = getNode(link.fromId);
	    var toNode = getNode(link.toId);

	    if (fromNode) {
	      idx = indexOfElementInArray(link, fromNode.links);
	      if (idx >= 0) {
	        fromNode.links.splice(idx, 1);
	      }
	    }

	    if (toNode) {
	      idx = indexOfElementInArray(link, toNode.links);
	      if (idx >= 0) {
	        toNode.links.splice(idx, 1);
	      }
	    }

	    recordLinkChange(link, 'remove');

	    exitModification();

	    return true;
	  }

	  function getLink(fromNodeId, toNodeId) {
	    // TODO: Use sorted links to speed this up
	    var node = getNode(fromNodeId),
	      i;
	    if (!node || !node.links) {
	      return null;
	    }

	    for (i = 0; i < node.links.length; ++i) {
	      var link = node.links[i];
	      if (link.fromId === fromNodeId && link.toId === toNodeId) {
	        return link;
	      }
	    }

	    return null; // no link.
	  }

	  function clear() {
	    enterModification();
	    forEachNode(function(node) {
	      removeNode(node.id);
	    });
	    exitModification();
	  }

	  function forEachLink(callback) {
	    var i, length;
	    if (typeof callback === 'function') {
	      for (i = 0, length = links.length; i < length; ++i) {
	        callback(links[i]);
	      }
	    }
	  }

	  function forEachLinkedNode(nodeId, callback, oriented) {
	    var node = getNode(nodeId);

	    if (node && node.links && typeof callback === 'function') {
	      if (oriented) {
	        return forEachOrientedLink(node.links, nodeId, callback);
	      } else {
	        return forEachNonOrientedLink(node.links, nodeId, callback);
	      }
	    }
	  }

	  function forEachNonOrientedLink(links, nodeId, callback) {
	    var quitFast;
	    for (var i = 0; i < links.length; ++i) {
	      var link = links[i];
	      var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;

	      quitFast = callback(nodes[linkedNodeId], link);
	      if (quitFast) {
	        return true; // Client does not need more iterations. Break now.
	      }
	    }
	  }

	  function forEachOrientedLink(links, nodeId, callback) {
	    var quitFast;
	    for (var i = 0; i < links.length; ++i) {
	      var link = links[i];
	      if (link.fromId === nodeId) {
	        quitFast = callback(nodes[link.toId], link);
	        if (quitFast) {
	          return true; // Client does not need more iterations. Break now.
	        }
	      }
	    }
	  }

	  // we will not fire anything until users of this library explicitly call `on()`
	  // method.
	  function noop() {}

	  // Enter, Exit modification allows bulk graph updates without firing events.
	  function enterModificationReal() {
	    suspendEvents += 1;
	  }

	  function exitModificationReal() {
	    suspendEvents -= 1;
	    if (suspendEvents === 0 && changes.length > 0) {
	      graphPart.fire('changed', changes);
	      changes.length = 0;
	    }
	  }

	  function createNodeIterator() {
	    // Object.keys iterator is 1.3x faster than `for in` loop.
	    // See `https://github.com/anvaka/ngraph.graph/tree/bench-for-in-vs-obj-keys`
	    // branch for perf test
	    return Object.keys ? objectKeysIterator : forInIterator;
	  }

	  function objectKeysIterator(callback) {
	    if (typeof callback !== 'function') {
	      return;
	    }

	    var keys = Object.keys(nodes);
	    for (var i = 0; i < keys.length; ++i) {
	      if (callback(nodes[keys[i]])) {
	        return true; // client doesn't want to proceed. Return.
	      }
	    }
	  }

	  function forInIterator(callback) {
	    if (typeof callback !== 'function') {
	      return;
	    }
	    var node;

	    for (node in nodes) {
	      if (callback(nodes[node])) {
	        return true; // client doesn't want to proceed. Return.
	      }
	    }
	  }
	}

	// need this for old browsers. Should this be a separate module?
	function indexOfElementInArray(element, array) {
	  if (!array) return -1;

	  if (array.indexOf) {
	    return array.indexOf(element);
	  }

	  var len = array.length,
	    i;

	  for (i = 0; i < len; i += 1) {
	    if (array[i] === element) {
	      return i;
	    }
	  }

	  return -1;
	}

	/**
	 * Internal structure to represent node;
	 */
	function Node(id, data) {
	  this.id = id;
	  this.links = null;
	  this.data = data;
	}

	function addLinkToNode(node, link) {
	  if (node.links) {
	    node.links.push(link);
	  } else {
	    node.links = [link];
	  }
	}

	/**
	 * Internal structure to represent links;
	 */
	function Link(fromId, toId, data, id) {
	  this.fromId = fromId;
	  this.toId = toId;
	  this.data = data;
	  this.id = id;
	}

	function hashCode(str) {
	  var hash = 0, i, chr, len;
	  if (str.length == 0) return hash;
	  for (i = 0, len = str.length; i < len; i++) {
	    chr   = str.charCodeAt(i);
	    hash  = ((hash << 5) - hash) + chr;
	    hash |= 0; // Convert to 32bit integer
	  }
	  return hash;
	}

	function makeLinkId(fromId, toId) {
	  return fromId.toString() + '👉 ' + toId.toString();
	}


/***/ }),
/* 12 */
/***/ (function(module, exports) {

	module.exports = function(subject) {
	  validateSubject(subject);

	  var eventsStorage = createEventsStorage(subject);
	  subject.on = eventsStorage.on;
	  subject.off = eventsStorage.off;
	  subject.fire = eventsStorage.fire;
	  return subject;
	};

	function createEventsStorage(subject) {
	  // Store all event listeners to this hash. Key is event name, value is array
	  // of callback records.
	  //
	  // A callback record consists of callback function and its optional context:
	  // { 'eventName' => [{callback: function, ctx: object}] }
	  var registeredEvents = Object.create(null);

	  return {
	    on: function (eventName, callback, ctx) {
	      if (typeof callback !== 'function') {
	        throw new Error('callback is expected to be a function');
	      }
	      var handlers = registeredEvents[eventName];
	      if (!handlers) {
	        handlers = registeredEvents[eventName] = [];
	      }
	      handlers.push({callback: callback, ctx: ctx});

	      return subject;
	    },

	    off: function (eventName, callback) {
	      var wantToRemoveAll = (typeof eventName === 'undefined');
	      if (wantToRemoveAll) {
	        // Killing old events storage should be enough in this case:
	        registeredEvents = Object.create(null);
	        return subject;
	      }

	      if (registeredEvents[eventName]) {
	        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
	        if (deleteAllCallbacksForEvent) {
	          delete registeredEvents[eventName];
	        } else {
	          var callbacks = registeredEvents[eventName];
	          for (var i = 0; i < callbacks.length; ++i) {
	            if (callbacks[i].callback === callback) {
	              callbacks.splice(i, 1);
	            }
	          }
	        }
	      }

	      return subject;
	    },

	    fire: function (eventName) {
	      var callbacks = registeredEvents[eventName];
	      if (!callbacks) {
	        return subject;
	      }

	      var fireArguments;
	      if (arguments.length > 1) {
	        fireArguments = Array.prototype.splice.call(arguments, 1);
	      }
	      for(var i = 0; i < callbacks.length; ++i) {
	        var callbackInfo = callbacks[i];
	        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
	      }

	      return subject;
	    }
	  };
	}

	function validateSubject(subject) {
	  if (!subject) {
	    throw new Error('Eventify cannot use falsy object as events subject');
	  }
	  var reservedWords = ['on', 'fire', 'off'];
	  for (var i = 0; i < reservedWords.length; ++i) {
	    if (subject.hasOwnProperty(reservedWords[i])) {
	      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
	    }
	  }
	}


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(14);

	var eventify = __webpack_require__(12);

	/**
	 * Creates force based layout for a given graph.
	 *
	 * @param {ngraph.graph} graph which needs to be laid out
	 * @param {object} physicsSettings if you need custom settings
	 * for physics simulator you can pass your own settings here. If it's not passed
	 * a default one will be created.
	 */
	function createLayout(graph, physicsSettings) {
	  if (!graph) {
	    throw new Error('Graph structure cannot be undefined');
	  }

	  var createSimulator = __webpack_require__(14);
	  var physicsSimulator = createSimulator(physicsSettings);

	  var nodeMass = defaultNodeMass
	  if (physicsSettings && typeof physicsSettings.nodeMass === 'function') {
	    nodeMass = physicsSettings.nodeMass
	  }

	  var nodeBodies = Object.create(null);
	  var springs = {};
	  var bodiesCount = 0;

	  var springTransform = physicsSimulator.settings.springTransform || noop;

	  // Initialize physics with what we have in the graph:
	  initPhysics();
	  listenToEvents();

	  var wasStable = false;

	  var api = {
	    /**
	     * Performs one step of iterative layout algorithm
	     *
	     * @returns {boolean} true if the system should be considered stable; Flase otherwise.
	     * The system is stable if no further call to `step()` can improve the layout.
	     */
	    step: function() {
	      if (bodiesCount === 0) return true; // TODO: This will never fire 'stable'

	      var lastMove = physicsSimulator.step();

	      // Save the movement in case if someone wants to query it in the step
	      // callback.
	      api.lastMove = lastMove;

	      // Allow listeners to perform low-level actions after nodes are updated.
	      api.fire('step');

	      var ratio = lastMove/bodiesCount;
	      var isStableNow = ratio <= 0.01; // TODO: The number is somewhat arbitrary...

	      if (wasStable !== isStableNow) {
	        wasStable = isStableNow;
	        onStableChanged(isStableNow);
	      }

	      return isStableNow;
	    },

	    /**
	     * For a given `nodeId` returns position
	     */
	    getNodePosition: function (nodeId) {
	      return getInitializedBody(nodeId).pos;
	    },

	    /**
	     * Sets position of a node to a given coordinates
	     * @param {string} nodeId node identifier
	     * @param {number} x position of a node
	     * @param {number} y position of a node
	     * @param {number=} z position of node (only if applicable to body)
	     */
	    setNodePosition: function (nodeId) {
	      var body = getInitializedBody(nodeId);
	      body.setPosition.apply(body, Array.prototype.slice.call(arguments, 1));
	    },

	    /**
	     * @returns {Object} Link position by link id
	     * @returns {Object.from} {x, y} coordinates of link start
	     * @returns {Object.to} {x, y} coordinates of link end
	     */
	    getLinkPosition: function (linkId) {
	      var spring = springs[linkId];
	      if (spring) {
	        return {
	          from: spring.from.pos,
	          to: spring.to.pos
	        };
	      }
	    },

	    /**
	     * @returns {Object} area required to fit in the graph. Object contains
	     * `x1`, `y1` - top left coordinates
	     * `x2`, `y2` - bottom right coordinates
	     */
	    getGraphRect: function () {
	      return physicsSimulator.getBBox();
	    },

	    /**
	     * Iterates over each body in the layout simulator and performs a callback(body, nodeId)
	     */
	    forEachBody: forEachBody,

	    /*
	     * Requests layout algorithm to pin/unpin node to its current position
	     * Pinned nodes should not be affected by layout algorithm and always
	     * remain at their position
	     */
	    pinNode: function (node, isPinned) {
	      var body = getInitializedBody(node.id);
	       body.isPinned = !!isPinned;
	    },

	    /**
	     * Checks whether given graph's node is currently pinned
	     */
	    isNodePinned: function (node) {
	      return getInitializedBody(node.id).isPinned;
	    },

	    /**
	     * Request to release all resources
	     */
	    dispose: function() {
	      graph.off('changed', onGraphChanged);
	      api.fire('disposed');
	    },

	    /**
	     * Gets physical body for a given node id. If node is not found undefined
	     * value is returned.
	     */
	    getBody: getBody,

	    /**
	     * Gets spring for a given edge.
	     *
	     * @param {string} linkId link identifer. If two arguments are passed then
	     * this argument is treated as formNodeId
	     * @param {string=} toId when defined this parameter denotes head of the link
	     * and first argument is trated as tail of the link (fromId)
	     */
	    getSpring: getSpring,

	    /**
	     * [Read only] Gets current physics simulator
	     */
	    simulator: physicsSimulator,

	    /**
	     * Gets the graph that was used for layout
	     */
	    graph: graph,

	    /**
	     * Gets amount of movement performed during last step opeartion
	     */
	    lastMove: 0
	  };

	  eventify(api);

	  return api;

	  function forEachBody(cb) {
	    Object.keys(nodeBodies).forEach(function(bodyId) {
	      cb(nodeBodies[bodyId], bodyId);
	    });
	  }

	  function getSpring(fromId, toId) {
	    var linkId;
	    if (toId === undefined) {
	      if (typeof fromId !== 'object') {
	        // assume fromId as a linkId:
	        linkId = fromId;
	      } else {
	        // assume fromId to be a link object:
	        linkId = fromId.id;
	      }
	    } else {
	      // toId is defined, should grab link:
	      var link = graph.hasLink(fromId, toId);
	      if (!link) return;
	      linkId = link.id;
	    }

	    return springs[linkId];
	  }

	  function getBody(nodeId) {
	    return nodeBodies[nodeId];
	  }

	  function listenToEvents() {
	    graph.on('changed', onGraphChanged);
	  }

	  function onStableChanged(isStable) {
	    api.fire('stable', isStable);
	  }

	  function onGraphChanged(changes) {
	    for (var i = 0; i < changes.length; ++i) {
	      var change = changes[i];
	      if (change.changeType === 'add') {
	        if (change.node) {
	          initBody(change.node.id);
	        }
	        if (change.link) {
	          initLink(change.link);
	        }
	      } else if (change.changeType === 'remove') {
	        if (change.node) {
	          releaseNode(change.node);
	        }
	        if (change.link) {
	          releaseLink(change.link);
	        }
	      }
	    }
	    bodiesCount = graph.getNodesCount();
	  }

	  function initPhysics() {
	    bodiesCount = 0;

	    graph.forEachNode(function (node) {
	      initBody(node.id);
	      bodiesCount += 1;
	    });

	    graph.forEachLink(initLink);
	  }

	  function initBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      var node = graph.getNode(nodeId);
	      if (!node) {
	        throw new Error('initBody() was called with unknown node id');
	      }

	      var pos = node.position;
	      if (!pos) {
	        var neighbors = getNeighborBodies(node);
	        pos = physicsSimulator.getBestNewBodyPosition(neighbors);
	      }

	      body = physicsSimulator.addBodyAt(pos);
	      body.id = nodeId;

	      nodeBodies[nodeId] = body;
	      updateBodyMass(nodeId);

	      if (isNodeOriginallyPinned(node)) {
	        body.isPinned = true;
	      }
	    }
	  }

	  function releaseNode(node) {
	    var nodeId = node.id;
	    var body = nodeBodies[nodeId];
	    if (body) {
	      nodeBodies[nodeId] = null;
	      delete nodeBodies[nodeId];

	      physicsSimulator.removeBody(body);
	    }
	  }

	  function initLink(link) {
	    updateBodyMass(link.fromId);
	    updateBodyMass(link.toId);

	    var fromBody = nodeBodies[link.fromId],
	        toBody  = nodeBodies[link.toId],
	        spring = physicsSimulator.addSpring(fromBody, toBody, link.length);

	    springTransform(link, spring);

	    springs[link.id] = spring;
	  }

	  function releaseLink(link) {
	    var spring = springs[link.id];
	    if (spring) {
	      var from = graph.getNode(link.fromId),
	          to = graph.getNode(link.toId);

	      if (from) updateBodyMass(from.id);
	      if (to) updateBodyMass(to.id);

	      delete springs[link.id];

	      physicsSimulator.removeSpring(spring);
	    }
	  }

	  function getNeighborBodies(node) {
	    // TODO: Could probably be done better on memory
	    var neighbors = [];
	    if (!node.links) {
	      return neighbors;
	    }
	    var maxNeighbors = Math.min(node.links.length, 2);
	    for (var i = 0; i < maxNeighbors; ++i) {
	      var link = node.links[i];
	      var otherBody = link.fromId !== node.id ? nodeBodies[link.fromId] : nodeBodies[link.toId];
	      if (otherBody && otherBody.pos) {
	        neighbors.push(otherBody);
	      }
	    }

	    return neighbors;
	  }

	  function updateBodyMass(nodeId) {
	    var body = nodeBodies[nodeId];
	    body.mass = nodeMass(nodeId);
	    if (Number.isNaN(body.mass)) {
	      throw new Error('Node mass should be a number')
	    }
	  }

	  /**
	   * Checks whether graph node has in its settings pinned attribute,
	   * which means layout algorithm cannot move it. Node can be preconfigured
	   * as pinned, if it has "isPinned" attribute, or when node.data has it.
	   *
	   * @param {Object} node a graph node to check
	   * @return {Boolean} true if node should be treated as pinned; false otherwise.
	   */
	  function isNodeOriginallyPinned(node) {
	    return (node && (node.isPinned || (node.data && node.data.isPinned)));
	  }

	  function getInitializedBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      initBody(nodeId);
	      body = nodeBodies[nodeId];
	    }
	    return body;
	  }

	  /**
	   * Calculates mass of a body, which corresponds to node with given id.
	   *
	   * @param {String|Number} nodeId identifier of a node, for which body mass needs to be calculated
	   * @returns {Number} recommended mass of the body;
	   */
	  function defaultNodeMass(nodeId) {
	    var links = graph.getLinks(nodeId);
	    if (!links) return 1;
	    return 1 + links.length / 3.0;
	  }
	}

	function noop() { }


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(15);
	  var expose = __webpack_require__(16);
	  var merge = __webpack_require__(17);
	  var eventify = __webpack_require__(12);

	  settings = merge(settings, {
	      /**
	       * Ideal length for links (springs in physical model).
	       */
	      springLength: 30,

	      /**
	       * Hook's law coefficient. 1 - solid spring.
	       */
	      springCoeff: 0.0008,

	      /**
	       * Coulomb's law coefficient. It's used to repel nodes thus should be negative
	       * if you make it positive nodes start attract each other :).
	       */
	      gravity: -1.2,

	      /**
	       * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
	       * The closer it's to 1 the more nodes algorithm will have to go through.
	       * Setting it to one makes Barnes Hut simulation no different from
	       * brute-force forces calculation (each node is considered).
	       */
	      theta: 0.8,

	      /**
	       * Drag force coefficient. Used to slow down system, thus should be less than 1.
	       * The closer it is to 0 the less tight system will be.
	       */
	      dragCoeff: 0.02,

	      /**
	       * Default time step (dt) for forces integration
	       */
	      timeStep : 20,
	  });

	  // We allow clients to override basic factory methods:
	  var createQuadTree = settings.createQuadTree || __webpack_require__(18);
	  var createBounds = settings.createBounds || __webpack_require__(23);
	  var createDragForce = settings.createDragForce || __webpack_require__(24);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(25);
	  var integrate = settings.integrator || __webpack_require__(26);
	  var createBody = settings.createBody || __webpack_require__(27);

	  var bodies = [], // Bodies in this simulation.
	      springs = [], // Springs in this simulation.
	      quadTree =  createQuadTree(settings),
	      bounds = createBounds(bodies, settings),
	      springForce = createSpringForce(settings),
	      dragForce = createDragForce(settings);

	  var totalMovement = 0; // how much movement we made on last step

	  var publicApi = {
	    /**
	     * Array of bodies, registered with current simulator
	     *
	     * Note: To add new body, use addBody() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    bodies: bodies,

	    quadTree: quadTree,

	    /**
	     * Array of springs, registered with current simulator
	     *
	     * Note: To add new spring, use addSpring() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    springs: springs,

	    /**
	     * Returns settings with which current simulator was initialized
	     */
	    settings: settings,

	    /**
	     * Performs one step of force simulation.
	     *
	     * @returns {boolean} true if system is considered stable; False otherwise.
	     */
	    step: function () {
	      accumulateForces();

	      var movement = integrate(bodies, settings.timeStep);
	      bounds.update();

	      return movement;
	    },

	    /**
	     * Adds body to the system
	     *
	     * @param {ngraph.physics.primitives.Body} body physical body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBody: function (body) {
	      if (!body) {
	        throw new Error('Body is required');
	      }
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Adds body to the system at given position
	     *
	     * @param {Object} pos position of a body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBodyAt: function (pos) {
	      if (!pos) {
	        throw new Error('Body position is required');
	      }
	      var body = createBody(pos);
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Removes body from the system
	     *
	     * @param {ngraph.physics.primitives.Body} body to remove
	     *
	     * @returns {Boolean} true if body found and removed. falsy otherwise;
	     */
	    removeBody: function (body) {
	      if (!body) { return; }

	      var idx = bodies.indexOf(body);
	      if (idx < 0) { return; }

	      bodies.splice(idx, 1);
	      if (bodies.length === 0) {
	        bounds.reset();
	      }
	      return true;
	    },

	    /**
	     * Adds a spring to this simulation.
	     *
	     * @returns {Object} - a handle for a spring. If you want to later remove
	     * spring pass it to removeSpring() method.
	     */
	    addSpring: function (body1, body2, springLength, springWeight, springCoefficient) {
	      if (!body1 || !body2) {
	        throw new Error('Cannot add null spring to force simulator');
	      }

	      if (typeof springLength !== 'number') {
	        springLength = -1; // assume global configuration
	      }

	      var spring = new Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1, springWeight);
	      springs.push(spring);

	      // TODO: could mark simulator as dirty.
	      return spring;
	    },

	    /**
	     * Returns amount of movement performed on last step() call
	     */
	    getTotalMovement: function () {
	      return totalMovement;
	    },

	    /**
	     * Removes spring from the system
	     *
	     * @param {Object} spring to remove. Spring is an object returned by addSpring
	     *
	     * @returns {Boolean} true if spring found and removed. falsy otherwise;
	     */
	    removeSpring: function (spring) {
	      if (!spring) { return; }
	      var idx = springs.indexOf(spring);
	      if (idx > -1) {
	        springs.splice(idx, 1);
	        return true;
	      }
	    },

	    getBestNewBodyPosition: function (neighbors) {
	      return bounds.getBestNewPosition(neighbors);
	    },

	    /**
	     * Returns bounding box which covers all bodies
	     */
	    getBBox: function () {
	      return bounds.box;
	    },

	    gravity: function (value) {
	      if (value !== undefined) {
	        settings.gravity = value;
	        quadTree.options({gravity: value});
	        return this;
	      } else {
	        return settings.gravity;
	      }
	    },

	    theta: function (value) {
	      if (value !== undefined) {
	        settings.theta = value;
	        quadTree.options({theta: value});
	        return this;
	      } else {
	        return settings.theta;
	      }
	    }
	  };

	  // allow settings modification via public API:
	  expose(settings, publicApi);

	  eventify(publicApi);

	  return publicApi;

	  function accumulateForces() {
	    // Accumulate forces acting on bodies.
	    var body,
	        i = bodies.length;

	    if (i) {
	      // only add bodies if there the array is not empty:
	      quadTree.insertBodies(bodies); // performance: O(n * log n)
	      while (i--) {
	        body = bodies[i];
	        // If body is pinned there is no point updating its forces - it should
	        // never move:
	        if (!body.isPinned) {
	          body.force.reset();

	          quadTree.updateBodyForce(body);
	          dragForce.update(body);
	        }
	      }
	    }

	    i = springs.length;
	    while(i--) {
	      springForce.update(springs[i]);
	    }
	  }
	};


/***/ }),
/* 15 */
/***/ (function(module, exports) {

	module.exports = Spring;

	/**
	 * Represents a physical spring. Spring connects two bodies, has rest length
	 * stiffness coefficient and optional weight
	 */
	function Spring(fromBody, toBody, length, coeff, weight) {
	    this.from = fromBody;
	    this.to = toBody;
	    this.length = length;
	    this.coeff = coeff;

	    this.weight = typeof weight === 'number' ? weight : 1;
	};


/***/ }),
/* 16 */
/***/ (function(module, exports) {

	module.exports = exposeProperties;

	/**
	 * Augments `target` object with getter/setter functions, which modify settings
	 *
	 * @example
	 *  var target = {};
	 *  exposeProperties({ age: 42}, target);
	 *  target.age(); // returns 42
	 *  target.age(24); // make age 24;
	 *
	 *  var filteredTarget = {};
	 *  exposeProperties({ age: 42, name: 'John'}, filteredTarget, ['name']);
	 *  filteredTarget.name(); // returns 'John'
	 *  filteredTarget.age === undefined; // true
	 */
	function exposeProperties(settings, target, filter) {
	  var needsFilter = Object.prototype.toString.call(filter) === '[object Array]';
	  if (needsFilter) {
	    for (var i = 0; i < filter.length; ++i) {
	      augment(settings, target, filter[i]);
	    }
	  } else {
	    for (var key in settings) {
	      augment(settings, target, key);
	    }
	  }
	}

	function augment(source, target, key) {
	  if (source.hasOwnProperty(key)) {
	    if (typeof target[key] === 'function') {
	      // this accessor is already defined. Ignore it
	      return;
	    }
	    target[key] = function (value) {
	      if (value !== undefined) {
	        source[key] = value;
	        return target;
	      }
	      return source[key];
	    }
	  }
	}


/***/ }),
/* 17 */
/***/ (function(module, exports) {

	module.exports = merge;

	/**
	 * Augments `target` with properties in `options`. Does not override
	 * target's properties if they are defined and matches expected type in 
	 * options
	 *
	 * @returns {Object} merged object
	 */
	function merge(target, options) {
	  var key;
	  if (!target) { target = {}; }
	  if (options) {
	    for (key in options) {
	      if (options.hasOwnProperty(key)) {
	        var targetHasIt = target.hasOwnProperty(key),
	            optionsValueType = typeof options[key],
	            shouldReplace = !targetHasIt || (typeof target[key] !== optionsValueType);

	        if (shouldReplace) {
	          target[key] = options[key];
	        } else if (optionsValueType === 'object') {
	          // go deep, don't care about loops here, we are simple API!:
	          target[key] = merge(target[key], options[key]);
	        }
	      }
	    }
	  }

	  return target;
	}


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This is Barnes Hut simulation algorithm for 2d case. Implementation
	 * is highly optimized (avoids recusion and gc pressure)
	 *
	 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
	 */

	module.exports = function(options) {
	  options = options || {};
	  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
	  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

	  // we require deterministic randomness here
	  var random = __webpack_require__(19).random(1984),
	    Node = __webpack_require__(20),
	    InsertStack = __webpack_require__(21),
	    isSamePosition = __webpack_require__(22);

	  var gravity = options.gravity,
	    updateQueue = [],
	    insertStack = new InsertStack(),
	    theta = options.theta,

	    nodesCache = [],
	    currentInCache = 0,
	    root = newNode();

	  return {
	    insertBodies: insertBodies,
	    /**
	     * Gets root node if its present
	     */
	    getRoot: function() {
	      return root;
	    },
	    updateBodyForce: update,
	    options: function(newOptions) {
	      if (newOptions) {
	        if (typeof newOptions.gravity === 'number') {
	          gravity = newOptions.gravity;
	        }
	        if (typeof newOptions.theta === 'number') {
	          theta = newOptions.theta;
	        }

	        return this;
	      }

	      return {
	        gravity: gravity,
	        theta: theta
	      };
	    }
	  };

	  function newNode() {
	    // To avoid pressure on GC we reuse nodes.
	    var node = nodesCache[currentInCache];
	    if (node) {
	      node.quad0 = null;
	      node.quad1 = null;
	      node.quad2 = null;
	      node.quad3 = null;
	      node.body = null;
	      node.mass = node.massX = node.massY = 0;
	      node.left = node.right = node.top = node.bottom = 0;
	    } else {
	      node = new Node();
	      nodesCache[currentInCache] = node;
	    }

	    ++currentInCache;
	    return node;
	  }

	  function update(sourceBody) {
	    var queue = updateQueue,
	      v,
	      dx,
	      dy,
	      r, fx = 0,
	      fy = 0,
	      queueLength = 1,
	      shiftIdx = 0,
	      pushIdx = 1;

	    queue[0] = root;

	    while (queueLength) {
	      var node = queue[shiftIdx],
	        body = node.body;

	      queueLength -= 1;
	      shiftIdx += 1;
	      var differentBody = (body !== sourceBody);
	      if (body && differentBody) {
	        // If the current node is a leaf node (and it is not source body),
	        // calculate the force exerted by the current node on body, and add this
	        // amount to body's net force.
	        dx = body.pos.x - sourceBody.pos.x;
	        dy = body.pos.y - sourceBody.pos.y;
	        r = Math.sqrt(dx * dx + dy * dy);

	        if (r === 0) {
	          // Poor man's protection against zero distance.
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	        }

	        // This is standard gravition force calculation but we divide
	        // by r^3 to save two operations when normalizing force vector.
	        v = gravity * body.mass * sourceBody.mass / (r * r * r);
	        fx += v * dx;
	        fy += v * dy;
	      } else if (differentBody) {
	        // Otherwise, calculate the ratio s / r,  where s is the width of the region
	        // represented by the internal node, and r is the distance between the body
	        // and the node's center-of-mass
	        dx = node.massX / node.mass - sourceBody.pos.x;
	        dy = node.massY / node.mass - sourceBody.pos.y;
	        r = Math.sqrt(dx * dx + dy * dy);

	        if (r === 0) {
	          // Sorry about code duplucation. I don't want to create many functions
	          // right away. Just want to see performance first.
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	        }
	        // If s / r < θ, treat this internal node as a single body, and calculate the
	        // force it exerts on sourceBody, and add this amount to sourceBody's net force.
	        if ((node.right - node.left) / r < theta) {
	          // in the if statement above we consider node's width only
	          // because the region was squarified during tree creation.
	          // Thus there is no difference between using width or height.
	          v = gravity * node.mass * sourceBody.mass / (r * r * r);
	          fx += v * dx;
	          fy += v * dy;
	        } else {
	          // Otherwise, run the procedure recursively on each of the current node's children.

	          // I intentionally unfolded this loop, to save several CPU cycles.
	          if (node.quad0) {
	            queue[pushIdx] = node.quad0;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	          if (node.quad1) {
	            queue[pushIdx] = node.quad1;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	          if (node.quad2) {
	            queue[pushIdx] = node.quad2;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	          if (node.quad3) {
	            queue[pushIdx] = node.quad3;
	            queueLength += 1;
	            pushIdx += 1;
	          }
	        }
	      }
	    }

	    sourceBody.force.x += fx;
	    sourceBody.force.y += fy;
	  }

	  function insertBodies(bodies) {
	    var x1 = Number.MAX_VALUE,
	      y1 = Number.MAX_VALUE,
	      x2 = Number.MIN_VALUE,
	      y2 = Number.MIN_VALUE,
	      i,
	      max = bodies.length;

	    // To reduce quad tree depth we are looking for exact bounding box of all particles.
	    i = max;
	    while (i--) {
	      var x = bodies[i].pos.x;
	      var y = bodies[i].pos.y;
	      if (x < x1) {
	        x1 = x;
	      }
	      if (x > x2) {
	        x2 = x;
	      }
	      if (y < y1) {
	        y1 = y;
	      }
	      if (y > y2) {
	        y2 = y;
	      }
	    }

	    // Squarify the bounds.
	    var dx = x2 - x1,
	      dy = y2 - y1;
	    if (dx > dy) {
	      y2 = y1 + dx;
	    } else {
	      x2 = x1 + dy;
	    }

	    currentInCache = 0;
	    root = newNode();
	    root.left = x1;
	    root.right = x2;
	    root.top = y1;
	    root.bottom = y2;

	    i = max - 1;
	    if (i >= 0) {
	      root.body = bodies[i];
	    }
	    while (i--) {
	      insert(bodies[i], root);
	    }
	  }

	  function insert(newBody) {
	    insertStack.reset();
	    insertStack.push(root, newBody);

	    while (!insertStack.isEmpty()) {
	      var stackItem = insertStack.pop(),
	        node = stackItem.node,
	        body = stackItem.body;

	      if (!node.body) {
	        // This is internal node. Update the total mass of the node and center-of-mass.
	        var x = body.pos.x;
	        var y = body.pos.y;
	        node.mass = node.mass + body.mass;
	        node.massX = node.massX + body.mass * x;
	        node.massY = node.massY + body.mass * y;

	        // Recursively insert the body in the appropriate quadrant.
	        // But first find the appropriate quadrant.
	        var quadIdx = 0, // Assume we are in the 0's quad.
	          left = node.left,
	          right = (node.right + left) / 2,
	          top = node.top,
	          bottom = (node.bottom + top) / 2;

	        if (x > right) { // somewhere in the eastern part.
	          quadIdx = quadIdx + 1;
	          left = right;
	          right = node.right;
	        }
	        if (y > bottom) { // and in south.
	          quadIdx = quadIdx + 2;
	          top = bottom;
	          bottom = node.bottom;
	        }

	        var child = getChild(node, quadIdx);
	        if (!child) {
	          // The node is internal but this quadrant is not taken. Add
	          // subnode to it.
	          child = newNode();
	          child.left = left;
	          child.top = top;
	          child.right = right;
	          child.bottom = bottom;
	          child.body = body;

	          setChild(node, quadIdx, child);
	        } else {
	          // continue searching in this quadrant.
	          insertStack.push(child, body);
	        }
	      } else {
	        // We are trying to add to the leaf node.
	        // We have to convert current leaf into internal node
	        // and continue adding two nodes.
	        var oldBody = node.body;
	        node.body = null; // internal nodes do not cary bodies

	        if (isSamePosition(oldBody.pos, body.pos)) {
	          // Prevent infinite subdivision by bumping one node
	          // anywhere in this quadrant
	          var retriesCount = 3;
	          do {
	            var offset = random.nextDouble();
	            var dx = (node.right - node.left) * offset;
	            var dy = (node.bottom - node.top) * offset;

	            oldBody.pos.x = node.left + dx;
	            oldBody.pos.y = node.top + dy;
	            retriesCount -= 1;
	            // Make sure we don't bump it out of the box. If we do, next iteration should fix it
	          } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

	          if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
	            // This is very bad, we ran out of precision.
	            // if we do not return from the method we'll get into
	            // infinite loop here. So we sacrifice correctness of layout, and keep the app running
	            // Next layout iteration should get larger bounding box in the first step and fix this
	            return;
	          }
	        }
	        // Next iteration should subdivide node further.
	        insertStack.push(node, oldBody);
	        insertStack.push(node, body);
	      }
	    }
	  }
	};

	function getChild(node, idx) {
	  if (idx === 0) return node.quad0;
	  if (idx === 1) return node.quad1;
	  if (idx === 2) return node.quad2;
	  if (idx === 3) return node.quad3;
	  return null;
	}

	function setChild(node, idx, child) {
	  if (idx === 0) node.quad0 = child;
	  else if (idx === 1) node.quad1 = child;
	  else if (idx === 2) node.quad2 = child;
	  else if (idx === 3) node.quad3 = child;
	}


/***/ }),
/* 19 */
/***/ (function(module, exports) {

	module.exports = {
	  random: random,
	  randomIterator: randomIterator
	};

	/**
	 * Creates seeded PRNG with two methods:
	 *   next() and nextDouble()
	 */
	function random(inputSeed) {
	  var seed = typeof inputSeed === 'number' ? inputSeed : (+ new Date());
	  var randomFunc = function() {
	      // Robert Jenkins' 32 bit integer hash function.
	      seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
	      seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
	      seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
	      seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
	      seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
	      seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
	      return (seed & 0xfffffff) / 0x10000000;
	  };

	  return {
	      /**
	       * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
	       *
	       * @param maxValue Number REQUIRED. Ommitting this number will result in NaN values from PRNG.
	       */
	      next : function (maxValue) {
	          return Math.floor(randomFunc() * maxValue);
	      },

	      /**
	       * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
	       * This function is the same as Math.random() (except that it could be seeded)
	       */
	      nextDouble : function () {
	          return randomFunc();
	      }
	  };
	}

	/*
	 * Creates iterator over array, which returns items of array in random order
	 * Time complexity is guaranteed to be O(n);
	 */
	function randomIterator(array, customRandom) {
	    var localRandom = customRandom || random();
	    if (typeof localRandom.next !== 'function') {
	      throw new Error('customRandom does not match expected API: next() function is missing');
	    }

	    return {
	        forEach : function (callback) {
	            var i, j, t;
	            for (i = array.length - 1; i > 0; --i) {
	                j = localRandom.next(i + 1); // i inclusive
	                t = array[j];
	                array[j] = array[i];
	                array[i] = t;

	                callback(t);
	            }

	            if (array.length) {
	                callback(array[0]);
	            }
	        },

	        /**
	         * Shuffles array randomly, in place.
	         */
	        shuffle : function () {
	            var i, j, t;
	            for (i = array.length - 1; i > 0; --i) {
	                j = localRandom.next(i + 1); // i inclusive
	                t = array[j];
	                array[j] = array[i];
	                array[i] = t;
	            }

	            return array;
	        }
	    };
	}


/***/ }),
/* 20 */
/***/ (function(module, exports) {

	/**
	 * Internal data structure to represent 2D QuadTree node
	 */
	module.exports = function Node() {
	  // body stored inside this node. In quad tree only leaf nodes (by construction)
	  // contain boides:
	  this.body = null;

	  // Child nodes are stored in quads. Each quad is presented by number:
	  // 0 | 1
	  // -----
	  // 2 | 3
	  this.quad0 = null;
	  this.quad1 = null;
	  this.quad2 = null;
	  this.quad3 = null;

	  // Total mass of current node
	  this.mass = 0;

	  // Center of mass coordinates
	  this.massX = 0;
	  this.massY = 0;

	  // bounding box coordinates
	  this.left = 0;
	  this.top = 0;
	  this.bottom = 0;
	  this.right = 0;
	};


/***/ }),
/* 21 */
/***/ (function(module, exports) {

	module.exports = InsertStack;

	/**
	 * Our implmentation of QuadTree is non-recursive to avoid GC hit
	 * This data structure represent stack of elements
	 * which we are trying to insert into quad tree.
	 */
	function InsertStack () {
	    this.stack = [];
	    this.popIdx = 0;
	}

	InsertStack.prototype = {
	    isEmpty: function() {
	        return this.popIdx === 0;
	    },
	    push: function (node, body) {
	        var item = this.stack[this.popIdx];
	        if (!item) {
	            // we are trying to avoid memory pressue: create new element
	            // only when absolutely necessary
	            this.stack[this.popIdx] = new InsertStackElement(node, body);
	        } else {
	            item.node = node;
	            item.body = body;
	        }
	        ++this.popIdx;
	    },
	    pop: function () {
	        if (this.popIdx > 0) {
	            return this.stack[--this.popIdx];
	        }
	    },
	    reset: function () {
	        this.popIdx = 0;
	    }
	};

	function InsertStackElement(node, body) {
	    this.node = node; // QuadTree node
	    this.body = body; // physical body which needs to be inserted to node
	}


/***/ }),
/* 22 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);

	    return (dx < 1e-8 && dy < 1e-8);
	};


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(19).random(42);
	  var boundingBox =  { x1: 0, y1: 0, x2: 0, y2: 0 };

	  return {
	    box: boundingBox,

	    update: updateBoundingBox,

	    reset : function () {
	      boundingBox.x1 = boundingBox.y1 = 0;
	      boundingBox.x2 = boundingBox.y2 = 0;
	    },

	    getBestNewPosition: function (neighbors) {
	      var graphRect = boundingBox;

	      var baseX = 0, baseY = 0;

	      if (neighbors.length) {
	        for (var i = 0; i < neighbors.length; ++i) {
	          baseX += neighbors[i].pos.x;
	          baseY += neighbors[i].pos.y;
	        }

	        baseX /= neighbors.length;
	        baseY /= neighbors.length;
	      } else {
	        baseX = (graphRect.x1 + graphRect.x2) / 2;
	        baseY = (graphRect.y1 + graphRect.y2) / 2;
	      }

	      var springLength = settings.springLength;
	      return {
	        x: baseX + random.next(springLength) - springLength / 2,
	        y: baseY + random.next(springLength) - springLength / 2
	      };
	    }
	  };

	  function updateBoundingBox() {
	    var i = bodies.length;
	    if (i === 0) { return; } // don't have to wory here.

	    var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE;

	    while(i--) {
	      // this is O(n), could it be done faster with quadtree?
	      // how about pinned nodes?
	      var body = bodies[i];
	      if (body.isPinned) {
	        body.pos.x = body.prevPos.x;
	        body.pos.y = body.prevPos.y;
	      } else {
	        body.prevPos.x = body.pos.x;
	        body.prevPos.y = body.pos.y;
	      }
	      if (body.pos.x < x1) {
	        x1 = body.pos.x;
	      }
	      if (body.pos.x > x2) {
	        x2 = body.pos.x;
	      }
	      if (body.pos.y < y1) {
	        y1 = body.pos.y;
	      }
	      if (body.pos.y > y2) {
	        y2 = body.pos.y;
	      }
	    }

	    boundingBox.x1 = x1;
	    boundingBox.x2 = x2;
	    boundingBox.y1 = y1;
	    boundingBox.y2 = y2;
	  }
	}


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(17),
	      expose = __webpack_require__(16);

	  options = merge(options, {
	    dragCoeff: 0.02
	  });

	  var api = {
	    update : function (body) {
	      body.force.x -= options.dragCoeff * body.velocity.x;
	      body.force.y -= options.dragCoeff * body.velocity.y;
	    }
	  };

	  // let easy access to dragCoeff:
	  expose(options, api, ['dragCoeff']);

	  return api;
	};


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents spring force, which updates forces acting on two bodies, conntected
	 * by a spring.
	 *
	 * @param {Object} options for the spring force
	 * @param {Number=} options.springCoeff spring force coefficient.
	 * @param {Number=} options.springLength desired length of a spring at rest.
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(17);
	  var random = __webpack_require__(19).random(42);
	  var expose = __webpack_require__(16);

	  options = merge(options, {
	    springCoeff: 0.0002,
	    springLength: 80
	  });

	  var api = {
	    /**
	     * Upsates forces acting on a spring
	     */
	    update : function (spring) {
	      var body1 = spring.from,
	          body2 = spring.to,
	          length = spring.length < 0 ? options.springLength : spring.length,
	          dx = body2.pos.x - body1.pos.x,
	          dy = body2.pos.y - body1.pos.y,
	          r = Math.sqrt(dx * dx + dy * dy);

	      if (r === 0) {
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	      }

	      var d = r - length;
	      var coeff = ((!spring.coeff || spring.coeff < 0) ? options.springCoeff : spring.coeff) * d / r * spring.weight;

	      body1.force.x += coeff * dx;
	      body1.force.y += coeff * dy;

	      body2.force.x -= coeff * dx;
	      body2.force.y -= coeff * dy;
	    }
	  };

	  expose(options, api, ['springCoeff', 'springLength']);
	  return api;
	}


/***/ }),
/* 26 */
/***/ (function(module, exports) {

	/**
	 * Performs forces integration, using given timestep. Uses Euler method to solve
	 * differential equation (http://en.wikipedia.org/wiki/Euler_method ).
	 *
	 * @returns {Number} squared distance of total position updates.
	 */

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var dx = 0, tx = 0,
	      dy = 0, ty = 0,
	      i,
	      max = bodies.length;

	  if (max === 0) {
	    return 0;
	  }

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	        coeff = timeStep / body.mass;

	    body.velocity.x += coeff * body.force.x;
	    body.velocity.y += coeff * body.force.y;
	    var vx = body.velocity.x,
	        vy = body.velocity.y,
	        v = Math.sqrt(vx * vx + vy * vy);

	    if (v > 1) {
	      body.velocity.x = vx / v;
	      body.velocity.y = vy / v;
	    }

	    dx = timeStep * body.velocity.x;
	    dy = timeStep * body.velocity.y;

	    body.pos.x += dx;
	    body.pos.y += dy;

	    tx += Math.abs(dx); ty += Math.abs(dy);
	  }

	  return (tx * tx + ty * ty)/max;
	}


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(28);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 28 */
/***/ (function(module, exports) {

	module.exports = {
	  Body: Body,
	  Vector2d: Vector2d,
	  Body3d: Body3d,
	  Vector3d: Vector3d
	};

	function Body(x, y) {
	  this.pos = new Vector2d(x, y);
	  this.prevPos = new Vector2d(x, y);
	  this.force = new Vector2d();
	  this.velocity = new Vector2d();
	  this.mass = 1;
	}

	Body.prototype.setPosition = function (x, y) {
	  this.prevPos.x = this.pos.x = x;
	  this.prevPos.y = this.pos.y = y;
	};

	function Vector2d(x, y) {
	  if (x && typeof x !== 'number') {
	    // could be another vector
	    this.x = typeof x.x === 'number' ? x.x : 0;
	    this.y = typeof x.y === 'number' ? x.y : 0;
	  } else {
	    this.x = typeof x === 'number' ? x : 0;
	    this.y = typeof y === 'number' ? y : 0;
	  }
	}

	Vector2d.prototype.reset = function () {
	  this.x = this.y = 0;
	};

	function Body3d(x, y, z) {
	  this.pos = new Vector3d(x, y, z);
	  this.prevPos = new Vector3d(x, y, z);
	  this.force = new Vector3d();
	  this.velocity = new Vector3d();
	  this.mass = 1;
	}

	Body3d.prototype.setPosition = function (x, y, z) {
	  this.prevPos.x = this.pos.x = x;
	  this.prevPos.y = this.pos.y = y;
	  this.prevPos.z = this.pos.z = z;
	};

	function Vector3d(x, y, z) {
	  if (x && typeof x !== 'number') {
	    // could be another vector
	    this.x = typeof x.x === 'number' ? x.x : 0;
	    this.y = typeof x.y === 'number' ? x.y : 0;
	    this.z = typeof x.z === 'number' ? x.z : 0;
	  } else {
	    this.x = typeof x === 'number' ? x : 0;
	    this.y = typeof y === 'number' ? y : 0;
	    this.z = typeof z === 'number' ? z : 0;
	  }
	};

	Vector3d.prototype.reset = function () {
	  this.x = this.y = this.z = 0;
	};


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This module provides all required forces to regular ngraph.physics.simulator
	 * to make it 3D simulator. Ideally ngraph.physics.simulator should operate
	 * with vectors, but on practices that showed performance decrease... Maybe
	 * I was doing it wrong, will see if I can refactor/throw away this module.
	 */
	module.exports = createLayout;
	createLayout.get2dLayout = __webpack_require__(30);

	function createLayout(graph, physicsSettings) {
	  var merge = __webpack_require__(17);
	  physicsSettings = merge(physicsSettings, {
	        createQuadTree: __webpack_require__(42),
	        createBounds: __webpack_require__(46),
	        createDragForce: __webpack_require__(47),
	        createSpringForce: __webpack_require__(48),
	        integrator: getIntegrator(physicsSettings),
	        createBody: __webpack_require__(49)
	      });

	  return createLayout.get2dLayout(graph, physicsSettings);
	}

	function getIntegrator(physicsSettings) {
	  if (physicsSettings && physicsSettings.integrator === 'verlet') {
	    return __webpack_require__(50);
	  }

	  return __webpack_require__(51)
	}


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(31);

	var eventify = __webpack_require__(12);

	/**
	 * Creates force based layout for a given graph.
	 * @param {ngraph.graph} graph which needs to be laid out
	 * @param {object} physicsSettings if you need custom settings
	 * for physics simulator you can pass your own settings here. If it's not passed
	 * a default one will be created.
	 */
	function createLayout(graph, physicsSettings) {
	  if (!graph) {
	    throw new Error('Graph structure cannot be undefined');
	  }

	  var createSimulator = __webpack_require__(31);
	  var physicsSimulator = createSimulator(physicsSettings);

	  var nodeBodies = typeof Object.create === 'function' ? Object.create(null) : {};
	  var springs = {};

	  var springTransform = physicsSimulator.settings.springTransform || noop;

	  // Initialize physical objects according to what we have in the graph:
	  initPhysics();
	  listenToEvents();

	  var api = {
	    /**
	     * Performs one step of iterative layout algorithm
	     */
	    step: function() {
	      return physicsSimulator.step();
	    },

	    /**
	     * For a given `nodeId` returns position
	     */
	    getNodePosition: function (nodeId) {
	      return getInitializedBody(nodeId).pos;
	    },

	    /**
	     * Sets position of a node to a given coordinates
	     * @param {string} nodeId node identifier
	     * @param {number} x position of a node
	     * @param {number} y position of a node
	     * @param {number=} z position of node (only if applicable to body)
	     */
	    setNodePosition: function (nodeId) {
	      var body = getInitializedBody(nodeId);
	      body.setPosition.apply(body, Array.prototype.slice.call(arguments, 1));
	    },

	    /**
	     * @returns {Object} Link position by link id
	     * @returns {Object.from} {x, y} coordinates of link start
	     * @returns {Object.to} {x, y} coordinates of link end
	     */
	    getLinkPosition: function (linkId) {
	      var spring = springs[linkId];
	      if (spring) {
	        return {
	          from: spring.from.pos,
	          to: spring.to.pos
	        };
	      }
	    },

	    /**
	     * @returns {Object} area required to fit in the graph. Object contains
	     * `x1`, `y1` - top left coordinates
	     * `x2`, `y2` - bottom right coordinates
	     */
	    getGraphRect: function () {
	      return physicsSimulator.getBBox();
	    },

	    /*
	     * Requests layout algorithm to pin/unpin node to its current position
	     * Pinned nodes should not be affected by layout algorithm and always
	     * remain at their position
	     */
	    pinNode: function (node, isPinned) {
	      var body = getInitializedBody(node.id);
	       body.isPinned = !!isPinned;
	    },

	    /**
	     * Checks whether given graph's node is currently pinned
	     */
	    isNodePinned: function (node) {
	      return getInitializedBody(node.id).isPinned;
	    },

	    /**
	     * Request to release all resources
	     */
	    dispose: function() {
	      graph.off('changed', onGraphChanged);
	      physicsSimulator.off('stable', onStableChanged);
	    },

	    /**
	     * Gets physical body for a given node id. If node is not found undefined
	     * value is returned.
	     */
	    getBody: getBody,

	    /**
	     * Gets spring for a given edge.
	     *
	     * @param {string} linkId link identifer. If two arguments are passed then
	     * this argument is treated as formNodeId
	     * @param {string=} toId when defined this parameter denotes head of the link
	     * and first argument is trated as tail of the link (fromId)
	     */
	    getSpring: getSpring,

	    /**
	     * [Read only] Gets current physics simulator
	     */
	    simulator: physicsSimulator
	  };

	  eventify(api);
	  return api;

	  function getSpring(fromId, toId) {
	    var linkId;
	    if (toId === undefined) {
	      if (typeof fromId !== 'object') {
	        // assume fromId as a linkId:
	        linkId = fromId;
	      } else {
	        // assume fromId to be a link object:
	        linkId = fromId.id;
	      }
	    } else {
	      // toId is defined, should grab link:
	      var link = graph.hasLink(fromId, toId);
	      if (!link) return;
	      linkId = link.id;
	    }

	    return springs[linkId];
	  }

	  function getBody(nodeId) {
	    return nodeBodies[nodeId];
	  }

	  function listenToEvents() {
	    graph.on('changed', onGraphChanged);
	    physicsSimulator.on('stable', onStableChanged);
	  }

	  function onStableChanged(isStable) {
	    api.fire('stable', isStable);
	  }

	  function onGraphChanged(changes) {
	    for (var i = 0; i < changes.length; ++i) {
	      var change = changes[i];
	      if (change.changeType === 'add') {
	        if (change.node) {
	          initBody(change.node.id);
	        }
	        if (change.link) {
	          initLink(change.link);
	        }
	      } else if (change.changeType === 'remove') {
	        if (change.node) {
	          releaseNode(change.node);
	        }
	        if (change.link) {
	          releaseLink(change.link);
	        }
	      }
	    }
	  }

	  function initPhysics() {
	    graph.forEachNode(function (node) {
	      initBody(node.id);
	    });
	    graph.forEachLink(initLink);
	  }

	  function initBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      var node = graph.getNode(nodeId);
	      if (!node) {
	        throw new Error('initBody() was called with unknown node id');
	      }

	      var pos = node.position;
	      if (!pos) {
	        var neighbors = getNeighborBodies(node);
	        pos = physicsSimulator.getBestNewBodyPosition(neighbors);
	      }

	      body = physicsSimulator.addBodyAt(pos);

	      nodeBodies[nodeId] = body;
	      updateBodyMass(nodeId);

	      if (isNodeOriginallyPinned(node)) {
	        body.isPinned = true;
	      }
	    }
	  }

	  function releaseNode(node) {
	    var nodeId = node.id;
	    var body = nodeBodies[nodeId];
	    if (body) {
	      nodeBodies[nodeId] = null;
	      delete nodeBodies[nodeId];

	      physicsSimulator.removeBody(body);
	    }
	  }

	  function initLink(link) {
	    updateBodyMass(link.fromId);
	    updateBodyMass(link.toId);

	    var fromBody = nodeBodies[link.fromId],
	        toBody  = nodeBodies[link.toId],
	        spring = physicsSimulator.addSpring(fromBody, toBody, link.length);

	    springTransform(link, spring);

	    springs[link.id] = spring;
	  }

	  function releaseLink(link) {
	    var spring = springs[link.id];
	    if (spring) {
	      var from = graph.getNode(link.fromId),
	          to = graph.getNode(link.toId);

	      if (from) updateBodyMass(from.id);
	      if (to) updateBodyMass(to.id);

	      delete springs[link.id];

	      physicsSimulator.removeSpring(spring);
	    }
	  }

	  function getNeighborBodies(node) {
	    // TODO: Could probably be done better on memory
	    var neighbors = [];
	    if (!node.links) {
	      return neighbors;
	    }
	    var maxNeighbors = Math.min(node.links.length, 2);
	    for (var i = 0; i < maxNeighbors; ++i) {
	      var link = node.links[i];
	      var otherBody = link.fromId !== node.id ? nodeBodies[link.fromId] : nodeBodies[link.toId];
	      if (otherBody && otherBody.pos) {
	        neighbors.push(otherBody);
	      }
	    }

	    return neighbors;
	  }

	  function updateBodyMass(nodeId) {
	    var body = nodeBodies[nodeId];
	    body.mass = nodeMass(nodeId);
	  }

	  /**
	   * Checks whether graph node has in its settings pinned attribute,
	   * which means layout algorithm cannot move it. Node can be preconfigured
	   * as pinned, if it has "isPinned" attribute, or when node.data has it.
	   *
	   * @param {Object} node a graph node to check
	   * @return {Boolean} true if node should be treated as pinned; false otherwise.
	   */
	  function isNodeOriginallyPinned(node) {
	    return (node && (node.isPinned || (node.data && node.data.isPinned)));
	  }

	  function getInitializedBody(nodeId) {
	    var body = nodeBodies[nodeId];
	    if (!body) {
	      initBody(nodeId);
	      body = nodeBodies[nodeId];
	    }
	    return body;
	  }

	  /**
	   * Calculates mass of a body, which corresponds to node with given id.
	   *
	   * @param {String|Number} nodeId identifier of a node, for which body mass needs to be calculated
	   * @returns {Number} recommended mass of the body;
	   */
	  function nodeMass(nodeId) {
	    var links = graph.getLinks(nodeId);
	    if (!links) return 1;
	    return 1 + links.length / 3.0;
	  }
	}

	function noop() { }


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(32);
	  var expose = __webpack_require__(16);
	  var merge = __webpack_require__(17);
	  var eventify = __webpack_require__(12);

	  settings = merge(settings, {
	      /**
	       * Ideal length for links (springs in physical model).
	       */
	      springLength: 30,

	      /**
	       * Hook's law coefficient. 1 - solid spring.
	       */
	      springCoeff: 0.0008,

	      /**
	       * Coulomb's law coefficient. It's used to repel nodes thus should be negative
	       * if you make it positive nodes start attract each other :).
	       */
	      gravity: -1.2,

	      /**
	       * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
	       * The closer it's to 1 the more nodes algorithm will have to go through.
	       * Setting it to one makes Barnes Hut simulation no different from
	       * brute-force forces calculation (each node is considered).
	       */
	      theta: 0.8,

	      /**
	       * Drag force coefficient. Used to slow down system, thus should be less than 1.
	       * The closer it is to 0 the less tight system will be.
	       */
	      dragCoeff: 0.02,

	      /**
	       * Default time step (dt) for forces integration
	       */
	      timeStep : 20,

	      /**
	        * Maximum movement of the system which can be considered as stabilized
	        */
	      stableThreshold: 0.009
	  });

	  // We allow clients to override basic factory methods:
	  var createQuadTree = settings.createQuadTree || __webpack_require__(33);
	  var createBounds = settings.createBounds || __webpack_require__(37);
	  var createDragForce = settings.createDragForce || __webpack_require__(38);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(39);
	  var integrate = settings.integrator || __webpack_require__(40);
	  var createBody = settings.createBody || __webpack_require__(41);

	  var bodies = [], // Bodies in this simulation.
	      springs = [], // Springs in this simulation.
	      quadTree =  createQuadTree(settings),
	      bounds = createBounds(bodies, settings),
	      springForce = createSpringForce(settings),
	      dragForce = createDragForce(settings);

	  var totalMovement = 0; // how much movement we made on last step
	  var lastStable = false; // indicates whether system was stable on last step() call

	  var publicApi = {
	    /**
	     * Array of bodies, registered with current simulator
	     *
	     * Note: To add new body, use addBody() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    bodies: bodies,

	    /**
	     * Array of springs, registered with current simulator
	     *
	     * Note: To add new spring, use addSpring() method. This property is only
	     * exposed for testing/performance purposes.
	     */
	    springs: springs,

	    /**
	     * Returns settings with which current simulator was initialized
	     */
	    settings: settings,

	    /**
	     * Performs one step of force simulation.
	     *
	     * @returns {boolean} true if system is considered stable; False otherwise.
	     */
	    step: function () {
	      accumulateForces();
	      totalMovement = integrate(bodies, settings.timeStep);

	      bounds.update();
	      var stableNow = totalMovement < settings.stableThreshold;
	      if (lastStable !== stableNow) {
	        publicApi.fire('stable', stableNow);
	      }

	      lastStable = stableNow;

	      return stableNow;
	    },

	    /**
	     * Adds body to the system
	     *
	     * @param {ngraph.physics.primitives.Body} body physical body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBody: function (body) {
	      if (!body) {
	        throw new Error('Body is required');
	      }
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Adds body to the system at given position
	     *
	     * @param {Object} pos position of a body
	     *
	     * @returns {ngraph.physics.primitives.Body} added body
	     */
	    addBodyAt: function (pos) {
	      if (!pos) {
	        throw new Error('Body position is required');
	      }
	      var body = createBody(pos);
	      bodies.push(body);

	      return body;
	    },

	    /**
	     * Removes body from the system
	     *
	     * @param {ngraph.physics.primitives.Body} body to remove
	     *
	     * @returns {Boolean} true if body found and removed. falsy otherwise;
	     */
	    removeBody: function (body) {
	      if (!body) { return; }

	      var idx = bodies.indexOf(body);
	      if (idx < 0) { return; }

	      bodies.splice(idx, 1);
	      if (bodies.length === 0) {
	        bounds.reset();
	      }
	      return true;
	    },

	    /**
	     * Adds a spring to this simulation.
	     *
	     * @returns {Object} - a handle for a spring. If you want to later remove
	     * spring pass it to removeSpring() method.
	     */
	    addSpring: function (body1, body2, springLength, springWeight, springCoefficient) {
	      if (!body1 || !body2) {
	        throw new Error('Cannot add null spring to force simulator');
	      }

	      if (typeof springLength !== 'number') {
	        springLength = -1; // assume global configuration
	      }

	      var spring = new Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1, springWeight);
	      springs.push(spring);

	      // TODO: could mark simulator as dirty.
	      return spring;
	    },

	    /**
	     * Returns amount of movement performed on last step() call
	     */
	    getTotalMovement: function () {
	      return totalMovement;
	    },

	    /**
	     * Removes spring from the system
	     *
	     * @param {Object} spring to remove. Spring is an object returned by addSpring
	     *
	     * @returns {Boolean} true if spring found and removed. falsy otherwise;
	     */
	    removeSpring: function (spring) {
	      if (!spring) { return; }
	      var idx = springs.indexOf(spring);
	      if (idx > -1) {
	        springs.splice(idx, 1);
	        return true;
	      }
	    },

	    getBestNewBodyPosition: function (neighbors) {
	      return bounds.getBestNewPosition(neighbors);
	    },

	    /**
	     * Returns bounding box which covers all bodies
	     */
	    getBBox: function () {
	      return bounds.box;
	    },

	    gravity: function (value) {
	      if (value !== undefined) {
	        settings.gravity = value;
	        quadTree.options({gravity: value});
	        return this;
	      } else {
	        return settings.gravity;
	      }
	    },

	    theta: function (value) {
	      if (value !== undefined) {
	        settings.theta = value;
	        quadTree.options({theta: value});
	        return this;
	      } else {
	        return settings.theta;
	      }
	    }
	  };

	  // allow settings modification via public API:
	  expose(settings, publicApi);
	  eventify(publicApi);

	  return publicApi;

	  function accumulateForces() {
	    // Accumulate forces acting on bodies.
	    var body,
	        i = bodies.length;

	    if (i) {
	      // only add bodies if there the array is not empty:
	      quadTree.insertBodies(bodies); // performance: O(n * log n)
	      while (i--) {
	        body = bodies[i];
	        // If body is pinned there is no point updating its forces - it should
	        // never move:
	        if (!body.isPinned) {
	          body.force.reset();

	          quadTree.updateBodyForce(body);
	          dragForce.update(body);
	        }
	      }
	    }

	    i = springs.length;
	    while(i--) {
	      springForce.update(springs[i]);
	    }
	  }
	};


/***/ }),
/* 32 */
/***/ (function(module, exports) {

	module.exports = Spring;

	/**
	 * Represents a physical spring. Spring connects two bodies, has rest length
	 * stiffness coefficient and optional weight
	 */
	function Spring(fromBody, toBody, length, coeff, weight) {
	    this.from = fromBody;
	    this.to = toBody;
	    this.length = length;
	    this.coeff = coeff;

	    this.weight = typeof weight === 'number' ? weight : 1;
	};


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This is Barnes Hut simulation algorithm for 2d case. Implementation
	 * is highly optimized (avoids recusion and gc pressure)
	 *
	 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
	 */

	module.exports = function(options) {
	  options = options || {};
	  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
	  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

	  // we require deterministic randomness here
	  var random = __webpack_require__(19).random(1984),
	    Node = __webpack_require__(34),
	    InsertStack = __webpack_require__(35),
	    isSamePosition = __webpack_require__(36);

	  var gravity = options.gravity,
	    updateQueue = [],
	    insertStack = new InsertStack(),
	    theta = options.theta,

	    nodesCache = [],
	    currentInCache = 0,
	    newNode = function() {
	      // To avoid pressure on GC we reuse nodes.
	      var node = nodesCache[currentInCache];
	      if (node) {
	        node.quad0 = null;
	        node.quad1 = null;
	        node.quad2 = null;
	        node.quad3 = null;
	        node.body = null;
	        node.mass = node.massX = node.massY = 0;
	        node.left = node.right = node.top = node.bottom = 0;
	      } else {
	        node = new Node();
	        nodesCache[currentInCache] = node;
	      }

	      ++currentInCache;
	      return node;
	    },

	    root = newNode(),

	    // Inserts body to the tree
	    insert = function(newBody) {
	      insertStack.reset();
	      insertStack.push(root, newBody);

	      while (!insertStack.isEmpty()) {
	        var stackItem = insertStack.pop(),
	          node = stackItem.node,
	          body = stackItem.body;

	        if (!node.body) {
	          // This is internal node. Update the total mass of the node and center-of-mass.
	          var x = body.pos.x;
	          var y = body.pos.y;
	          node.mass = node.mass + body.mass;
	          node.massX = node.massX + body.mass * x;
	          node.massY = node.massY + body.mass * y;

	          // Recursively insert the body in the appropriate quadrant.
	          // But first find the appropriate quadrant.
	          var quadIdx = 0, // Assume we are in the 0's quad.
	            left = node.left,
	            right = (node.right + left) / 2,
	            top = node.top,
	            bottom = (node.bottom + top) / 2;

	          if (x > right) { // somewhere in the eastern part.
	            quadIdx = quadIdx + 1;
	            var oldLeft = left;
	            left = right;
	            right = right + (right - oldLeft);
	          }
	          if (y > bottom) { // and in south.
	            quadIdx = quadIdx + 2;
	            var oldTop = top;
	            top = bottom;
	            bottom = bottom + (bottom - oldTop);
	          }

	          var child = getChild(node, quadIdx);
	          if (!child) {
	            // The node is internal but this quadrant is not taken. Add
	            // subnode to it.
	            child = newNode();
	            child.left = left;
	            child.top = top;
	            child.right = right;
	            child.bottom = bottom;
	            child.body = body;

	            setChild(node, quadIdx, child);
	          } else {
	            // continue searching in this quadrant.
	            insertStack.push(child, body);
	          }
	        } else {
	          // We are trying to add to the leaf node.
	          // We have to convert current leaf into internal node
	          // and continue adding two nodes.
	          var oldBody = node.body;
	          node.body = null; // internal nodes do not cary bodies

	          if (isSamePosition(oldBody.pos, body.pos)) {
	            // Prevent infinite subdivision by bumping one node
	            // anywhere in this quadrant
	            var retriesCount = 3;
	            do {
	              var offset = random.nextDouble();
	              var dx = (node.right - node.left) * offset;
	              var dy = (node.bottom - node.top) * offset;

	              oldBody.pos.x = node.left + dx;
	              oldBody.pos.y = node.top + dy;
	              retriesCount -= 1;
	              // Make sure we don't bump it out of the box. If we do, next iteration should fix it
	            } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

	            if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
	              // This is very bad, we ran out of precision.
	              // if we do not return from the method we'll get into
	              // infinite loop here. So we sacrifice correctness of layout, and keep the app running
	              // Next layout iteration should get larger bounding box in the first step and fix this
	              return;
	            }
	          }
	          // Next iteration should subdivide node further.
	          insertStack.push(node, oldBody);
	          insertStack.push(node, body);
	        }
	      }
	    },

	    update = function(sourceBody) {
	      var queue = updateQueue,
	        v,
	        dx,
	        dy,
	        r, fx = 0,
	        fy = 0,
	        queueLength = 1,
	        shiftIdx = 0,
	        pushIdx = 1;

	      queue[0] = root;

	      while (queueLength) {
	        var node = queue[shiftIdx],
	          body = node.body;

	        queueLength -= 1;
	        shiftIdx += 1;
	        var differentBody = (body !== sourceBody);
	        if (body && differentBody) {
	          // If the current node is a leaf node (and it is not source body),
	          // calculate the force exerted by the current node on body, and add this
	          // amount to body's net force.
	          dx = body.pos.x - sourceBody.pos.x;
	          dy = body.pos.y - sourceBody.pos.y;
	          r = Math.sqrt(dx * dx + dy * dy);

	          if (r === 0) {
	            // Poor man's protection against zero distance.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy);
	          }

	          // This is standard gravition force calculation but we divide
	          // by r^3 to save two operations when normalizing force vector.
	          v = gravity * body.mass * sourceBody.mass / (r * r * r);
	          fx += v * dx;
	          fy += v * dy;
	        } else if (differentBody) {
	          // Otherwise, calculate the ratio s / r,  where s is the width of the region
	          // represented by the internal node, and r is the distance between the body
	          // and the node's center-of-mass
	          dx = node.massX / node.mass - sourceBody.pos.x;
	          dy = node.massY / node.mass - sourceBody.pos.y;
	          r = Math.sqrt(dx * dx + dy * dy);

	          if (r === 0) {
	            // Sorry about code duplucation. I don't want to create many functions
	            // right away. Just want to see performance first.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy);
	          }
	          // If s / r < θ, treat this internal node as a single body, and calculate the
	          // force it exerts on sourceBody, and add this amount to sourceBody's net force.
	          if ((node.right - node.left) / r < theta) {
	            // in the if statement above we consider node's width only
	            // because the region was squarified during tree creation.
	            // Thus there is no difference between using width or height.
	            v = gravity * node.mass * sourceBody.mass / (r * r * r);
	            fx += v * dx;
	            fy += v * dy;
	          } else {
	            // Otherwise, run the procedure recursively on each of the current node's children.

	            // I intentionally unfolded this loop, to save several CPU cycles.
	            if (node.quad0) {
	              queue[pushIdx] = node.quad0;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad1) {
	              queue[pushIdx] = node.quad1;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad2) {
	              queue[pushIdx] = node.quad2;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad3) {
	              queue[pushIdx] = node.quad3;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	          }
	        }
	      }

	      sourceBody.force.x += fx;
	      sourceBody.force.y += fy;
	    },

	    insertBodies = function(bodies) {
	      var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE,
	        i,
	        max = bodies.length;

	      // To reduce quad tree depth we are looking for exact bounding box of all particles.
	      i = max;
	      while (i--) {
	        var x = bodies[i].pos.x;
	        var y = bodies[i].pos.y;
	        if (x < x1) {
	          x1 = x;
	        }
	        if (x > x2) {
	          x2 = x;
	        }
	        if (y < y1) {
	          y1 = y;
	        }
	        if (y > y2) {
	          y2 = y;
	        }
	      }

	      // Squarify the bounds.
	      var dx = x2 - x1,
	        dy = y2 - y1;
	      if (dx > dy) {
	        y2 = y1 + dx;
	      } else {
	        x2 = x1 + dy;
	      }

	      currentInCache = 0;
	      root = newNode();
	      root.left = x1;
	      root.right = x2;
	      root.top = y1;
	      root.bottom = y2;

	      i = max - 1;
	      if (i > 0) {
	        root.body = bodies[i];
	      }
	      while (i--) {
	        insert(bodies[i], root);
	      }
	    };

	  return {
	    insertBodies: insertBodies,
	    updateBodyForce: update,
	    options: function(newOptions) {
	      if (newOptions) {
	        if (typeof newOptions.gravity === 'number') {
	          gravity = newOptions.gravity;
	        }
	        if (typeof newOptions.theta === 'number') {
	          theta = newOptions.theta;
	        }

	        return this;
	      }

	      return {
	        gravity: gravity,
	        theta: theta
	      };
	    }
	  };
	};

	function getChild(node, idx) {
	  if (idx === 0) return node.quad0;
	  if (idx === 1) return node.quad1;
	  if (idx === 2) return node.quad2;
	  if (idx === 3) return node.quad3;
	  return null;
	}

	function setChild(node, idx, child) {
	  if (idx === 0) node.quad0 = child;
	  else if (idx === 1) node.quad1 = child;
	  else if (idx === 2) node.quad2 = child;
	  else if (idx === 3) node.quad3 = child;
	}


/***/ }),
/* 34 */
/***/ (function(module, exports) {

	/**
	 * Internal data structure to represent 2D QuadTree node
	 */
	module.exports = function Node() {
	  // body stored inside this node. In quad tree only leaf nodes (by construction)
	  // contain boides:
	  this.body = null;

	  // Child nodes are stored in quads. Each quad is presented by number:
	  // 0 | 1
	  // -----
	  // 2 | 3
	  this.quad0 = null;
	  this.quad1 = null;
	  this.quad2 = null;
	  this.quad3 = null;

	  // Total mass of current node
	  this.mass = 0;

	  // Center of mass coordinates
	  this.massX = 0;
	  this.massY = 0;

	  // bounding box coordinates
	  this.left = 0;
	  this.top = 0;
	  this.bottom = 0;
	  this.right = 0;
	};


/***/ }),
/* 35 */
/***/ (function(module, exports) {

	module.exports = InsertStack;

	/**
	 * Our implmentation of QuadTree is non-recursive to avoid GC hit
	 * This data structure represent stack of elements
	 * which we are trying to insert into quad tree.
	 */
	function InsertStack () {
	    this.stack = [];
	    this.popIdx = 0;
	}

	InsertStack.prototype = {
	    isEmpty: function() {
	        return this.popIdx === 0;
	    },
	    push: function (node, body) {
	        var item = this.stack[this.popIdx];
	        if (!item) {
	            // we are trying to avoid memory pressue: create new element
	            // only when absolutely necessary
	            this.stack[this.popIdx] = new InsertStackElement(node, body);
	        } else {
	            item.node = node;
	            item.body = body;
	        }
	        ++this.popIdx;
	    },
	    pop: function () {
	        if (this.popIdx > 0) {
	            return this.stack[--this.popIdx];
	        }
	    },
	    reset: function () {
	        this.popIdx = 0;
	    }
	};

	function InsertStackElement(node, body) {
	    this.node = node; // QuadTree node
	    this.body = body; // physical body which needs to be inserted to node
	}


/***/ }),
/* 36 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);

	    return (dx < 1e-8 && dy < 1e-8);
	};


/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(19).random(42);
	  var boundingBox =  { x1: 0, y1: 0, x2: 0, y2: 0 };

	  return {
	    box: boundingBox,

	    update: updateBoundingBox,

	    reset : function () {
	      boundingBox.x1 = boundingBox.y1 = 0;
	      boundingBox.x2 = boundingBox.y2 = 0;
	    },

	    getBestNewPosition: function (neighbors) {
	      var graphRect = boundingBox;

	      var baseX = 0, baseY = 0;

	      if (neighbors.length) {
	        for (var i = 0; i < neighbors.length; ++i) {
	          baseX += neighbors[i].pos.x;
	          baseY += neighbors[i].pos.y;
	        }

	        baseX /= neighbors.length;
	        baseY /= neighbors.length;
	      } else {
	        baseX = (graphRect.x1 + graphRect.x2) / 2;
	        baseY = (graphRect.y1 + graphRect.y2) / 2;
	      }

	      var springLength = settings.springLength;
	      return {
	        x: baseX + random.next(springLength) - springLength / 2,
	        y: baseY + random.next(springLength) - springLength / 2
	      };
	    }
	  };

	  function updateBoundingBox() {
	    var i = bodies.length;
	    if (i === 0) { return; } // don't have to wory here.

	    var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE;

	    while(i--) {
	      // this is O(n), could it be done faster with quadtree?
	      // how about pinned nodes?
	      var body = bodies[i];
	      if (body.isPinned) {
	        body.pos.x = body.prevPos.x;
	        body.pos.y = body.prevPos.y;
	      } else {
	        body.prevPos.x = body.pos.x;
	        body.prevPos.y = body.pos.y;
	      }
	      if (body.pos.x < x1) {
	        x1 = body.pos.x;
	      }
	      if (body.pos.x > x2) {
	        x2 = body.pos.x;
	      }
	      if (body.pos.y < y1) {
	        y1 = body.pos.y;
	      }
	      if (body.pos.y > y2) {
	        y2 = body.pos.y;
	      }
	    }

	    boundingBox.x1 = x1;
	    boundingBox.x2 = x2;
	    boundingBox.y1 = y1;
	    boundingBox.y2 = y2;
	  }
	}


/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(17),
	      expose = __webpack_require__(16);

	  options = merge(options, {
	    dragCoeff: 0.02
	  });

	  var api = {
	    update : function (body) {
	      body.force.x -= options.dragCoeff * body.velocity.x;
	      body.force.y -= options.dragCoeff * body.velocity.y;
	    }
	  };

	  // let easy access to dragCoeff:
	  expose(options, api, ['dragCoeff']);

	  return api;
	};


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents spring force, which updates forces acting on two bodies, conntected
	 * by a spring.
	 *
	 * @param {Object} options for the spring force
	 * @param {Number=} options.springCoeff spring force coefficient.
	 * @param {Number=} options.springLength desired length of a spring at rest.
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(17);
	  var random = __webpack_require__(19).random(42);
	  var expose = __webpack_require__(16);

	  options = merge(options, {
	    springCoeff: 0.0002,
	    springLength: 80
	  });

	  var api = {
	    /**
	     * Upsates forces acting on a spring
	     */
	    update : function (spring) {
	      var body1 = spring.from,
	          body2 = spring.to,
	          length = spring.length < 0 ? options.springLength : spring.length,
	          dx = body2.pos.x - body1.pos.x,
	          dy = body2.pos.y - body1.pos.y,
	          r = Math.sqrt(dx * dx + dy * dy);

	      if (r === 0) {
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy);
	      }

	      var d = r - length;
	      var coeff = ((!spring.coeff || spring.coeff < 0) ? options.springCoeff : spring.coeff) * d / r * spring.weight;

	      body1.force.x += coeff * dx;
	      body1.force.y += coeff * dy;

	      body2.force.x -= coeff * dx;
	      body2.force.y -= coeff * dy;
	    }
	  };

	  expose(options, api, ['springCoeff', 'springLength']);
	  return api;
	}


/***/ }),
/* 40 */
/***/ (function(module, exports) {

	/**
	 * Performs forces integration, using given timestep. Uses Euler method to solve
	 * differential equation (http://en.wikipedia.org/wiki/Euler_method ).
	 *
	 * @returns {Number} squared distance of total position updates.
	 */

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var dx = 0, tx = 0,
	      dy = 0, ty = 0,
	      i,
	      max = bodies.length;

	  if (max === 0) {
	    return 0;
	  }

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	        coeff = timeStep / body.mass;

	    body.velocity.x += coeff * body.force.x;
	    body.velocity.y += coeff * body.force.y;
	    var vx = body.velocity.x,
	        vy = body.velocity.y,
	        v = Math.sqrt(vx * vx + vy * vy);

	    if (v > 1) {
	      body.velocity.x = vx / v;
	      body.velocity.y = vy / v;
	    }

	    dx = timeStep * body.velocity.x;
	    dy = timeStep * body.velocity.y;

	    body.pos.x += dx;
	    body.pos.y += dy;

	    tx += Math.abs(dx); ty += Math.abs(dy);
	  }

	  return (tx * tx + ty * ty)/max;
	}


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(28);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This is Barnes Hut simulation algorithm for 3d case. Implementation
	 * is highly optimized (avoids recusion and gc pressure)
	 *
	 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
	 *
	 * NOTE: This module duplicates a lot of code from 2d case. Primary reason for
	 * this is performance. Every time I tried to abstract away vector operations
	 * I had negative impact on performance. So in this case I'm scarifying code
	 * reuse in favor of speed
	 */

	module.exports = function(options) {
	  options = options || {};
	  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
	  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

	  // we require deterministic randomness here
	  var random = __webpack_require__(19).random(1984),
	    Node = __webpack_require__(43),
	    InsertStack = __webpack_require__(44),
	    isSamePosition = __webpack_require__(45);

	  var gravity = options.gravity,
	    updateQueue = [],
	    insertStack = new InsertStack(),
	    theta = options.theta,

	    nodesCache = [],
	    currentInCache = 0,
	    newNode = function() {
	      // To avoid pressure on GC we reuse nodes.
	      var node = nodesCache[currentInCache];
	      if (node) {
	        node.quad0 = null;
	        node.quad4 = null;
	        node.quad1 = null;
	        node.quad5 = null;
	        node.quad2 = null;
	        node.quad6 = null;
	        node.quad3 = null;
	        node.quad7 = null;
	        node.body = null;
	        node.mass = node.massX = node.massY = node.massZ = 0;
	        node.left = node.right = node.top = node.bottom = node.front = node.back = 0;
	      } else {
	        node = new Node();
	        nodesCache[currentInCache] = node;
	      }

	      ++currentInCache;
	      return node;
	    },

	    root = newNode(),

	    // Inserts body to the tree
	    insert = function(newBody) {
	      insertStack.reset();
	      insertStack.push(root, newBody);

	      while (!insertStack.isEmpty()) {
	        var stackItem = insertStack.pop(),
	          node = stackItem.node,
	          body = stackItem.body;

	        if (!node.body) {
	          // This is internal node. Update the total mass of the node and center-of-mass.
	          var x = body.pos.x;
	          var y = body.pos.y;
	          var z = body.pos.z;
	          node.mass += body.mass;
	          node.massX += body.mass * x;
	          node.massY += body.mass * y;
	          node.massZ += body.mass * z;

	          // Recursively insert the body in the appropriate quadrant.
	          // But first find the appropriate quadrant.
	          var quadIdx = 0, // Assume we are in the 0's quad.
	            left = node.left,
	            right = (node.right + left) / 2,
	            top = node.top,
	            bottom = (node.bottom + top) / 2,
	            back = node.back,
	            front = (node.front + back) / 2;

	          if (x > right) { // somewhere in the eastern part.
	            quadIdx += 1;
	            var oldLeft = left;
	            left = right;
	            right = right + (right - oldLeft);
	          }
	          if (y > bottom) { // and in south.
	            quadIdx += 2;
	            var oldTop = top;
	            top = bottom;
	            bottom = bottom + (bottom - oldTop);
	          }
	          if (z > front) { // and in frontal part
	            quadIdx += 4;
	            var oldBack = back;
	            back = front;
	            front = back + (back - oldBack);
	          }

	          var child = getChild(node, quadIdx);
	          if (!child) {
	            // The node is internal but this quadrant is not taken. Add subnode to it.
	            child = newNode();
	            child.left = left;
	            child.top = top;
	            child.right = right;
	            child.bottom = bottom;
	            child.back = back;
	            child.front = front;
	            child.body = body;

	            setChild(node, quadIdx, child);
	          } else {
	            // continue searching in this quadrant.
	            insertStack.push(child, body);
	          }
	        } else {
	          // We are trying to add to the leaf node.
	          // We have to convert current leaf into internal node
	          // and continue adding two nodes.
	          var oldBody = node.body;
	          node.body = null; // internal nodes do not carry bodies

	          if (isSamePosition(oldBody.pos, body.pos)) {
	            // Prevent infinite subdivision by bumping one node
	            // anywhere in this quadrant
	            var retriesCount = 3;
	            do {
	              var offset = random.nextDouble();
	              var dx = (node.right - node.left) * offset;
	              var dy = (node.bottom - node.top) * offset;
	              var dz = (node.front - node.back) * offset;

	              oldBody.pos.x = node.left + dx;
	              oldBody.pos.y = node.top + dy;
	              oldBody.pos.z = node.back + dz;
	              retriesCount -= 1;
	              // Make sure we don't bump it out of the box. If we do, next iteration should fix it
	            } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

	            if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
	              // This is very bad, we ran out of precision.
	              // if we do not return from the method we'll get into
	              // infinite loop here. So we sacrifice correctness of layout, and keep the app running
	              // Next layout iteration should get larger bounding box in the first step and fix this
	              return;
	            }
	          }
	          // Next iteration should subdivide node further.
	          insertStack.push(node, oldBody);
	          insertStack.push(node, body);
	        }
	      }
	    },

	    update = function(sourceBody) {
	      var queue = updateQueue,
	        v,
	        dx, dy, dz,
	        r, fx = 0,
	        fy = 0,
	        fz = 0,
	        queueLength = 1,
	        shiftIdx = 0,
	        pushIdx = 1;

	      queue[0] = root;

	      while (queueLength) {
	        var node = queue[shiftIdx],
	          body = node.body;

	        queueLength -= 1;
	        shiftIdx += 1;
	        var differentBody = (body !== sourceBody);
	        if (body && differentBody) {
	          // If the current node is a leaf node (and it is not source body),
	          // calculate the force exerted by the current node on body, and add this
	          // amount to body's net force.
	          dx = body.pos.x - sourceBody.pos.x;
	          dy = body.pos.y - sourceBody.pos.y;
	          dz = body.pos.z - sourceBody.pos.z;
	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);

	          if (r === 0) {
	            // Poor man's protection against zero distance.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            dz = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy + dz * dz);
	          }

	          // This is standard gravitation force calculation but we divide
	          // by r^3 to save two operations when normalizing force vector.
	          v = gravity * body.mass * sourceBody.mass / (r * r * r);
	          fx += v * dx;
	          fy += v * dy;
	          fz += v * dz;
	        } else if (differentBody) {
	          // Otherwise, calculate the ratio s / r,  where s is the width of the region
	          // represented by the internal node, and r is the distance between the body
	          // and the node's center-of-mass
	          dx = node.massX / node.mass - sourceBody.pos.x;
	          dy = node.massY / node.mass - sourceBody.pos.y;
	          dz = node.massZ / node.mass - sourceBody.pos.z;

	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);

	          if (r === 0) {
	            // Sorry about code duplication. I don't want to create many functions
	            // right away. Just want to see performance first.
	            dx = (random.nextDouble() - 0.5) / 50;
	            dy = (random.nextDouble() - 0.5) / 50;
	            dz = (random.nextDouble() - 0.5) / 50;
	            r = Math.sqrt(dx * dx + dy * dy + dz * dz);
	          }

	          // If s / r < θ, treat this internal node as a single body, and calculate the
	          // force it exerts on sourceBody, and add this amount to sourceBody's net force.
	          if ((node.right - node.left) / r < theta) {
	            // in the if statement above we consider node's width only
	            // because the region was squarified during tree creation.
	            // Thus there is no difference between using width or height.
	            v = gravity * node.mass * sourceBody.mass / (r * r * r);
	            fx += v * dx;
	            fy += v * dy;
	            fz += v * dz;
	          } else {
	            // Otherwise, run the procedure recursively on each of the current node's children.

	            // I intentionally unfolded this loop, to save several CPU cycles.
	            if (node.quad0) {
	              queue[pushIdx] = node.quad0;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad1) {
	              queue[pushIdx] = node.quad1;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad2) {
	              queue[pushIdx] = node.quad2;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad3) {
	              queue[pushIdx] = node.quad3;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad4) {
	              queue[pushIdx] = node.quad4;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad5) {
	              queue[pushIdx] = node.quad5;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad6) {
	              queue[pushIdx] = node.quad6;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	            if (node.quad7) {
	              queue[pushIdx] = node.quad7;
	              queueLength += 1;
	              pushIdx += 1;
	            }
	          }
	        }
	      }

	      sourceBody.force.x += fx;
	      sourceBody.force.y += fy;
	      sourceBody.force.z += fz;
	    },

	    insertBodies = function(bodies) {
	      var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        z1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE,
	        z2 = Number.MIN_VALUE,
	        i,
	        max = bodies.length;

	      // To reduce quad tree depth we are looking for exact bounding box of all particles.
	      i = max;
	      while (i--) {
	        var pos = bodies[i].pos;
	        var x = pos.x;
	        var y = pos.y;
	        var z = pos.z;
	        if (x < x1) {
	          x1 = x;
	        }
	        if (x > x2) {
	          x2 = x;
	        }
	        if (y < y1) {
	          y1 = y;
	        }
	        if (y > y2) {
	          y2 = y;
	        }
	        if (z < z1) {
	          z1 = z;
	        }
	        if (z > z2) {
	          z2 = z;
	        }
	      }

	      // Squarify the bounds.
	      var maxSide = Math.max(x2 - x1, Math.max(y2 - y1, z2 - z1));

	      x2 = x1 + maxSide;
	      y2 = y1 + maxSide;
	      z2 = z1 + maxSide;

	      currentInCache = 0;
	      root = newNode();
	      root.left = x1;
	      root.right = x2;
	      root.top = y1;
	      root.bottom = y2;
	      root.back = z1;
	      root.front = z2;

	      i = max - 1;
	      if (i > 0) {
	        root.body = bodies[i];
	      }
	      while (i--) {
	        insert(bodies[i], root);
	      }
	    };

	  return {
	    insertBodies: insertBodies,
	    updateBodyForce: update,
	    options: function(newOptions) {
	      if (newOptions) {
	        if (typeof newOptions.gravity === 'number') {
	          gravity = newOptions.gravity;
	        }
	        if (typeof newOptions.theta === 'number') {
	          theta = newOptions.theta;
	        }

	        return this;
	      }

	      return {
	        gravity: gravity,
	        theta: theta
	      };
	    }
	  };
	};

	function getChild(node, idx) {
	  if (idx === 0) return node.quad0;
	  if (idx === 1) return node.quad1;
	  if (idx === 2) return node.quad2;
	  if (idx === 3) return node.quad3;
	  if (idx === 4) return node.quad4;
	  if (idx === 5) return node.quad5;
	  if (idx === 6) return node.quad6;
	  if (idx === 7) return node.quad7;
	  return null;
	}

	function setChild(node, idx, child) {
	  if (idx === 0) node.quad0 = child;
	  else if (idx === 1) node.quad1 = child;
	  else if (idx === 2) node.quad2 = child;
	  else if (idx === 3) node.quad3 = child;
	  else if (idx === 4) node.quad4 = child;
	  else if (idx === 5) node.quad5 = child;
	  else if (idx === 6) node.quad6 = child;
	  else if (idx === 7) node.quad7 = child;
	}


/***/ }),
/* 43 */
/***/ (function(module, exports) {

	/**
	 * Internal data structure to represent 3D QuadTree node
	 */
	module.exports = function Node() {
	  // body stored inside this node. In quad tree only leaf nodes (by construction)
	  // contain boides:
	  this.body = null;

	  // Child nodes are stored in quads. Each quad is presented by number:
	  // Behind Z median:
	  // 0 | 1
	  // -----
	  // 2 | 3
	  // In front of Z median:
	  // 4 | 5
	  // -----
	  // 6 | 7
	  this.quad0 = null;
	  this.quad1 = null;
	  this.quad2 = null;
	  this.quad3 = null;
	  this.quad4 = null;
	  this.quad5 = null;
	  this.quad6 = null;
	  this.quad7 = null;

	  // Total mass of current node
	  this.mass = 0;

	  // Center of mass coordinates
	  this.massX = 0;
	  this.massY = 0;
	  this.massZ = 0;

	  // bounding box coordinates
	  this.left = 0;
	  this.top = 0;
	  this.bottom = 0;
	  this.right = 0;
	  this.front = 0;
	  this.back = 0;
	};


/***/ }),
/* 44 */
/***/ (function(module, exports) {

	module.exports = InsertStack;

	/**
	 * Our implementation of QuadTree is non-recursive to avoid GC hit
	 * This data structure represent stack of elements
	 * which we are trying to insert into quad tree.
	 */
	function InsertStack () {
	    this.stack = [];
	    this.popIdx = 0;
	}

	InsertStack.prototype = {
	    isEmpty: function() {
	        return this.popIdx === 0;
	    },
	    push: function (node, body) {
	        var item = this.stack[this.popIdx];
	        if (!item) {
	            // we are trying to avoid memory pressure: create new element
	            // only when absolutely necessary
	            this.stack[this.popIdx] = new InsertStackElement(node, body);
	        } else {
	            item.node = node;
	            item.body = body;
	        }
	        ++this.popIdx;
	    },
	    pop: function () {
	        if (this.popIdx > 0) {
	            return this.stack[--this.popIdx];
	        }
	    },
	    reset: function () {
	        this.popIdx = 0;
	    }
	};

	function InsertStackElement(node, body) {
	    this.node = node; // QuadTree node
	    this.body = body; // physical body which needs to be inserted to node
	}


/***/ }),
/* 45 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);
	    var dz = Math.abs(point1.z - point2.z);

	    return (dx < 1e-8 && dy < 1e-8 && dz < 1e-8);
	};


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(19).random(42);
	  var boundingBox =  { x1: 0, y1: 0, z1: 0, x2: 0, y2: 0, z2: 0 };

	  return {
	    box: boundingBox,

	    update: updateBoundingBox,

	    reset : function () {
	      boundingBox.x1 = boundingBox.y1 = 0;
	      boundingBox.x2 = boundingBox.y2 = 0;
	      boundingBox.z1 = boundingBox.z2 = 0;
	    },

	    getBestNewPosition: function (neighbors) {
	      var graphRect = boundingBox;

	      var baseX = 0, baseY = 0, baseZ = 0;

	      if (neighbors.length) {
	        for (var i = 0; i < neighbors.length; ++i) {
	          baseX += neighbors[i].pos.x;
	          baseY += neighbors[i].pos.y;
	          baseZ += neighbors[i].pos.z;
	        }

	        baseX /= neighbors.length;
	        baseY /= neighbors.length;
	        baseZ /= neighbors.length;
	      } else {
	        baseX = (graphRect.x1 + graphRect.x2) / 2;
	        baseY = (graphRect.y1 + graphRect.y2) / 2;
	        baseZ = (graphRect.z1 + graphRect.z2) / 2;
	      }

	      var springLength = settings.springLength;
	      return {
	        x: baseX + random.next(springLength) - springLength / 2,
	        y: baseY + random.next(springLength) - springLength / 2,
	        z: baseZ + random.next(springLength) - springLength / 2
	      };
	    }
	  };

	  function updateBoundingBox() {
	    var i = bodies.length;
	    if (i === 0) { return; } // don't have to wory here.

	    var x1 = Number.MAX_VALUE,
	        y1 = Number.MAX_VALUE,
	        z1 = Number.MAX_VALUE,
	        x2 = Number.MIN_VALUE,
	        y2 = Number.MIN_VALUE,
	        z2 = Number.MIN_VALUE;

	    while(i--) {
	      // this is O(n), could it be done faster with quadtree?
	      // how about pinned nodes?
	      var body = bodies[i];
	      if (body.isPinned) {
	        body.pos.x = body.prevPos.x;
	        body.pos.y = body.prevPos.y;
	        body.pos.z = body.prevPos.z;
	      } else {
	        body.prevPos.x = body.pos.x;
	        body.prevPos.y = body.pos.y;
	        body.prevPos.z = body.pos.z;
	      }
	      if (body.pos.x < x1) {
	        x1 = body.pos.x;
	      }
	      if (body.pos.x > x2) {
	        x2 = body.pos.x;
	      }
	      if (body.pos.y < y1) {
	        y1 = body.pos.y;
	      }
	      if (body.pos.y > y2) {
	        y2 = body.pos.y;
	      }
	      if (body.pos.z < z1) {
	        z1 = body.pos.z;
	      }
	      if (body.pos.z > z2) {
	        z2 = body.pos.z;
	      }
	    }

	    boundingBox.x1 = x1;
	    boundingBox.x2 = x2;
	    boundingBox.y1 = y1;
	    boundingBox.y2 = y2;
	    boundingBox.z1 = z1;
	    boundingBox.z2 = z2;
	  }
	};


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents 3d drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(17),
	      expose = __webpack_require__(16);

	  options = merge(options, {
	    dragCoeff: 0.02
	  });

	  var api = {
	    update : function (body) {
	      body.force.x -= options.dragCoeff * body.velocity.x;
	      body.force.y -= options.dragCoeff * body.velocity.y;
	      body.force.z -= options.dragCoeff * body.velocity.z;
	    }
	  };

	  // let easy access to dragCoeff:
	  expose(options, api, ['dragCoeff']);

	  return api;
	};


/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents 3d spring force, which updates forces acting on two bodies, conntected
	 * by a spring.
	 *
	 * @param {Object} options for the spring force
	 * @param {Number=} options.springCoeff spring force coefficient.
	 * @param {Number=} options.springLength desired length of a spring at rest.
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(17);
	  var random = __webpack_require__(19).random(42);
	  var expose = __webpack_require__(16);

	  options = merge(options, {
	    springCoeff: 0.0002,
	    springLength: 80
	  });

	  var api = {
	    /**
	     * Upsates forces acting on a spring
	     */
	    update : function (spring) {
	      var body1 = spring.from,
	          body2 = spring.to,
	          length = spring.length < 0 ? options.springLength : spring.length,
	          dx = body2.pos.x - body1.pos.x,
	          dy = body2.pos.y - body1.pos.y,
	          dz = body2.pos.z - body1.pos.z,
	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);

	      if (r === 0) {
	          dx = (random.nextDouble() - 0.5) / 50;
	          dy = (random.nextDouble() - 0.5) / 50;
	          dz = (random.nextDouble() - 0.5) / 50;
	          r = Math.sqrt(dx * dx + dy * dy + dz * dz);
	      }

	      var d = r - length;
	      var coeff = ((!spring.coeff || spring.coeff < 0) ? options.springCoeff : spring.coeff) * d / r * spring.weight;

	      body1.force.x += coeff * dx;
	      body1.force.y += coeff * dy;
	      body1.force.z += coeff * dz;

	      body2.force.x -= coeff * dx;
	      body2.force.y -= coeff * dy;
	      body2.force.z -= coeff * dz;
	    }
	  };

	  expose(options, api, ['springCoeff', 'springLength']);
	  return api;
	}


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(28);

	module.exports = function(pos) {
	  return new physics.Body3d(pos);
	}


/***/ }),
/* 50 */
/***/ (function(module, exports) {

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var tx = 0, ty = 0, tz = 0,
	      i, max = bodies.length;

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	      coeff = timeStep * timeStep / body.mass;

	    body.pos.x = 2 * body.pos.x - body.prevPos.x + body.force.x * coeff;
	    body.pos.y = 2 * body.pos.y - body.prevPos.y + body.force.y * coeff;
	    body.pos.z = 2 * body.pos.z - body.prevPos.z + body.force.z * coeff;

	    tx += Math.abs(body.pos.x - body.prevPos.x)
	    ty += Math.abs(body.pos.y - body.prevPos.y)
	    tz += Math.abs(body.pos.z - body.prevPos.z)
	  }

	  return (tx * tx + ty * ty + tz * tz)/bodies.length;
	}


/***/ }),
/* 51 */
/***/ (function(module, exports) {

	/**
	 * Performs 3d forces integration, using given timestep. Uses Euler method to solve
	 * differential equation (http://en.wikipedia.org/wiki/Euler_method ).
	 *
	 * @returns {Number} squared distance of total position updates.
	 */

	module.exports = integrate;

	function integrate(bodies, timeStep) {
	  var dx = 0, tx = 0,
	      dy = 0, ty = 0,
	      dz = 0, tz = 0,
	      i,
	      max = bodies.length;

	  for (i = 0; i < max; ++i) {
	    var body = bodies[i],
	        coeff = timeStep / body.mass;

	    body.velocity.x += coeff * body.force.x;
	    body.velocity.y += coeff * body.force.y;
	    body.velocity.z += coeff * body.force.z;

	    var vx = body.velocity.x,
	        vy = body.velocity.y,
	        vz = body.velocity.z,
	        v = Math.sqrt(vx * vx + vy * vy + vz * vz);

	    if (v > 1) {
	      body.velocity.x = vx / v;
	      body.velocity.y = vy / v;
	      body.velocity.z = vz / v;
	    }

	    dx = timeStep * body.velocity.x;
	    dy = timeStep * body.velocity.y;
	    dz = timeStep * body.velocity.z;

	    body.pos.x += dx;
	    body.pos.y += dy;
	    body.pos.z += dz;

	    tx += Math.abs(dx); ty += Math.abs(dy); tz += Math.abs(dz);
	  }

	  return (tx * tx + ty * ty + tz * tz)/bodies.length;
	}


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

	!function(n,t){ true?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Kapsule=t():n.Kapsule=t()}("undefined"!=typeof self?self:this,function(){return function(n){var t={};function e(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return n[r].call(o.exports,o,o.exports,e),o.l=!0,o.exports}return e.m=n,e.c=t,e.d=function(n,t,r){e.o(n,t)||Object.defineProperty(n,t,{configurable:!1,enumerable:!0,get:r})},e.n=function(n){var t=n&&n.__esModule?function(){return n.default}:function(){return n};return e.d(t,"a",t),t},e.o=function(n,t){return Object.prototype.hasOwnProperty.call(n,t)},e.p="",e(e.s=0)}([function(n,t,e){var r,o,i;u=function(n,t,e){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(n){var t=n.stateInit,e=void 0===t?function(){return{}}:t,r=n.props,a=void 0===r?{}:r,f=n.methods,l=void 0===f?{}:f,c=n.aliases,s=void 0===c?{}:c,d=n.init,p=void 0===d?function(){}:d,v=n.update,h=void 0===v?function(){}:v,y=Object.keys(a).map(function(n){return new u(n,a[n])});return function(){var n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=Object.assign({},e instanceof Function?e():e,{initialised:!1});function r(t){return u(t,n),a(),r}var u=function(n,e){p.call(r,n,t,e),t.initialised=!0},a=(0,o.default)(function(){t.initialised&&h.call(r,t)},1);return y.forEach(function(n){r[n.name]=function(n){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1],o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:function(n,t){};return function(i){return arguments.length?(t[n]=i,o.call(r,i,t),e&&a(),r):t[n]}}(n.name,n.triggerUpdate,n.onChange)}),Object.keys(l).forEach(function(n){r[n]=function(){for(var e,o=arguments.length,i=Array(o),u=0;u<o;u++)i[u]=arguments[u];return(e=l[n]).call.apply(e,[r,t].concat(i))}}),Object.entries(s).forEach(function(n){var t=i(n,2),e=t[0],o=t[1];return r[e]=r[o]}),r.resetProps=function(){return y.forEach(function(n){r[n.name](n.defaultVal)}),r},r.resetProps(),t._rerender=a,r}};var r,o=(r=e,r&&r.__esModule?r:{default:r});var i=function(){return function(n,t){if(Array.isArray(n))return n;if(Symbol.iterator in Object(n))return function(n,t){var e=[],r=!0,o=!1,i=void 0;try{for(var u,a=n[Symbol.iterator]();!(r=(u=a.next()).done)&&(e.push(u.value),!t||e.length!==t);r=!0);}catch(n){o=!0,i=n}finally{try{!r&&a.return&&a.return()}finally{if(o)throw i}}return e}(n,t);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}();var u=function n(t,e){var r=e.default,o=void 0===r?null:r,i=e.triggerUpdate,u=void 0===i||i,a=e.onChange,f=void 0===a?function(n,t){}:a;!function(n,t){if(!(n instanceof t))throw new TypeError("Cannot call a class as a function")}(this,n),this.name=t,this.defaultVal=o,this.triggerUpdate=u,this.onChange=f};n.exports=t.default},o=[n,t,e(1)],void 0===(i="function"==typeof(r=u)?r.apply(t,o):r)||(n.exports=i);var u},function(n,t){n.exports=function(n,t,e){var r,o,i,u,a;null==t&&(t=100);function f(){var l=Date.now()-u;l<t&&l>=0?r=setTimeout(f,t-l):(r=null,e||(a=n.apply(i,o),i=o=null))}var l=function(){i=this,o=arguments,u=Date.now();var l=e&&!r;return r||(r=setTimeout(f,t)),l&&(a=n.apply(i,o),i=o=null),a};return l.clear=function(){r&&(clearTimeout(r),r=null)},l.flush=function(){r&&(a=n.apply(i,o),i=o=null,clearTimeout(r),r=null)},l}}])});

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

	/*! qwest 4.5.0 (https://github.com/pyrsmk/qwest) */

	module.exports = function() {

	    var global = typeof window != 'undefined' ? window : self,
	        pinkyswear = __webpack_require__(54),
	        jparam = __webpack_require__(58),
	        defaultOptions = {},
	        // Default response type for XDR in auto mode
	        defaultXdrResponseType = 'json',
	        // Default data type
	        defaultDataType = 'post',
	        // Variables for limit mechanism
	        limit = null,
	        requests = 0,
	        request_stack = [],
	        // Get XMLHttpRequest object
	        getXHR = global.XMLHttpRequest? function(){
	            return new global.XMLHttpRequest();
	        }: function(){
	            return new ActiveXObject('Microsoft.XMLHTTP');
	        },
	        // Guess XHR version
	        xhr2 = (getXHR().responseType===''),

	    // Core function
	    qwest = function(method, url, data, options, before) {
	        // Format
	        method = method.toUpperCase();
	        data = data === undefined ? null : data;
	        options = options || {};
	        for(var name in defaultOptions) {
	            if(!(name in options)) {
	                if(typeof defaultOptions[name] == 'object' && typeof options[name] == 'object') {
	                    for(var name2 in defaultOptions[name]) {
	                        options[name][name2] = defaultOptions[name][name2];
	                    }
	                }
	                else {
	                    options[name] = defaultOptions[name];
	                }
	            }
	        }

	        // Define variables
	        var nativeResponseParsing = false,
	            crossOrigin,
	            xhr,
	            xdr = false,
	            timeout,
	            aborted = false,
	            attempts = 0,
	            headers = {},
	            mimeTypes = {
	                text: '*/*',
	                xml: 'text/xml',
	                json: 'application/json',
	                post: 'application/x-www-form-urlencoded',
	                document: 'text/html'
	            },
	            accept = {
	                text: '*/*',
	                xml: 'application/xml; q=1.0, text/xml; q=0.8, */*; q=0.1',
	                json: 'application/json; q=1.0, text/*; q=0.8, */*; q=0.1'
	            },
	            i, j,
	            response,
	            sending = false,

	        // Create the promise
	        promise = pinkyswear(function(pinky) {
	            pinky.abort = function() {
	                if(!aborted) {
	                    if(xhr && xhr.readyState != 4) { // https://stackoverflow.com/questions/7287706/ie-9-javascript-error-c00c023f
	                        xhr.abort();
	                    }
	                    if(sending) {
	                        --requests;
	                        sending = false;
	                    }
	                    aborted = true;
	                }
	            };
	            pinky.send = function() {
	                // Prevent further send() calls
	                if(sending) {
	                    return;
	                }
	                // Reached request limit, get out!
	                if(requests == limit) {
	                    request_stack.push(pinky);
	                    return;
	                }
	                // Verify if the request has not been previously aborted
	                if(aborted) {
	                    if(request_stack.length) {
	                        request_stack.shift().send();
	                    }
	                    return;
	                }
	                // The sending is running
	                ++requests;
	                sending = true;
	                // Get XHR object
	                xhr = getXHR();
	                if(crossOrigin) {
	                    if(!('withCredentials' in xhr) && global.XDomainRequest) {
	                        xhr = new XDomainRequest(); // CORS with IE8/9
	                        xdr = true;
	                        if(method != 'GET' && method != 'POST') {
	                            method = 'POST';
	                        }
	                    }
	                }
	                // Open connection
	                if(xdr) {
	                    xhr.open(method, url);
	                }
	                else {
	                    xhr.open(method, url, options.async, options.user, options.password);
	                    if(xhr2 && options.async) {
	                        xhr.withCredentials = options.withCredentials;
	                    }
	                }
	                // Set headers
	                if(!xdr) {
	                    for(var i in headers) {
	                        if(headers[i]) {
	                            xhr.setRequestHeader(i, headers[i]);
	                        }
	                    }
	                }
	                // Verify if the response type is supported by the current browser
	                if(xhr2 && options.responseType != 'auto') {
	                    try {
	                        xhr.responseType = options.responseType;
	                        nativeResponseParsing = (xhr.responseType == options.responseType);
	                    }
	                    catch(e) {}
	                }
	                // Plug response handler
	                if(xhr2 || xdr) {
	                    xhr.onload = handleResponse;
	                    xhr.onerror = handleError;
	                    // http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
	                    if(xdr) {
	                        xhr.onprogress = function() {};
	                    }
	                }
	                else {
	                    xhr.onreadystatechange = function() {
	                        if(xhr.readyState == 4) {
	                            handleResponse();
	                        }
	                    };
	                }
	                // Plug timeout
	                if(options.async) {
	                    if('timeout' in xhr) {
	                        xhr.timeout = options.timeout;
	                        xhr.ontimeout = handleTimeout;
	                    }
	                    else {
	                        timeout = setTimeout(handleTimeout, options.timeout);
	                    }
	                }
	                // http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
	                else if(xdr) {
	                    xhr.ontimeout = function() {};
	                }
	                // Override mime type to ensure the response is well parsed
	                if(options.responseType != 'auto' && 'overrideMimeType' in xhr) {
	                    xhr.overrideMimeType(mimeTypes[options.responseType]);
	                }
	                // Run 'before' callback
	                if(before) {
	                    before(xhr);
	                }
	                // Send request
	                if(xdr) {
	                    // https://developer.mozilla.org/en-US/docs/Web/API/XDomainRequest
	                    setTimeout(function() {
	                        xhr.send(method != 'GET'? data : null);
	                    }, 0);
	                }
	                else {
	                    xhr.send(method != 'GET' ? data : null);
	                }
	            };
	            return pinky;
	        }),

	        // Handle the response
	        handleResponse = function() {
	            var i, responseType;
	            // Stop sending state
	            sending = false;
	            clearTimeout(timeout);
	            // Launch next stacked request
	            if(request_stack.length) {
	                request_stack.shift().send();
	            }
	            // Verify if the request has not been previously aborted
	            if(aborted) {
	                return;
	            }
	            // Decrease the number of requests
	            --requests;
	            // Handle response
	            try{
	                // Process response
	                if(nativeResponseParsing) {
	                    if('response' in xhr && xhr.response === null) {
	                        throw 'The request response is empty';
	                    }
	                    response = xhr.response;
	                }
	                else {
	                    // Guess response type
	                    responseType = options.responseType;
	                    if(responseType == 'auto') {
	                        if(xdr) {
	                            responseType = defaultXdrResponseType;
	                        }
	                        else {
	                            var ct = xhr.getResponseHeader('Content-Type') || '';
	                            if(ct.indexOf(mimeTypes.json)>-1) {
	                                responseType = 'json';
	                            }
	                            else if(ct.indexOf(mimeTypes.xml) > -1) {
	                                responseType = 'xml';
	                            }
	                            else {
	                                responseType = 'text';
	                            }
	                        }
	                    }
	                    // Handle response type
	                    switch(responseType) {
	                        case 'json':
	                            if(xhr.responseText.length) {
	                                try {
	                                    if('JSON' in global) {
	                                        response = JSON.parse(xhr.responseText);
	                                    }
	                                    else {
	                                        response = new Function('return (' + xhr.responseText + ')')();
	                                    }
	                                }
	                                catch(e) {
	                                    throw "Error while parsing JSON body : "+e;
	                                }
	                            }
	                            break;
	                        case 'xml':
	                            // Based on jQuery's parseXML() function
	                            try {
	                                // Standard
	                                if(global.DOMParser) {
	                                    response = (new DOMParser()).parseFromString(xhr.responseText,'text/xml');
	                                }
	                                // IE<9
	                                else {
	                                    response = new ActiveXObject('Microsoft.XMLDOM');
	                                    response.async = 'false';
	                                    response.loadXML(xhr.responseText);
	                                }
	                            }
	                            catch(e) {
	                                response = undefined;
	                            }
	                            if(!response || !response.documentElement || response.getElementsByTagName('parsererror').length) {
	                                throw 'Invalid XML';
	                            }
	                            break;
	                        default:
	                            response = xhr.responseText;
	                    }
	                }
	                // Late status code verification to allow passing data when, per example, a 409 is returned
	                // --- https://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
	                if('status' in xhr && !/^2|1223/.test(xhr.status)) {
	                    throw xhr.status + ' (' + xhr.statusText + ')';
	                }
	                // Fulfilled
	                promise(true, [xhr, response]);
	            }
	            catch(e) {
	                // Rejected
	                promise(false, [e, xhr, response]);
	            }
	        },

	        // Handle errors
	        handleError = function(message) {
	            if(!aborted) {
	                message = typeof message == 'string' ? message : 'Connection aborted';
	                promise.abort();
	                promise(false, [new Error(message), xhr, null]);
	            }
	        },

	        // Handle timeouts
	        handleTimeout = function() {
	            if(!aborted) {
	                if(!options.attempts || ++attempts != options.attempts) {
	                    xhr.abort();
	                    sending = false;
	                    promise.send();
	                }
	                else {
	                    handleError('Timeout (' + url + ')');
	                }
	            }
	        };

	        // Normalize options
	        options.async = 'async' in options ? !!options.async : true;
	        options.cache = 'cache' in options ? !!options.cache : false;
	        options.dataType = 'dataType' in options ? options.dataType.toLowerCase() : defaultDataType;
	        options.responseType = 'responseType' in options ? options.responseType.toLowerCase() : 'auto';
	        options.user = options.user || '';
	        options.password = options.password || '';
	        options.withCredentials = !!options.withCredentials;
	        options.timeout = 'timeout' in options ? parseInt(options.timeout, 10) : 30000;
	        options.attempts = 'attempts' in options ? parseInt(options.attempts, 10) : 1;

	        // Guess if we're dealing with a cross-origin request
	        i = url.match(/\/\/(.+?)\//);
	        crossOrigin = i && (i[1] ? i[1] != location.host : false);

	        // Prepare data
	        if('ArrayBuffer' in global && data instanceof ArrayBuffer) {
	            options.dataType = 'arraybuffer';
	        }
	        else if('Blob' in global && data instanceof Blob) {
	            options.dataType = 'blob';
	        }
	        else if('Document' in global && data instanceof Document) {
	            options.dataType = 'document';
	        }
	        else if('FormData' in global && data instanceof FormData) {
	            options.dataType = 'formdata';
	        }
	        if(data !== null) {
	            switch(options.dataType) {
	                case 'json':
	                    data = JSON.stringify(data);
	                    break;
	                case 'post':
	                case 'queryString':
	                    data = jparam(data);
	            }
	        }

	        // Prepare headers
	        if(options.headers) {
	            var format = function(match,p1,p2) {
	                return p1 + p2.toUpperCase();
	            };
	            for(i in options.headers) {
	                headers[i.replace(/(^|-)([^-])/g,format)] = options.headers[i];
	            }
	        }
	        if(!('Content-Type' in headers) && method!='GET') {
	            if(options.dataType in mimeTypes) {
	                if(mimeTypes[options.dataType]) {
	                    headers['Content-Type'] = mimeTypes[options.dataType];
	                }
	            }
	        }
	        if(!headers.Accept) {
	            headers.Accept = (options.responseType in accept) ? accept[options.responseType] : '*/*';
	        }
	        if(!crossOrigin && !('X-Requested-With' in headers)) { // (that header breaks in legacy browsers with CORS)
	            headers['X-Requested-With'] = 'XMLHttpRequest';
	        }
	        if(!options.cache && !('Cache-Control' in headers)) {
	            headers['Cache-Control'] = 'no-cache';
	        }

	        // Prepare URL
	        if((method == 'GET' || options.dataType == 'queryString') && data && typeof data == 'string') {
	            url += (/\?/.test(url)?'&':'?') + data;
	        }

	        // Start the request
	        if(options.async) {
	            promise.send();
	        }

	        // Return promise
	        return promise;

	    };

	    // Define external qwest object
	    var getNewPromise = function(q) {
	            // Prepare
	            var promises = [],
	                loading = 0,
	                values = [];
	            // Create a new promise to handle all requests
	            return pinkyswear(function(pinky) {
	                // Basic request method
	                var method_index = -1,
	                    createMethod = function(method) {
	                        return function(url, data, options, before) {
	                            var index = ++method_index;
	                            ++loading;
	                            promises.push(qwest(method, pinky.base + url, data, options, before).then(function(xhr, response) {
	                                values[index] = arguments;
	                                if(!--loading) {
	                                    pinky(true, values.length == 1 ? values[0] : [values]);
	                                }
	                            }, function() {
	                                pinky(false, arguments);
	                            }));
	                            return pinky;
	                        };
	                    };
	                // Define external API
	                pinky.get = createMethod('GET');
	                pinky.post = createMethod('POST');
	                pinky.put = createMethod('PUT');
	                pinky['delete'] = createMethod('DELETE');
	                pinky['catch'] = function(f) {
	                    return pinky.then(null, f);
	                };
	                pinky.complete = function(f) {
	                    var func = function() {
	                        f(); // otherwise arguments will be passed to the callback
	                    };
	                    return pinky.then(func, func);
	                };
	                pinky.map = function(type, url, data, options, before) {
	                    return createMethod(type.toUpperCase()).call(this, url, data, options, before);
	                };
	                // Populate methods from external object
	                for(var prop in q) {
	                    if(!(prop in pinky)) {
	                        pinky[prop] = q[prop];
	                    }
	                }
	                // Set last methods
	                pinky.send = function() {
	                    for(var i=0, j=promises.length; i<j; ++i) {
	                        promises[i].send();
	                    }
	                    return pinky;
	                };
	                pinky.abort = function() {
	                    for(var i=0, j=promises.length; i<j; ++i) {
	                        promises[i].abort();
	                    }
	                    return pinky;
	                };
	                return pinky;
	            });
	        },
	        q = {
	            base: '',
	            get: function() {
	                return getNewPromise(q).get.apply(this, arguments);
	            },
	            post: function() {
	                return getNewPromise(q).post.apply(this, arguments);
	            },
	            put: function() {
	                return getNewPromise(q).put.apply(this, arguments);
	            },
	            'delete': function() {
	                return getNewPromise(q)['delete'].apply(this, arguments);
	            },
	            map: function() {
	                return getNewPromise(q).map.apply(this, arguments);
	            },
	            xhr2: xhr2,
	            limit: function(by) {
	                limit = by;
	                return q;
	            },
	            setDefaultOptions: function(options) {
	                defaultOptions = options;
	                return q;
	            },
	            setDefaultXdrResponseType: function(type) {
	                defaultXdrResponseType = type.toLowerCase();
	                return q;
	            },
	            setDefaultDataType: function(type) {
	                defaultDataType = type.toLowerCase();
	                return q;
	            },
	            getOpenRequests: function() {
	                return requests;
	            }
	        };

	    return q;

	}();


/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(setImmediate, process) {/*
	 * PinkySwear.js 2.2.2 - Minimalistic implementation of the Promises/A+ spec
	 * 
	 * Public Domain. Use, modify and distribute it any way you like. No attribution required.
	 *
	 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
	 *
	 * PinkySwear is a very small implementation of the Promises/A+ specification. After compilation with the
	 * Google Closure Compiler and gzipping it weighs less than 500 bytes. It is based on the implementation for 
	 * Minified.js and should be perfect for embedding. 
	 *
	 *
	 * PinkySwear has just three functions.
	 *
	 * To create a new promise in pending state, call pinkySwear():
	 *         var promise = pinkySwear();
	 *
	 * The returned object has a Promises/A+ compatible then() implementation:
	 *          promise.then(function(value) { alert("Success!"); }, function(value) { alert("Failure!"); });
	 *
	 *
	 * The promise returned by pinkySwear() is a function. To fulfill the promise, call the function with true as first argument and
	 * an optional array of values to pass to the then() handler. By putting more than one value in the array, you can pass more than one
	 * value to the then() handlers. Here an example to fulfill a promsise, this time with only one argument: 
	 *         promise(true, [42]);
	 *
	 * When the promise has been rejected, call it with false. Again, there may be more than one argument for the then() handler:
	 *         promise(true, [6, 6, 6]);
	 *         
	 * You can obtain the promise's current state by calling the function without arguments. It will be true if fulfilled,
	 * false if rejected, and otherwise undefined.
	 * 		   var state = promise(); 
	 * 
	 * https://github.com/timjansen/PinkySwear.js
	 */
	(function (root, factory) {
		if (true) {
			!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		} else if (typeof module === 'object' && module.exports) {
			module.exports = factory();
		} else {
			root.pinkySwear = factory();
		}
	}(this, function() {
		var undef;

		function isFunction(f) {
			return typeof f == 'function';
		}
		function isObject(f) {
			return typeof f == 'object';
		}
		function defer(callback) {
			if (typeof setImmediate != 'undefined')
				setImmediate(callback);
			else if (typeof process != 'undefined' && process['nextTick'])
				process['nextTick'](callback);
			else
				setTimeout(callback, 0);
		}

		return function pinkySwear(extend) {
			var state;           // undefined/null = pending, true = fulfilled, false = rejected
			var values = [];     // an array of values as arguments for the then() handlers
			var deferred = [];   // functions to call when set() is invoked

			var set = function(newState, newValues) {
				if (state == null && newState != null) {
					state = newState;
					values = newValues;
					if (deferred.length)
						defer(function() {
							for (var i = 0; i < deferred.length; i++)
								deferred[i]();
						});
				}
				return state;
			};

			set['then'] = function (onFulfilled, onRejected) {
				var promise2 = pinkySwear(extend);
				var callCallbacks = function() {
		    		try {
		    			var f = (state ? onFulfilled : onRejected);
		    			if (isFunction(f)) {
			   				function resolve(x) {
							    var then, cbCalled = 0;
			   					try {
					   				if (x && (isObject(x) || isFunction(x)) && isFunction(then = x['then'])) {
											if (x === promise2)
												throw new TypeError();
											then['call'](x,
												function() { if (!cbCalled++) resolve.apply(undef,arguments); } ,
												function(value){ if (!cbCalled++) promise2(false,[value]);});
					   				}
					   				else
					   					promise2(true, arguments);
			   					}
			   					catch(e) {
			   						if (!cbCalled++)
			   							promise2(false, [e]);
			   					}
			   				}
			   				resolve(f.apply(undef, values || []));
			   			}
			   			else
			   				promise2(state, values);
					}
					catch (e) {
						promise2(false, [e]);
					}
				};
				if (state != null)
					defer(callCallbacks);
				else
					deferred.push(callCallbacks);
				return promise2;
			};
	        if(extend){
	            set = extend(set);
	        }
			return set;
		};
	}));


	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(55).setImmediate, __webpack_require__(57)))

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

	var apply = Function.prototype.apply;

	// DOM APIs, for completeness

	exports.setTimeout = function() {
	  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
	};
	exports.setInterval = function() {
	  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
	};
	exports.clearTimeout =
	exports.clearInterval = function(timeout) {
	  if (timeout) {
	    timeout.close();
	  }
	};

	function Timeout(id, clearFn) {
	  this._id = id;
	  this._clearFn = clearFn;
	}
	Timeout.prototype.unref = Timeout.prototype.ref = function() {};
	Timeout.prototype.close = function() {
	  this._clearFn.call(window, this._id);
	};

	// Does not start the time, just sets up the members needed.
	exports.enroll = function(item, msecs) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = msecs;
	};

	exports.unenroll = function(item) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = -1;
	};

	exports._unrefActive = exports.active = function(item) {
	  clearTimeout(item._idleTimeoutId);

	  var msecs = item._idleTimeout;
	  if (msecs >= 0) {
	    item._idleTimeoutId = setTimeout(function onTimeout() {
	      if (item._onTimeout)
	        item._onTimeout();
	    }, msecs);
	  }
	};

	// setimmediate attaches itself to the global object
	__webpack_require__(56);
	exports.setImmediate = setImmediate;
	exports.clearImmediate = clearImmediate;


/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
	    "use strict";

	    if (global.setImmediate) {
	        return;
	    }

	    var nextHandle = 1; // Spec says greater than zero
	    var tasksByHandle = {};
	    var currentlyRunningATask = false;
	    var doc = global.document;
	    var registerImmediate;

	    function setImmediate(callback) {
	      // Callback can either be a function or a string
	      if (typeof callback !== "function") {
	        callback = new Function("" + callback);
	      }
	      // Copy function arguments
	      var args = new Array(arguments.length - 1);
	      for (var i = 0; i < args.length; i++) {
	          args[i] = arguments[i + 1];
	      }
	      // Store and register the task
	      var task = { callback: callback, args: args };
	      tasksByHandle[nextHandle] = task;
	      registerImmediate(nextHandle);
	      return nextHandle++;
	    }

	    function clearImmediate(handle) {
	        delete tasksByHandle[handle];
	    }

	    function run(task) {
	        var callback = task.callback;
	        var args = task.args;
	        switch (args.length) {
	        case 0:
	            callback();
	            break;
	        case 1:
	            callback(args[0]);
	            break;
	        case 2:
	            callback(args[0], args[1]);
	            break;
	        case 3:
	            callback(args[0], args[1], args[2]);
	            break;
	        default:
	            callback.apply(undefined, args);
	            break;
	        }
	    }

	    function runIfPresent(handle) {
	        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
	        // So if we're currently running a task, we'll need to delay this invocation.
	        if (currentlyRunningATask) {
	            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
	            // "too much recursion" error.
	            setTimeout(runIfPresent, 0, handle);
	        } else {
	            var task = tasksByHandle[handle];
	            if (task) {
	                currentlyRunningATask = true;
	                try {
	                    run(task);
	                } finally {
	                    clearImmediate(handle);
	                    currentlyRunningATask = false;
	                }
	            }
	        }
	    }

	    function installNextTickImplementation() {
	        registerImmediate = function(handle) {
	            process.nextTick(function () { runIfPresent(handle); });
	        };
	    }

	    function canUsePostMessage() {
	        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
	        // where `global.postMessage` means something completely different and can't be used for this purpose.
	        if (global.postMessage && !global.importScripts) {
	            var postMessageIsAsynchronous = true;
	            var oldOnMessage = global.onmessage;
	            global.onmessage = function() {
	                postMessageIsAsynchronous = false;
	            };
	            global.postMessage("", "*");
	            global.onmessage = oldOnMessage;
	            return postMessageIsAsynchronous;
	        }
	    }

	    function installPostMessageImplementation() {
	        // Installs an event handler on `global` for the `message` event: see
	        // * https://developer.mozilla.org/en/DOM/window.postMessage
	        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

	        var messagePrefix = "setImmediate$" + Math.random() + "$";
	        var onGlobalMessage = function(event) {
	            if (event.source === global &&
	                typeof event.data === "string" &&
	                event.data.indexOf(messagePrefix) === 0) {
	                runIfPresent(+event.data.slice(messagePrefix.length));
	            }
	        };

	        if (global.addEventListener) {
	            global.addEventListener("message", onGlobalMessage, false);
	        } else {
	            global.attachEvent("onmessage", onGlobalMessage);
	        }

	        registerImmediate = function(handle) {
	            global.postMessage(messagePrefix + handle, "*");
	        };
	    }

	    function installMessageChannelImplementation() {
	        var channel = new MessageChannel();
	        channel.port1.onmessage = function(event) {
	            var handle = event.data;
	            runIfPresent(handle);
	        };

	        registerImmediate = function(handle) {
	            channel.port2.postMessage(handle);
	        };
	    }

	    function installReadyStateChangeImplementation() {
	        var html = doc.documentElement;
	        registerImmediate = function(handle) {
	            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
	            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
	            var script = doc.createElement("script");
	            script.onreadystatechange = function () {
	                runIfPresent(handle);
	                script.onreadystatechange = null;
	                html.removeChild(script);
	                script = null;
	            };
	            html.appendChild(script);
	        };
	    }

	    function installSetTimeoutImplementation() {
	        registerImmediate = function(handle) {
	            setTimeout(runIfPresent, 0, handle);
	        };
	    }

	    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
	    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
	    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

	    // Don't get fooled by e.g. browserify environments.
	    if ({}.toString.call(global.process) === "[object process]") {
	        // For Node.js before 0.9
	        installNextTickImplementation();

	    } else if (canUsePostMessage()) {
	        // For non-IE10 modern browsers
	        installPostMessageImplementation();

	    } else if (global.MessageChannel) {
	        // For web workers, where supported
	        installMessageChannelImplementation();

	    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
	        // For IE 6–8
	        installReadyStateChangeImplementation();

	    } else {
	        // For older browsers
	        installSetTimeoutImplementation();
	    }

	    attachTo.setImmediate = setImmediate;
	    attachTo.clearImmediate = clearImmediate;
	}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(57)))

/***/ }),
/* 57 */
/***/ (function(module, exports) {

	// shim for using process in browser
	var process = module.exports = {};

	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.

	var cachedSetTimeout;
	var cachedClearTimeout;

	function defaultSetTimout() {
	    throw new Error('setTimeout has not been defined');
	}
	function defaultClearTimeout () {
	    throw new Error('clearTimeout has not been defined');
	}
	(function () {
	    try {
	        if (typeof setTimeout === 'function') {
	            cachedSetTimeout = setTimeout;
	        } else {
	            cachedSetTimeout = defaultSetTimout;
	        }
	    } catch (e) {
	        cachedSetTimeout = defaultSetTimout;
	    }
	    try {
	        if (typeof clearTimeout === 'function') {
	            cachedClearTimeout = clearTimeout;
	        } else {
	            cachedClearTimeout = defaultClearTimeout;
	        }
	    } catch (e) {
	        cachedClearTimeout = defaultClearTimeout;
	    }
	} ())
	function runTimeout(fun) {
	    if (cachedSetTimeout === setTimeout) {
	        //normal enviroments in sane situations
	        return setTimeout(fun, 0);
	    }
	    // if setTimeout wasn't available but was latter defined
	    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
	        cachedSetTimeout = setTimeout;
	        return setTimeout(fun, 0);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedSetTimeout(fun, 0);
	    } catch(e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
	            return cachedSetTimeout.call(null, fun, 0);
	        } catch(e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
	            return cachedSetTimeout.call(this, fun, 0);
	        }
	    }


	}
	function runClearTimeout(marker) {
	    if (cachedClearTimeout === clearTimeout) {
	        //normal enviroments in sane situations
	        return clearTimeout(marker);
	    }
	    // if clearTimeout wasn't available but was latter defined
	    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
	        cachedClearTimeout = clearTimeout;
	        return clearTimeout(marker);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedClearTimeout(marker);
	    } catch (e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
	            return cachedClearTimeout.call(null, marker);
	        } catch (e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
	            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
	            return cachedClearTimeout.call(this, marker);
	        }
	    }



	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = runTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    runClearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        runTimeout(drainQueue);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;
	process.prependListener = noop;
	process.prependOnceListener = noop;

	process.listeners = function (name) { return [] }

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * @preserve jquery-param (c) 2015 KNOWLEDGECODE | MIT
	 */
	/*global define */
	(function (global) {
	    'use strict';

	    var param = function (a) {
	        var add = function (s, k, v) {
	            v = typeof v === 'function' ? v() : v === null ? '' : v === undefined ? '' : v;
	            s[s.length] = encodeURIComponent(k) + '=' + encodeURIComponent(v);
	        }, buildParams = function (prefix, obj, s) {
	            var i, len, key;

	            if (Object.prototype.toString.call(obj) === '[object Array]') {
	                for (i = 0, len = obj.length; i < len; i++) {
	                    buildParams(prefix + '[' + (typeof obj[i] === 'object' ? i : '') + ']', obj[i], s);
	                }
	            } else if (obj && obj.toString() === '[object Object]') {
	                for (key in obj) {
	                    if (obj.hasOwnProperty(key)) {
	                        if (prefix) {
	                            buildParams(prefix + '[' + key + ']', obj[key], s, add);
	                        } else {
	                            buildParams(key, obj[key], s, add);
	                        }
	                    }
	                }
	            } else if (prefix) {
	                add(s, prefix, obj);
	            } else {
	                for (key in obj) {
	                    add(s, key, obj[key]);
	                }
	            }
	            return s;
	        };
	        return buildParams('', a, []).join('&').replace(/%20/g, '+');
	    };

	    if (typeof module === 'object' && typeof module.exports === 'object') {
	        module.exports = param;
	    } else if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {
	            return param;
	        }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else {
	        global.param = param;
	    }

	}(this));


/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-scale-chromatic/ Version 1.1.1. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports, __webpack_require__(60)) :
		typeof define === 'function' && define.amd ? define(['exports', 'd3-interpolate'], factory) :
		(factory((global.d3 = global.d3 || {}),global.d3));
	}(this, (function (exports,d3Interpolate) { 'use strict';

	var colors = function(specifier) {
	  var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
	  while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
	  return colors;
	};

	var Accent = colors("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666");

	var Dark2 = colors("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666");

	var Paired = colors("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928");

	var Pastel1 = colors("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2");

	var Pastel2 = colors("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc");

	var Set1 = colors("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999");

	var Set2 = colors("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3");

	var Set3 = colors("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f");

	var ramp = function(scheme) {
	  return d3Interpolate.interpolateRgbBasis(scheme[scheme.length - 1]);
	};

	var scheme = new Array(3).concat(
	  "d8b365f5f5f55ab4ac",
	  "a6611adfc27d80cdc1018571",
	  "a6611adfc27df5f5f580cdc1018571",
	  "8c510ad8b365f6e8c3c7eae55ab4ac01665e",
	  "8c510ad8b365f6e8c3f5f5f5c7eae55ab4ac01665e",
	  "8c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e",
	  "8c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e",
	  "5430058c510abf812ddfc27df6e8c3c7eae580cdc135978f01665e003c30",
	  "5430058c510abf812ddfc27df6e8c3f5f5f5c7eae580cdc135978f01665e003c30"
	).map(colors);

	var BrBG = ramp(scheme);

	var scheme$1 = new Array(3).concat(
	  "af8dc3f7f7f77fbf7b",
	  "7b3294c2a5cfa6dba0008837",
	  "7b3294c2a5cff7f7f7a6dba0008837",
	  "762a83af8dc3e7d4e8d9f0d37fbf7b1b7837",
	  "762a83af8dc3e7d4e8f7f7f7d9f0d37fbf7b1b7837",
	  "762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b7837",
	  "762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b7837",
	  "40004b762a839970abc2a5cfe7d4e8d9f0d3a6dba05aae611b783700441b",
	  "40004b762a839970abc2a5cfe7d4e8f7f7f7d9f0d3a6dba05aae611b783700441b"
	).map(colors);

	var PRGn = ramp(scheme$1);

	var scheme$2 = new Array(3).concat(
	  "e9a3c9f7f7f7a1d76a",
	  "d01c8bf1b6dab8e1864dac26",
	  "d01c8bf1b6daf7f7f7b8e1864dac26",
	  "c51b7de9a3c9fde0efe6f5d0a1d76a4d9221",
	  "c51b7de9a3c9fde0eff7f7f7e6f5d0a1d76a4d9221",
	  "c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221",
	  "c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221",
	  "8e0152c51b7dde77aef1b6dafde0efe6f5d0b8e1867fbc414d9221276419",
	  "8e0152c51b7dde77aef1b6dafde0eff7f7f7e6f5d0b8e1867fbc414d9221276419"
	).map(colors);

	var PiYG = ramp(scheme$2);

	var scheme$3 = new Array(3).concat(
	  "998ec3f7f7f7f1a340",
	  "5e3c99b2abd2fdb863e66101",
	  "5e3c99b2abd2f7f7f7fdb863e66101",
	  "542788998ec3d8daebfee0b6f1a340b35806",
	  "542788998ec3d8daebf7f7f7fee0b6f1a340b35806",
	  "5427888073acb2abd2d8daebfee0b6fdb863e08214b35806",
	  "5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b35806",
	  "2d004b5427888073acb2abd2d8daebfee0b6fdb863e08214b358067f3b08",
	  "2d004b5427888073acb2abd2d8daebf7f7f7fee0b6fdb863e08214b358067f3b08"
	).map(colors);

	var PuOr = ramp(scheme$3);

	var scheme$4 = new Array(3).concat(
	  "ef8a62f7f7f767a9cf",
	  "ca0020f4a58292c5de0571b0",
	  "ca0020f4a582f7f7f792c5de0571b0",
	  "b2182bef8a62fddbc7d1e5f067a9cf2166ac",
	  "b2182bef8a62fddbc7f7f7f7d1e5f067a9cf2166ac",
	  "b2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac",
	  "b2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac",
	  "67001fb2182bd6604df4a582fddbc7d1e5f092c5de4393c32166ac053061",
	  "67001fb2182bd6604df4a582fddbc7f7f7f7d1e5f092c5de4393c32166ac053061"
	).map(colors);

	var RdBu = ramp(scheme$4);

	var scheme$5 = new Array(3).concat(
	  "ef8a62ffffff999999",
	  "ca0020f4a582bababa404040",
	  "ca0020f4a582ffffffbababa404040",
	  "b2182bef8a62fddbc7e0e0e09999994d4d4d",
	  "b2182bef8a62fddbc7ffffffe0e0e09999994d4d4d",
	  "b2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d",
	  "b2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d",
	  "67001fb2182bd6604df4a582fddbc7e0e0e0bababa8787874d4d4d1a1a1a",
	  "67001fb2182bd6604df4a582fddbc7ffffffe0e0e0bababa8787874d4d4d1a1a1a"
	).map(colors);

	var RdGy = ramp(scheme$5);

	var scheme$6 = new Array(3).concat(
	  "fc8d59ffffbf91bfdb",
	  "d7191cfdae61abd9e92c7bb6",
	  "d7191cfdae61ffffbfabd9e92c7bb6",
	  "d73027fc8d59fee090e0f3f891bfdb4575b4",
	  "d73027fc8d59fee090ffffbfe0f3f891bfdb4575b4",
	  "d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4",
	  "d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4",
	  "a50026d73027f46d43fdae61fee090e0f3f8abd9e974add14575b4313695",
	  "a50026d73027f46d43fdae61fee090ffffbfe0f3f8abd9e974add14575b4313695"
	).map(colors);

	var RdYlBu = ramp(scheme$6);

	var scheme$7 = new Array(3).concat(
	  "fc8d59ffffbf91cf60",
	  "d7191cfdae61a6d96a1a9641",
	  "d7191cfdae61ffffbfa6d96a1a9641",
	  "d73027fc8d59fee08bd9ef8b91cf601a9850",
	  "d73027fc8d59fee08bffffbfd9ef8b91cf601a9850",
	  "d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850",
	  "d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850",
	  "a50026d73027f46d43fdae61fee08bd9ef8ba6d96a66bd631a9850006837",
	  "a50026d73027f46d43fdae61fee08bffffbfd9ef8ba6d96a66bd631a9850006837"
	).map(colors);

	var RdYlGn = ramp(scheme$7);

	var scheme$8 = new Array(3).concat(
	  "fc8d59ffffbf99d594",
	  "d7191cfdae61abdda42b83ba",
	  "d7191cfdae61ffffbfabdda42b83ba",
	  "d53e4ffc8d59fee08be6f59899d5943288bd",
	  "d53e4ffc8d59fee08bffffbfe6f59899d5943288bd",
	  "d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd",
	  "d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd",
	  "9e0142d53e4ff46d43fdae61fee08be6f598abdda466c2a53288bd5e4fa2",
	  "9e0142d53e4ff46d43fdae61fee08bffffbfe6f598abdda466c2a53288bd5e4fa2"
	).map(colors);

	var Spectral = ramp(scheme$8);

	var scheme$9 = new Array(3).concat(
	  "e5f5f999d8c92ca25f",
	  "edf8fbb2e2e266c2a4238b45",
	  "edf8fbb2e2e266c2a42ca25f006d2c",
	  "edf8fbccece699d8c966c2a42ca25f006d2c",
	  "edf8fbccece699d8c966c2a441ae76238b45005824",
	  "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45005824",
	  "f7fcfde5f5f9ccece699d8c966c2a441ae76238b45006d2c00441b"
	).map(colors);

	var BuGn = ramp(scheme$9);

	var scheme$10 = new Array(3).concat(
	  "e0ecf49ebcda8856a7",
	  "edf8fbb3cde38c96c688419d",
	  "edf8fbb3cde38c96c68856a7810f7c",
	  "edf8fbbfd3e69ebcda8c96c68856a7810f7c",
	  "edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b",
	  "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b",
	  "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b"
	).map(colors);

	var BuPu = ramp(scheme$10);

	var scheme$11 = new Array(3).concat(
	  "e0f3dba8ddb543a2ca",
	  "f0f9e8bae4bc7bccc42b8cbe",
	  "f0f9e8bae4bc7bccc443a2ca0868ac",
	  "f0f9e8ccebc5a8ddb57bccc443a2ca0868ac",
	  "f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e",
	  "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e",
	  "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081"
	).map(colors);

	var GnBu = ramp(scheme$11);

	var scheme$12 = new Array(3).concat(
	  "fee8c8fdbb84e34a33",
	  "fef0d9fdcc8afc8d59d7301f",
	  "fef0d9fdcc8afc8d59e34a33b30000",
	  "fef0d9fdd49efdbb84fc8d59e34a33b30000",
	  "fef0d9fdd49efdbb84fc8d59ef6548d7301f990000",
	  "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000",
	  "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000"
	).map(colors);

	var OrRd = ramp(scheme$12);

	var scheme$13 = new Array(3).concat(
	  "ece2f0a6bddb1c9099",
	  "f6eff7bdc9e167a9cf02818a",
	  "f6eff7bdc9e167a9cf1c9099016c59",
	  "f6eff7d0d1e6a6bddb67a9cf1c9099016c59",
	  "f6eff7d0d1e6a6bddb67a9cf3690c002818a016450",
	  "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450",
	  "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636"
	).map(colors);

	var PuBuGn = ramp(scheme$13);

	var scheme$14 = new Array(3).concat(
	  "ece7f2a6bddb2b8cbe",
	  "f1eef6bdc9e174a9cf0570b0",
	  "f1eef6bdc9e174a9cf2b8cbe045a8d",
	  "f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d",
	  "f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b",
	  "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b",
	  "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858"
	).map(colors);

	var PuBu = ramp(scheme$14);

	var scheme$15 = new Array(3).concat(
	  "e7e1efc994c7dd1c77",
	  "f1eef6d7b5d8df65b0ce1256",
	  "f1eef6d7b5d8df65b0dd1c77980043",
	  "f1eef6d4b9dac994c7df65b0dd1c77980043",
	  "f1eef6d4b9dac994c7df65b0e7298ace125691003f",
	  "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f",
	  "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f"
	).map(colors);

	var PuRd = ramp(scheme$15);

	var scheme$16 = new Array(3).concat(
	  "fde0ddfa9fb5c51b8a",
	  "feebe2fbb4b9f768a1ae017e",
	  "feebe2fbb4b9f768a1c51b8a7a0177",
	  "feebe2fcc5c0fa9fb5f768a1c51b8a7a0177",
	  "feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177",
	  "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177",
	  "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a"
	).map(colors);

	var RdPu = ramp(scheme$16);

	var scheme$17 = new Array(3).concat(
	  "edf8b17fcdbb2c7fb8",
	  "ffffcca1dab441b6c4225ea8",
	  "ffffcca1dab441b6c42c7fb8253494",
	  "ffffccc7e9b47fcdbb41b6c42c7fb8253494",
	  "ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84",
	  "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84",
	  "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58"
	).map(colors);

	var YlGnBu = ramp(scheme$17);

	var scheme$18 = new Array(3).concat(
	  "f7fcb9addd8e31a354",
	  "ffffccc2e69978c679238443",
	  "ffffccc2e69978c67931a354006837",
	  "ffffccd9f0a3addd8e78c67931a354006837",
	  "ffffccd9f0a3addd8e78c67941ab5d238443005a32",
	  "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32",
	  "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529"
	).map(colors);

	var YlGn = ramp(scheme$18);

	var scheme$19 = new Array(3).concat(
	  "fff7bcfec44fd95f0e",
	  "ffffd4fed98efe9929cc4c02",
	  "ffffd4fed98efe9929d95f0e993404",
	  "ffffd4fee391fec44ffe9929d95f0e993404",
	  "ffffd4fee391fec44ffe9929ec7014cc4c028c2d04",
	  "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04",
	  "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506"
	).map(colors);

	var YlOrBr = ramp(scheme$19);

	var scheme$20 = new Array(3).concat(
	  "ffeda0feb24cf03b20",
	  "ffffb2fecc5cfd8d3ce31a1c",
	  "ffffb2fecc5cfd8d3cf03b20bd0026",
	  "ffffb2fed976feb24cfd8d3cf03b20bd0026",
	  "ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026",
	  "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026",
	  "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026"
	).map(colors);

	var YlOrRd = ramp(scheme$20);

	var scheme$21 = new Array(3).concat(
	  "deebf79ecae13182bd",
	  "eff3ffbdd7e76baed62171b5",
	  "eff3ffbdd7e76baed63182bd08519c",
	  "eff3ffc6dbef9ecae16baed63182bd08519c",
	  "eff3ffc6dbef9ecae16baed64292c62171b5084594",
	  "f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594",
	  "f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b"
	).map(colors);

	var Blues = ramp(scheme$21);

	var scheme$22 = new Array(3).concat(
	  "e5f5e0a1d99b31a354",
	  "edf8e9bae4b374c476238b45",
	  "edf8e9bae4b374c47631a354006d2c",
	  "edf8e9c7e9c0a1d99b74c47631a354006d2c",
	  "edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32",
	  "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32",
	  "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b"
	).map(colors);

	var Greens = ramp(scheme$22);

	var scheme$23 = new Array(3).concat(
	  "f0f0f0bdbdbd636363",
	  "f7f7f7cccccc969696525252",
	  "f7f7f7cccccc969696636363252525",
	  "f7f7f7d9d9d9bdbdbd969696636363252525",
	  "f7f7f7d9d9d9bdbdbd969696737373525252252525",
	  "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525",
	  "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000"
	).map(colors);

	var Greys = ramp(scheme$23);

	var scheme$24 = new Array(3).concat(
	  "efedf5bcbddc756bb1",
	  "f2f0f7cbc9e29e9ac86a51a3",
	  "f2f0f7cbc9e29e9ac8756bb154278f",
	  "f2f0f7dadaebbcbddc9e9ac8756bb154278f",
	  "f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486",
	  "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486",
	  "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d"
	).map(colors);

	var Purples = ramp(scheme$24);

	var scheme$25 = new Array(3).concat(
	  "fee0d2fc9272de2d26",
	  "fee5d9fcae91fb6a4acb181d",
	  "fee5d9fcae91fb6a4ade2d26a50f15",
	  "fee5d9fcbba1fc9272fb6a4ade2d26a50f15",
	  "fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d",
	  "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d",
	  "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d"
	).map(colors);

	var Reds = ramp(scheme$25);

	var scheme$26 = new Array(3).concat(
	  "fee6cefdae6be6550d",
	  "feeddefdbe85fd8d3cd94701",
	  "feeddefdbe85fd8d3ce6550da63603",
	  "feeddefdd0a2fdae6bfd8d3ce6550da63603",
	  "feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04",
	  "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04",
	  "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704"
	).map(colors);

	var Oranges = ramp(scheme$26);

	exports.schemeAccent = Accent;
	exports.schemeDark2 = Dark2;
	exports.schemePaired = Paired;
	exports.schemePastel1 = Pastel1;
	exports.schemePastel2 = Pastel2;
	exports.schemeSet1 = Set1;
	exports.schemeSet2 = Set2;
	exports.schemeSet3 = Set3;
	exports.interpolateBrBG = BrBG;
	exports.schemeBrBG = scheme;
	exports.interpolatePRGn = PRGn;
	exports.schemePRGn = scheme$1;
	exports.interpolatePiYG = PiYG;
	exports.schemePiYG = scheme$2;
	exports.interpolatePuOr = PuOr;
	exports.schemePuOr = scheme$3;
	exports.interpolateRdBu = RdBu;
	exports.schemeRdBu = scheme$4;
	exports.interpolateRdGy = RdGy;
	exports.schemeRdGy = scheme$5;
	exports.interpolateRdYlBu = RdYlBu;
	exports.schemeRdYlBu = scheme$6;
	exports.interpolateRdYlGn = RdYlGn;
	exports.schemeRdYlGn = scheme$7;
	exports.interpolateSpectral = Spectral;
	exports.schemeSpectral = scheme$8;
	exports.interpolateBuGn = BuGn;
	exports.schemeBuGn = scheme$9;
	exports.interpolateBuPu = BuPu;
	exports.schemeBuPu = scheme$10;
	exports.interpolateGnBu = GnBu;
	exports.schemeGnBu = scheme$11;
	exports.interpolateOrRd = OrRd;
	exports.schemeOrRd = scheme$12;
	exports.interpolatePuBuGn = PuBuGn;
	exports.schemePuBuGn = scheme$13;
	exports.interpolatePuBu = PuBu;
	exports.schemePuBu = scheme$14;
	exports.interpolatePuRd = PuRd;
	exports.schemePuRd = scheme$15;
	exports.interpolateRdPu = RdPu;
	exports.schemeRdPu = scheme$16;
	exports.interpolateYlGnBu = YlGnBu;
	exports.schemeYlGnBu = scheme$17;
	exports.interpolateYlGn = YlGn;
	exports.schemeYlGn = scheme$18;
	exports.interpolateYlOrBr = YlOrBr;
	exports.schemeYlOrBr = scheme$19;
	exports.interpolateYlOrRd = YlOrRd;
	exports.schemeYlOrRd = scheme$20;
	exports.interpolateBlues = Blues;
	exports.schemeBlues = scheme$21;
	exports.interpolateGreens = Greens;
	exports.schemeGreens = scheme$22;
	exports.interpolateGreys = Greys;
	exports.schemeGreys = scheme$23;
	exports.interpolatePurples = Purples;
	exports.schemePurples = scheme$24;
	exports.interpolateReds = Reds;
	exports.schemeReds = scheme$25;
	exports.interpolateOranges = Oranges;
	exports.schemeOranges = scheme$26;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-interpolate/ Version 1.1.6. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports, __webpack_require__(61)) :
		typeof define === 'function' && define.amd ? define(['exports', 'd3-color'], factory) :
		(factory((global.d3 = global.d3 || {}),global.d3));
	}(this, (function (exports,d3Color) { 'use strict';

	function basis(t1, v0, v1, v2, v3) {
	  var t2 = t1 * t1, t3 = t2 * t1;
	  return ((1 - 3 * t1 + 3 * t2 - t3) * v0
	      + (4 - 6 * t2 + 3 * t3) * v1
	      + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
	      + t3 * v3) / 6;
	}

	var basis$1 = function(values) {
	  var n = values.length - 1;
	  return function(t) {
	    var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
	        v1 = values[i],
	        v2 = values[i + 1],
	        v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
	        v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
	    return basis((t - i / n) * n, v0, v1, v2, v3);
	  };
	};

	var basisClosed = function(values) {
	  var n = values.length;
	  return function(t) {
	    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n),
	        v0 = values[(i + n - 1) % n],
	        v1 = values[i % n],
	        v2 = values[(i + 1) % n],
	        v3 = values[(i + 2) % n];
	    return basis((t - i / n) * n, v0, v1, v2, v3);
	  };
	};

	var constant = function(x) {
	  return function() {
	    return x;
	  };
	};

	function linear(a, d) {
	  return function(t) {
	    return a + t * d;
	  };
	}

	function exponential(a, b, y) {
	  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
	    return Math.pow(a + t * b, y);
	  };
	}

	function hue(a, b) {
	  var d = b - a;
	  return d ? linear(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant(isNaN(a) ? b : a);
	}

	function gamma(y) {
	  return (y = +y) === 1 ? nogamma : function(a, b) {
	    return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
	  };
	}

	function nogamma(a, b) {
	  var d = b - a;
	  return d ? linear(a, d) : constant(isNaN(a) ? b : a);
	}

	var rgb$1 = ((function rgbGamma(y) {
	  var color$$1 = gamma(y);

	  function rgb$$1(start, end) {
	    var r = color$$1((start = d3Color.rgb(start)).r, (end = d3Color.rgb(end)).r),
	        g = color$$1(start.g, end.g),
	        b = color$$1(start.b, end.b),
	        opacity = nogamma(start.opacity, end.opacity);
	    return function(t) {
	      start.r = r(t);
	      start.g = g(t);
	      start.b = b(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }

	  rgb$$1.gamma = rgbGamma;

	  return rgb$$1;
	}))(1);

	function rgbSpline(spline) {
	  return function(colors) {
	    var n = colors.length,
	        r = new Array(n),
	        g = new Array(n),
	        b = new Array(n),
	        i, color$$1;
	    for (i = 0; i < n; ++i) {
	      color$$1 = d3Color.rgb(colors[i]);
	      r[i] = color$$1.r || 0;
	      g[i] = color$$1.g || 0;
	      b[i] = color$$1.b || 0;
	    }
	    r = spline(r);
	    g = spline(g);
	    b = spline(b);
	    color$$1.opacity = 1;
	    return function(t) {
	      color$$1.r = r(t);
	      color$$1.g = g(t);
	      color$$1.b = b(t);
	      return color$$1 + "";
	    };
	  };
	}

	var rgbBasis = rgbSpline(basis$1);
	var rgbBasisClosed = rgbSpline(basisClosed);

	var array = function(a, b) {
	  var nb = b ? b.length : 0,
	      na = a ? Math.min(nb, a.length) : 0,
	      x = new Array(na),
	      c = new Array(nb),
	      i;

	  for (i = 0; i < na; ++i) x[i] = value(a[i], b[i]);
	  for (; i < nb; ++i) c[i] = b[i];

	  return function(t) {
	    for (i = 0; i < na; ++i) c[i] = x[i](t);
	    return c;
	  };
	};

	var date = function(a, b) {
	  var d = new Date;
	  return a = +a, b -= a, function(t) {
	    return d.setTime(a + b * t), d;
	  };
	};

	var number = function(a, b) {
	  return a = +a, b -= a, function(t) {
	    return a + b * t;
	  };
	};

	var object = function(a, b) {
	  var i = {},
	      c = {},
	      k;

	  if (a === null || typeof a !== "object") a = {};
	  if (b === null || typeof b !== "object") b = {};

	  for (k in b) {
	    if (k in a) {
	      i[k] = value(a[k], b[k]);
	    } else {
	      c[k] = b[k];
	    }
	  }

	  return function(t) {
	    for (k in i) c[k] = i[k](t);
	    return c;
	  };
	};

	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
	var reB = new RegExp(reA.source, "g");

	function zero(b) {
	  return function() {
	    return b;
	  };
	}

	function one(b) {
	  return function(t) {
	    return b(t) + "";
	  };
	}

	var string = function(a, b) {
	  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
	      am, // current match in a
	      bm, // current match in b
	      bs, // string preceding current number in b, if any
	      i = -1, // index in s
	      s = [], // string constants and placeholders
	      q = []; // number interpolators

	  // Coerce inputs to strings.
	  a = a + "", b = b + "";

	  // Interpolate pairs of numbers in a & b.
	  while ((am = reA.exec(a))
	      && (bm = reB.exec(b))) {
	    if ((bs = bm.index) > bi) { // a string precedes the next number in b
	      bs = b.slice(bi, bs);
	      if (s[i]) s[i] += bs; // coalesce with previous string
	      else s[++i] = bs;
	    }
	    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
	      if (s[i]) s[i] += bm; // coalesce with previous string
	      else s[++i] = bm;
	    } else { // interpolate non-matching numbers
	      s[++i] = null;
	      q.push({i: i, x: number(am, bm)});
	    }
	    bi = reB.lastIndex;
	  }

	  // Add remains of b.
	  if (bi < b.length) {
	    bs = b.slice(bi);
	    if (s[i]) s[i] += bs; // coalesce with previous string
	    else s[++i] = bs;
	  }

	  // Special optimization for only a single match.
	  // Otherwise, interpolate each of the numbers and rejoin the string.
	  return s.length < 2 ? (q[0]
	      ? one(q[0].x)
	      : zero(b))
	      : (b = q.length, function(t) {
	          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
	          return s.join("");
	        });
	};

	var value = function(a, b) {
	  var t = typeof b, c;
	  return b == null || t === "boolean" ? constant(b)
	      : (t === "number" ? number
	      : t === "string" ? ((c = d3Color.color(b)) ? (b = c, rgb$1) : string)
	      : b instanceof d3Color.color ? rgb$1
	      : b instanceof Date ? date
	      : Array.isArray(b) ? array
	      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
	      : number)(a, b);
	};

	var round = function(a, b) {
	  return a = +a, b -= a, function(t) {
	    return Math.round(a + b * t);
	  };
	};

	var degrees = 180 / Math.PI;

	var identity = {
	  translateX: 0,
	  translateY: 0,
	  rotate: 0,
	  skewX: 0,
	  scaleX: 1,
	  scaleY: 1
	};

	var decompose = function(a, b, c, d, e, f) {
	  var scaleX, scaleY, skewX;
	  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
	  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
	  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
	  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
	  return {
	    translateX: e,
	    translateY: f,
	    rotate: Math.atan2(b, a) * degrees,
	    skewX: Math.atan(skewX) * degrees,
	    scaleX: scaleX,
	    scaleY: scaleY
	  };
	};

	var cssNode;
	var cssRoot;
	var cssView;
	var svgNode;

	function parseCss(value) {
	  if (value === "none") return identity;
	  if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
	  cssNode.style.transform = value;
	  value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
	  cssRoot.removeChild(cssNode);
	  value = value.slice(7, -1).split(",");
	  return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
	}

	function parseSvg(value) {
	  if (value == null) return identity;
	  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
	  svgNode.setAttribute("transform", value);
	  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
	  value = value.matrix;
	  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
	}

	function interpolateTransform(parse, pxComma, pxParen, degParen) {

	  function pop(s) {
	    return s.length ? s.pop() + " " : "";
	  }

	  function translate(xa, ya, xb, yb, s, q) {
	    if (xa !== xb || ya !== yb) {
	      var i = s.push("translate(", null, pxComma, null, pxParen);
	      q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
	    } else if (xb || yb) {
	      s.push("translate(" + xb + pxComma + yb + pxParen);
	    }
	  }

	  function rotate(a, b, s, q) {
	    if (a !== b) {
	      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
	      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number(a, b)});
	    } else if (b) {
	      s.push(pop(s) + "rotate(" + b + degParen);
	    }
	  }

	  function skewX(a, b, s, q) {
	    if (a !== b) {
	      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number(a, b)});
	    } else if (b) {
	      s.push(pop(s) + "skewX(" + b + degParen);
	    }
	  }

	  function scale(xa, ya, xb, yb, s, q) {
	    if (xa !== xb || ya !== yb) {
	      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
	      q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
	    } else if (xb !== 1 || yb !== 1) {
	      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
	    }
	  }

	  return function(a, b) {
	    var s = [], // string constants and placeholders
	        q = []; // number interpolators
	    a = parse(a), b = parse(b);
	    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
	    rotate(a.rotate, b.rotate, s, q);
	    skewX(a.skewX, b.skewX, s, q);
	    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
	    a = b = null; // gc
	    return function(t) {
	      var i = -1, n = q.length, o;
	      while (++i < n) s[(o = q[i]).i] = o.x(t);
	      return s.join("");
	    };
	  };
	}

	var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
	var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

	var rho = Math.SQRT2;
	var rho2 = 2;
	var rho4 = 4;
	var epsilon2 = 1e-12;

	function cosh(x) {
	  return ((x = Math.exp(x)) + 1 / x) / 2;
	}

	function sinh(x) {
	  return ((x = Math.exp(x)) - 1 / x) / 2;
	}

	function tanh(x) {
	  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
	}

	// p0 = [ux0, uy0, w0]
	// p1 = [ux1, uy1, w1]
	var zoom = function(p0, p1) {
	  var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
	      ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
	      dx = ux1 - ux0,
	      dy = uy1 - uy0,
	      d2 = dx * dx + dy * dy,
	      i,
	      S;

	  // Special case for u0 ≅ u1.
	  if (d2 < epsilon2) {
	    S = Math.log(w1 / w0) / rho;
	    i = function(t) {
	      return [
	        ux0 + t * dx,
	        uy0 + t * dy,
	        w0 * Math.exp(rho * t * S)
	      ];
	    };
	  }

	  // General case.
	  else {
	    var d1 = Math.sqrt(d2),
	        b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
	        b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
	        r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
	        r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
	    S = (r1 - r0) / rho;
	    i = function(t) {
	      var s = t * S,
	          coshr0 = cosh(r0),
	          u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
	      return [
	        ux0 + u * dx,
	        uy0 + u * dy,
	        w0 * coshr0 / cosh(rho * s + r0)
	      ];
	    };
	  }

	  i.duration = S * 1000;

	  return i;
	};

	function hsl$1(hue$$1) {
	  return function(start, end) {
	    var h = hue$$1((start = d3Color.hsl(start)).h, (end = d3Color.hsl(end)).h),
	        s = nogamma(start.s, end.s),
	        l = nogamma(start.l, end.l),
	        opacity = nogamma(start.opacity, end.opacity);
	    return function(t) {
	      start.h = h(t);
	      start.s = s(t);
	      start.l = l(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }
	}

	var hsl$2 = hsl$1(hue);
	var hslLong = hsl$1(nogamma);

	function lab$1(start, end) {
	  var l = nogamma((start = d3Color.lab(start)).l, (end = d3Color.lab(end)).l),
	      a = nogamma(start.a, end.a),
	      b = nogamma(start.b, end.b),
	      opacity = nogamma(start.opacity, end.opacity);
	  return function(t) {
	    start.l = l(t);
	    start.a = a(t);
	    start.b = b(t);
	    start.opacity = opacity(t);
	    return start + "";
	  };
	}

	function hcl$1(hue$$1) {
	  return function(start, end) {
	    var h = hue$$1((start = d3Color.hcl(start)).h, (end = d3Color.hcl(end)).h),
	        c = nogamma(start.c, end.c),
	        l = nogamma(start.l, end.l),
	        opacity = nogamma(start.opacity, end.opacity);
	    return function(t) {
	      start.h = h(t);
	      start.c = c(t);
	      start.l = l(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }
	}

	var hcl$2 = hcl$1(hue);
	var hclLong = hcl$1(nogamma);

	function cubehelix$1(hue$$1) {
	  return (function cubehelixGamma(y) {
	    y = +y;

	    function cubehelix$$1(start, end) {
	      var h = hue$$1((start = d3Color.cubehelix(start)).h, (end = d3Color.cubehelix(end)).h),
	          s = nogamma(start.s, end.s),
	          l = nogamma(start.l, end.l),
	          opacity = nogamma(start.opacity, end.opacity);
	      return function(t) {
	        start.h = h(t);
	        start.s = s(t);
	        start.l = l(Math.pow(t, y));
	        start.opacity = opacity(t);
	        return start + "";
	      };
	    }

	    cubehelix$$1.gamma = cubehelixGamma;

	    return cubehelix$$1;
	  })(1);
	}

	var cubehelix$2 = cubehelix$1(hue);
	var cubehelixLong = cubehelix$1(nogamma);

	var quantize = function(interpolator, n) {
	  var samples = new Array(n);
	  for (var i = 0; i < n; ++i) samples[i] = interpolator(i / (n - 1));
	  return samples;
	};

	exports.interpolate = value;
	exports.interpolateArray = array;
	exports.interpolateBasis = basis$1;
	exports.interpolateBasisClosed = basisClosed;
	exports.interpolateDate = date;
	exports.interpolateNumber = number;
	exports.interpolateObject = object;
	exports.interpolateRound = round;
	exports.interpolateString = string;
	exports.interpolateTransformCss = interpolateTransformCss;
	exports.interpolateTransformSvg = interpolateTransformSvg;
	exports.interpolateZoom = zoom;
	exports.interpolateRgb = rgb$1;
	exports.interpolateRgbBasis = rgbBasis;
	exports.interpolateRgbBasisClosed = rgbBasisClosed;
	exports.interpolateHsl = hsl$2;
	exports.interpolateHslLong = hslLong;
	exports.interpolateLab = lab$1;
	exports.interpolateHcl = hcl$2;
	exports.interpolateHclLong = hclLong;
	exports.interpolateCubehelix = cubehelix$2;
	exports.interpolateCubehelixLong = cubehelixLong;
	exports.quantize = quantize;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-color/ Version 1.0.3. Copyright 2017 Mike Bostock.
	(function (global, factory) {
		 true ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var define = function(constructor, factory, prototype) {
	  constructor.prototype = factory.prototype = prototype;
	  prototype.constructor = constructor;
	};

	function extend(parent, definition) {
	  var prototype = Object.create(parent.prototype);
	  for (var key in definition) prototype[key] = definition[key];
	  return prototype;
	}

	function Color() {}

	var darker = 0.7;
	var brighter = 1 / darker;

	var reI = "\\s*([+-]?\\d+)\\s*";
	var reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*";
	var reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
	var reHex3 = /^#([0-9a-f]{3})$/;
	var reHex6 = /^#([0-9a-f]{6})$/;
	var reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$");
	var reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$");
	var reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$");
	var reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$");
	var reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$");
	var reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

	var named = {
	  aliceblue: 0xf0f8ff,
	  antiquewhite: 0xfaebd7,
	  aqua: 0x00ffff,
	  aquamarine: 0x7fffd4,
	  azure: 0xf0ffff,
	  beige: 0xf5f5dc,
	  bisque: 0xffe4c4,
	  black: 0x000000,
	  blanchedalmond: 0xffebcd,
	  blue: 0x0000ff,
	  blueviolet: 0x8a2be2,
	  brown: 0xa52a2a,
	  burlywood: 0xdeb887,
	  cadetblue: 0x5f9ea0,
	  chartreuse: 0x7fff00,
	  chocolate: 0xd2691e,
	  coral: 0xff7f50,
	  cornflowerblue: 0x6495ed,
	  cornsilk: 0xfff8dc,
	  crimson: 0xdc143c,
	  cyan: 0x00ffff,
	  darkblue: 0x00008b,
	  darkcyan: 0x008b8b,
	  darkgoldenrod: 0xb8860b,
	  darkgray: 0xa9a9a9,
	  darkgreen: 0x006400,
	  darkgrey: 0xa9a9a9,
	  darkkhaki: 0xbdb76b,
	  darkmagenta: 0x8b008b,
	  darkolivegreen: 0x556b2f,
	  darkorange: 0xff8c00,
	  darkorchid: 0x9932cc,
	  darkred: 0x8b0000,
	  darksalmon: 0xe9967a,
	  darkseagreen: 0x8fbc8f,
	  darkslateblue: 0x483d8b,
	  darkslategray: 0x2f4f4f,
	  darkslategrey: 0x2f4f4f,
	  darkturquoise: 0x00ced1,
	  darkviolet: 0x9400d3,
	  deeppink: 0xff1493,
	  deepskyblue: 0x00bfff,
	  dimgray: 0x696969,
	  dimgrey: 0x696969,
	  dodgerblue: 0x1e90ff,
	  firebrick: 0xb22222,
	  floralwhite: 0xfffaf0,
	  forestgreen: 0x228b22,
	  fuchsia: 0xff00ff,
	  gainsboro: 0xdcdcdc,
	  ghostwhite: 0xf8f8ff,
	  gold: 0xffd700,
	  goldenrod: 0xdaa520,
	  gray: 0x808080,
	  green: 0x008000,
	  greenyellow: 0xadff2f,
	  grey: 0x808080,
	  honeydew: 0xf0fff0,
	  hotpink: 0xff69b4,
	  indianred: 0xcd5c5c,
	  indigo: 0x4b0082,
	  ivory: 0xfffff0,
	  khaki: 0xf0e68c,
	  lavender: 0xe6e6fa,
	  lavenderblush: 0xfff0f5,
	  lawngreen: 0x7cfc00,
	  lemonchiffon: 0xfffacd,
	  lightblue: 0xadd8e6,
	  lightcoral: 0xf08080,
	  lightcyan: 0xe0ffff,
	  lightgoldenrodyellow: 0xfafad2,
	  lightgray: 0xd3d3d3,
	  lightgreen: 0x90ee90,
	  lightgrey: 0xd3d3d3,
	  lightpink: 0xffb6c1,
	  lightsalmon: 0xffa07a,
	  lightseagreen: 0x20b2aa,
	  lightskyblue: 0x87cefa,
	  lightslategray: 0x778899,
	  lightslategrey: 0x778899,
	  lightsteelblue: 0xb0c4de,
	  lightyellow: 0xffffe0,
	  lime: 0x00ff00,
	  limegreen: 0x32cd32,
	  linen: 0xfaf0e6,
	  magenta: 0xff00ff,
	  maroon: 0x800000,
	  mediumaquamarine: 0x66cdaa,
	  mediumblue: 0x0000cd,
	  mediumorchid: 0xba55d3,
	  mediumpurple: 0x9370db,
	  mediumseagreen: 0x3cb371,
	  mediumslateblue: 0x7b68ee,
	  mediumspringgreen: 0x00fa9a,
	  mediumturquoise: 0x48d1cc,
	  mediumvioletred: 0xc71585,
	  midnightblue: 0x191970,
	  mintcream: 0xf5fffa,
	  mistyrose: 0xffe4e1,
	  moccasin: 0xffe4b5,
	  navajowhite: 0xffdead,
	  navy: 0x000080,
	  oldlace: 0xfdf5e6,
	  olive: 0x808000,
	  olivedrab: 0x6b8e23,
	  orange: 0xffa500,
	  orangered: 0xff4500,
	  orchid: 0xda70d6,
	  palegoldenrod: 0xeee8aa,
	  palegreen: 0x98fb98,
	  paleturquoise: 0xafeeee,
	  palevioletred: 0xdb7093,
	  papayawhip: 0xffefd5,
	  peachpuff: 0xffdab9,
	  peru: 0xcd853f,
	  pink: 0xffc0cb,
	  plum: 0xdda0dd,
	  powderblue: 0xb0e0e6,
	  purple: 0x800080,
	  rebeccapurple: 0x663399,
	  red: 0xff0000,
	  rosybrown: 0xbc8f8f,
	  royalblue: 0x4169e1,
	  saddlebrown: 0x8b4513,
	  salmon: 0xfa8072,
	  sandybrown: 0xf4a460,
	  seagreen: 0x2e8b57,
	  seashell: 0xfff5ee,
	  sienna: 0xa0522d,
	  silver: 0xc0c0c0,
	  skyblue: 0x87ceeb,
	  slateblue: 0x6a5acd,
	  slategray: 0x708090,
	  slategrey: 0x708090,
	  snow: 0xfffafa,
	  springgreen: 0x00ff7f,
	  steelblue: 0x4682b4,
	  tan: 0xd2b48c,
	  teal: 0x008080,
	  thistle: 0xd8bfd8,
	  tomato: 0xff6347,
	  turquoise: 0x40e0d0,
	  violet: 0xee82ee,
	  wheat: 0xf5deb3,
	  white: 0xffffff,
	  whitesmoke: 0xf5f5f5,
	  yellow: 0xffff00,
	  yellowgreen: 0x9acd32
	};

	define(Color, color, {
	  displayable: function() {
	    return this.rgb().displayable();
	  },
	  toString: function() {
	    return this.rgb() + "";
	  }
	});

	function color(format) {
	  var m;
	  format = (format + "").trim().toLowerCase();
	  return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1)) // #f00
	      : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
	      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
	      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
	      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
	      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
	      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
	      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
	      : named.hasOwnProperty(format) ? rgbn(named[format])
	      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
	      : null;
	}

	function rgbn(n) {
	  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
	}

	function rgba(r, g, b, a) {
	  if (a <= 0) r = g = b = NaN;
	  return new Rgb(r, g, b, a);
	}

	function rgbConvert(o) {
	  if (!(o instanceof Color)) o = color(o);
	  if (!o) return new Rgb;
	  o = o.rgb();
	  return new Rgb(o.r, o.g, o.b, o.opacity);
	}

	function rgb(r, g, b, opacity) {
	  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
	}

	function Rgb(r, g, b, opacity) {
	  this.r = +r;
	  this.g = +g;
	  this.b = +b;
	  this.opacity = +opacity;
	}

	define(Rgb, rgb, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
	  },
	  rgb: function() {
	    return this;
	  },
	  displayable: function() {
	    return (0 <= this.r && this.r <= 255)
	        && (0 <= this.g && this.g <= 255)
	        && (0 <= this.b && this.b <= 255)
	        && (0 <= this.opacity && this.opacity <= 1);
	  },
	  toString: function() {
	    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
	    return (a === 1 ? "rgb(" : "rgba(")
	        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
	        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
	        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
	        + (a === 1 ? ")" : ", " + a + ")");
	  }
	}));

	function hsla(h, s, l, a) {
	  if (a <= 0) h = s = l = NaN;
	  else if (l <= 0 || l >= 1) h = s = NaN;
	  else if (s <= 0) h = NaN;
	  return new Hsl(h, s, l, a);
	}

	function hslConvert(o) {
	  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
	  if (!(o instanceof Color)) o = color(o);
	  if (!o) return new Hsl;
	  if (o instanceof Hsl) return o;
	  o = o.rgb();
	  var r = o.r / 255,
	      g = o.g / 255,
	      b = o.b / 255,
	      min = Math.min(r, g, b),
	      max = Math.max(r, g, b),
	      h = NaN,
	      s = max - min,
	      l = (max + min) / 2;
	  if (s) {
	    if (r === max) h = (g - b) / s + (g < b) * 6;
	    else if (g === max) h = (b - r) / s + 2;
	    else h = (r - g) / s + 4;
	    s /= l < 0.5 ? max + min : 2 - max - min;
	    h *= 60;
	  } else {
	    s = l > 0 && l < 1 ? 0 : h;
	  }
	  return new Hsl(h, s, l, o.opacity);
	}

	function hsl(h, s, l, opacity) {
	  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
	}

	function Hsl(h, s, l, opacity) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Hsl, hsl, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Hsl(this.h, this.s, this.l * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Hsl(this.h, this.s, this.l * k, this.opacity);
	  },
	  rgb: function() {
	    var h = this.h % 360 + (this.h < 0) * 360,
	        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
	        l = this.l,
	        m2 = l + (l < 0.5 ? l : 1 - l) * s,
	        m1 = 2 * l - m2;
	    return new Rgb(
	      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
	      hsl2rgb(h, m1, m2),
	      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
	      this.opacity
	    );
	  },
	  displayable: function() {
	    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
	        && (0 <= this.l && this.l <= 1)
	        && (0 <= this.opacity && this.opacity <= 1);
	  }
	}));

	/* From FvD 13.37, CSS Color Module Level 3 */
	function hsl2rgb(h, m1, m2) {
	  return (h < 60 ? m1 + (m2 - m1) * h / 60
	      : h < 180 ? m2
	      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
	      : m1) * 255;
	}

	var deg2rad = Math.PI / 180;
	var rad2deg = 180 / Math.PI;

	var Kn = 18;
	var Xn = 0.950470;
	var Yn = 1;
	var Zn = 1.088830;
	var t0 = 4 / 29;
	var t1 = 6 / 29;
	var t2 = 3 * t1 * t1;
	var t3 = t1 * t1 * t1;

	function labConvert(o) {
	  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
	  if (o instanceof Hcl) {
	    var h = o.h * deg2rad;
	    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
	  }
	  if (!(o instanceof Rgb)) o = rgbConvert(o);
	  var b = rgb2xyz(o.r),
	      a = rgb2xyz(o.g),
	      l = rgb2xyz(o.b),
	      x = xyz2lab((0.4124564 * b + 0.3575761 * a + 0.1804375 * l) / Xn),
	      y = xyz2lab((0.2126729 * b + 0.7151522 * a + 0.0721750 * l) / Yn),
	      z = xyz2lab((0.0193339 * b + 0.1191920 * a + 0.9503041 * l) / Zn);
	  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
	}

	function lab(l, a, b, opacity) {
	  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
	}

	function Lab(l, a, b, opacity) {
	  this.l = +l;
	  this.a = +a;
	  this.b = +b;
	  this.opacity = +opacity;
	}

	define(Lab, lab, extend(Color, {
	  brighter: function(k) {
	    return new Lab(this.l + Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  darker: function(k) {
	    return new Lab(this.l - Kn * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  rgb: function() {
	    var y = (this.l + 16) / 116,
	        x = isNaN(this.a) ? y : y + this.a / 500,
	        z = isNaN(this.b) ? y : y - this.b / 200;
	    y = Yn * lab2xyz(y);
	    x = Xn * lab2xyz(x);
	    z = Zn * lab2xyz(z);
	    return new Rgb(
	      xyz2rgb( 3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
	      xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z),
	      xyz2rgb( 0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
	      this.opacity
	    );
	  }
	}));

	function xyz2lab(t) {
	  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
	}

	function lab2xyz(t) {
	  return t > t1 ? t * t * t : t2 * (t - t0);
	}

	function xyz2rgb(x) {
	  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	}

	function rgb2xyz(x) {
	  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	}

	function hclConvert(o) {
	  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
	  if (!(o instanceof Lab)) o = labConvert(o);
	  var h = Math.atan2(o.b, o.a) * rad2deg;
	  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
	}

	function hcl(h, c, l, opacity) {
	  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
	}

	function Hcl(h, c, l, opacity) {
	  this.h = +h;
	  this.c = +c;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Hcl, hcl, extend(Color, {
	  brighter: function(k) {
	    return new Hcl(this.h, this.c, this.l + Kn * (k == null ? 1 : k), this.opacity);
	  },
	  darker: function(k) {
	    return new Hcl(this.h, this.c, this.l - Kn * (k == null ? 1 : k), this.opacity);
	  },
	  rgb: function() {
	    return labConvert(this).rgb();
	  }
	}));

	var A = -0.14861;
	var B = +1.78277;
	var C = -0.29227;
	var D = -0.90649;
	var E = +1.97294;
	var ED = E * D;
	var EB = E * B;
	var BC_DA = B * C - D * A;

	function cubehelixConvert(o) {
	  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
	  if (!(o instanceof Rgb)) o = rgbConvert(o);
	  var r = o.r / 255,
	      g = o.g / 255,
	      b = o.b / 255,
	      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
	      bl = b - l,
	      k = (E * (g - l) - C * bl) / D,
	      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
	      h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
	  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
	}

	function cubehelix(h, s, l, opacity) {
	  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
	}

	function Cubehelix(h, s, l, opacity) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	  this.opacity = +opacity;
	}

	define(Cubehelix, cubehelix, extend(Color, {
	  brighter: function(k) {
	    k = k == null ? brighter : Math.pow(brighter, k);
	    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	  },
	  darker: function(k) {
	    k = k == null ? darker : Math.pow(darker, k);
	    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
	  },
	  rgb: function() {
	    var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
	        l = +this.l,
	        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
	        cosh = Math.cos(h),
	        sinh = Math.sin(h);
	    return new Rgb(
	      255 * (l + a * (A * cosh + B * sinh)),
	      255 * (l + a * (C * cosh + D * sinh)),
	      255 * (l + a * (E * cosh)),
	      this.opacity
	    );
	  }
	}));

	exports.color = color;
	exports.rgb = rgb;
	exports.hsl = hsl;
	exports.lab = lab;
	exports.hcl = hcl;
	exports.cubehelix = cubehelix;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;// TinyColor v1.4.1
	// https://github.com/bgrins/TinyColor
	// Brian Grinstead, MIT License

	(function(Math) {

	var trimLeft = /^\s+/,
	    trimRight = /\s+$/,
	    tinyCounter = 0,
	    mathRound = Math.round,
	    mathMin = Math.min,
	    mathMax = Math.max,
	    mathRandom = Math.random;

	function tinycolor (color, opts) {

	    color = (color) ? color : '';
	    opts = opts || { };

	    // If input is already a tinycolor, return itself
	    if (color instanceof tinycolor) {
	       return color;
	    }
	    // If we are called as a function, call using new instead
	    if (!(this instanceof tinycolor)) {
	        return new tinycolor(color, opts);
	    }

	    var rgb = inputToRGB(color);
	    this._originalInput = color,
	    this._r = rgb.r,
	    this._g = rgb.g,
	    this._b = rgb.b,
	    this._a = rgb.a,
	    this._roundA = mathRound(100*this._a) / 100,
	    this._format = opts.format || rgb.format;
	    this._gradientType = opts.gradientType;

	    // Don't let the range of [0,255] come back in [0,1].
	    // Potentially lose a little bit of precision here, but will fix issues where
	    // .5 gets interpreted as half of the total, instead of half of 1
	    // If it was supposed to be 128, this was already taken care of by `inputToRgb`
	    if (this._r < 1) { this._r = mathRound(this._r); }
	    if (this._g < 1) { this._g = mathRound(this._g); }
	    if (this._b < 1) { this._b = mathRound(this._b); }

	    this._ok = rgb.ok;
	    this._tc_id = tinyCounter++;
	}

	tinycolor.prototype = {
	    isDark: function() {
	        return this.getBrightness() < 128;
	    },
	    isLight: function() {
	        return !this.isDark();
	    },
	    isValid: function() {
	        return this._ok;
	    },
	    getOriginalInput: function() {
	      return this._originalInput;
	    },
	    getFormat: function() {
	        return this._format;
	    },
	    getAlpha: function() {
	        return this._a;
	    },
	    getBrightness: function() {
	        //http://www.w3.org/TR/AERT#color-contrast
	        var rgb = this.toRgb();
	        return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
	    },
	    getLuminance: function() {
	        //http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
	        var rgb = this.toRgb();
	        var RsRGB, GsRGB, BsRGB, R, G, B;
	        RsRGB = rgb.r/255;
	        GsRGB = rgb.g/255;
	        BsRGB = rgb.b/255;

	        if (RsRGB <= 0.03928) {R = RsRGB / 12.92;} else {R = Math.pow(((RsRGB + 0.055) / 1.055), 2.4);}
	        if (GsRGB <= 0.03928) {G = GsRGB / 12.92;} else {G = Math.pow(((GsRGB + 0.055) / 1.055), 2.4);}
	        if (BsRGB <= 0.03928) {B = BsRGB / 12.92;} else {B = Math.pow(((BsRGB + 0.055) / 1.055), 2.4);}
	        return (0.2126 * R) + (0.7152 * G) + (0.0722 * B);
	    },
	    setAlpha: function(value) {
	        this._a = boundAlpha(value);
	        this._roundA = mathRound(100*this._a) / 100;
	        return this;
	    },
	    toHsv: function() {
	        var hsv = rgbToHsv(this._r, this._g, this._b);
	        return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: this._a };
	    },
	    toHsvString: function() {
	        var hsv = rgbToHsv(this._r, this._g, this._b);
	        var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
	        return (this._a == 1) ?
	          "hsv("  + h + ", " + s + "%, " + v + "%)" :
	          "hsva(" + h + ", " + s + "%, " + v + "%, "+ this._roundA + ")";
	    },
	    toHsl: function() {
	        var hsl = rgbToHsl(this._r, this._g, this._b);
	        return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: this._a };
	    },
	    toHslString: function() {
	        var hsl = rgbToHsl(this._r, this._g, this._b);
	        var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
	        return (this._a == 1) ?
	          "hsl("  + h + ", " + s + "%, " + l + "%)" :
	          "hsla(" + h + ", " + s + "%, " + l + "%, "+ this._roundA + ")";
	    },
	    toHex: function(allow3Char) {
	        return rgbToHex(this._r, this._g, this._b, allow3Char);
	    },
	    toHexString: function(allow3Char) {
	        return '#' + this.toHex(allow3Char);
	    },
	    toHex8: function(allow4Char) {
	        return rgbaToHex(this._r, this._g, this._b, this._a, allow4Char);
	    },
	    toHex8String: function(allow4Char) {
	        return '#' + this.toHex8(allow4Char);
	    },
	    toRgb: function() {
	        return { r: mathRound(this._r), g: mathRound(this._g), b: mathRound(this._b), a: this._a };
	    },
	    toRgbString: function() {
	        return (this._a == 1) ?
	          "rgb("  + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" :
	          "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
	    },
	    toPercentageRgb: function() {
	        return { r: mathRound(bound01(this._r, 255) * 100) + "%", g: mathRound(bound01(this._g, 255) * 100) + "%", b: mathRound(bound01(this._b, 255) * 100) + "%", a: this._a };
	    },
	    toPercentageRgbString: function() {
	        return (this._a == 1) ?
	          "rgb("  + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" :
	          "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
	    },
	    toName: function() {
	        if (this._a === 0) {
	            return "transparent";
	        }

	        if (this._a < 1) {
	            return false;
	        }

	        return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
	    },
	    toFilter: function(secondColor) {
	        var hex8String = '#' + rgbaToArgbHex(this._r, this._g, this._b, this._a);
	        var secondHex8String = hex8String;
	        var gradientType = this._gradientType ? "GradientType = 1, " : "";

	        if (secondColor) {
	            var s = tinycolor(secondColor);
	            secondHex8String = '#' + rgbaToArgbHex(s._r, s._g, s._b, s._a);
	        }

	        return "progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")";
	    },
	    toString: function(format) {
	        var formatSet = !!format;
	        format = format || this._format;

	        var formattedString = false;
	        var hasAlpha = this._a < 1 && this._a >= 0;
	        var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "hex4" || format === "hex8" || format === "name");

	        if (needsAlphaFormat) {
	            // Special case for "transparent", all other non-alpha formats
	            // will return rgba when there is transparency.
	            if (format === "name" && this._a === 0) {
	                return this.toName();
	            }
	            return this.toRgbString();
	        }
	        if (format === "rgb") {
	            formattedString = this.toRgbString();
	        }
	        if (format === "prgb") {
	            formattedString = this.toPercentageRgbString();
	        }
	        if (format === "hex" || format === "hex6") {
	            formattedString = this.toHexString();
	        }
	        if (format === "hex3") {
	            formattedString = this.toHexString(true);
	        }
	        if (format === "hex4") {
	            formattedString = this.toHex8String(true);
	        }
	        if (format === "hex8") {
	            formattedString = this.toHex8String();
	        }
	        if (format === "name") {
	            formattedString = this.toName();
	        }
	        if (format === "hsl") {
	            formattedString = this.toHslString();
	        }
	        if (format === "hsv") {
	            formattedString = this.toHsvString();
	        }

	        return formattedString || this.toHexString();
	    },
	    clone: function() {
	        return tinycolor(this.toString());
	    },

	    _applyModification: function(fn, args) {
	        var color = fn.apply(null, [this].concat([].slice.call(args)));
	        this._r = color._r;
	        this._g = color._g;
	        this._b = color._b;
	        this.setAlpha(color._a);
	        return this;
	    },
	    lighten: function() {
	        return this._applyModification(lighten, arguments);
	    },
	    brighten: function() {
	        return this._applyModification(brighten, arguments);
	    },
	    darken: function() {
	        return this._applyModification(darken, arguments);
	    },
	    desaturate: function() {
	        return this._applyModification(desaturate, arguments);
	    },
	    saturate: function() {
	        return this._applyModification(saturate, arguments);
	    },
	    greyscale: function() {
	        return this._applyModification(greyscale, arguments);
	    },
	    spin: function() {
	        return this._applyModification(spin, arguments);
	    },

	    _applyCombination: function(fn, args) {
	        return fn.apply(null, [this].concat([].slice.call(args)));
	    },
	    analogous: function() {
	        return this._applyCombination(analogous, arguments);
	    },
	    complement: function() {
	        return this._applyCombination(complement, arguments);
	    },
	    monochromatic: function() {
	        return this._applyCombination(monochromatic, arguments);
	    },
	    splitcomplement: function() {
	        return this._applyCombination(splitcomplement, arguments);
	    },
	    triad: function() {
	        return this._applyCombination(triad, arguments);
	    },
	    tetrad: function() {
	        return this._applyCombination(tetrad, arguments);
	    }
	};

	// If input is an object, force 1 into "1.0" to handle ratios properly
	// String input requires "1.0" as input, so 1 will be treated as 1
	tinycolor.fromRatio = function(color, opts) {
	    if (typeof color == "object") {
	        var newColor = {};
	        for (var i in color) {
	            if (color.hasOwnProperty(i)) {
	                if (i === "a") {
	                    newColor[i] = color[i];
	                }
	                else {
	                    newColor[i] = convertToPercentage(color[i]);
	                }
	            }
	        }
	        color = newColor;
	    }

	    return tinycolor(color, opts);
	};

	// Given a string or object, convert that input to RGB
	// Possible string inputs:
	//
	//     "red"
	//     "#f00" or "f00"
	//     "#ff0000" or "ff0000"
	//     "#ff000000" or "ff000000"
	//     "rgb 255 0 0" or "rgb (255, 0, 0)"
	//     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
	//     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
	//     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
	//     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
	//     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
	//     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
	//
	function inputToRGB(color) {

	    var rgb = { r: 0, g: 0, b: 0 };
	    var a = 1;
	    var s = null;
	    var v = null;
	    var l = null;
	    var ok = false;
	    var format = false;

	    if (typeof color == "string") {
	        color = stringInputToObject(color);
	    }

	    if (typeof color == "object") {
	        if (isValidCSSUnit(color.r) && isValidCSSUnit(color.g) && isValidCSSUnit(color.b)) {
	            rgb = rgbToRgb(color.r, color.g, color.b);
	            ok = true;
	            format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
	        }
	        else if (isValidCSSUnit(color.h) && isValidCSSUnit(color.s) && isValidCSSUnit(color.v)) {
	            s = convertToPercentage(color.s);
	            v = convertToPercentage(color.v);
	            rgb = hsvToRgb(color.h, s, v);
	            ok = true;
	            format = "hsv";
	        }
	        else if (isValidCSSUnit(color.h) && isValidCSSUnit(color.s) && isValidCSSUnit(color.l)) {
	            s = convertToPercentage(color.s);
	            l = convertToPercentage(color.l);
	            rgb = hslToRgb(color.h, s, l);
	            ok = true;
	            format = "hsl";
	        }

	        if (color.hasOwnProperty("a")) {
	            a = color.a;
	        }
	    }

	    a = boundAlpha(a);

	    return {
	        ok: ok,
	        format: color.format || format,
	        r: mathMin(255, mathMax(rgb.r, 0)),
	        g: mathMin(255, mathMax(rgb.g, 0)),
	        b: mathMin(255, mathMax(rgb.b, 0)),
	        a: a
	    };
	}


	// Conversion Functions
	// --------------------

	// `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
	// <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

	// `rgbToRgb`
	// Handle bounds / percentage checking to conform to CSS color spec
	// <http://www.w3.org/TR/css3-color/>
	// *Assumes:* r, g, b in [0, 255] or [0, 1]
	// *Returns:* { r, g, b } in [0, 255]
	function rgbToRgb(r, g, b){
	    return {
	        r: bound01(r, 255) * 255,
	        g: bound01(g, 255) * 255,
	        b: bound01(b, 255) * 255
	    };
	}

	// `rgbToHsl`
	// Converts an RGB color value to HSL.
	// *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
	// *Returns:* { h, s, l } in [0,1]
	function rgbToHsl(r, g, b) {

	    r = bound01(r, 255);
	    g = bound01(g, 255);
	    b = bound01(b, 255);

	    var max = mathMax(r, g, b), min = mathMin(r, g, b);
	    var h, s, l = (max + min) / 2;

	    if(max == min) {
	        h = s = 0; // achromatic
	    }
	    else {
	        var d = max - min;
	        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	        switch(max) {
	            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
	            case g: h = (b - r) / d + 2; break;
	            case b: h = (r - g) / d + 4; break;
	        }

	        h /= 6;
	    }

	    return { h: h, s: s, l: l };
	}

	// `hslToRgb`
	// Converts an HSL color value to RGB.
	// *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
	// *Returns:* { r, g, b } in the set [0, 255]
	function hslToRgb(h, s, l) {
	    var r, g, b;

	    h = bound01(h, 360);
	    s = bound01(s, 100);
	    l = bound01(l, 100);

	    function hue2rgb(p, q, t) {
	        if(t < 0) t += 1;
	        if(t > 1) t -= 1;
	        if(t < 1/6) return p + (q - p) * 6 * t;
	        if(t < 1/2) return q;
	        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
	        return p;
	    }

	    if(s === 0) {
	        r = g = b = l; // achromatic
	    }
	    else {
	        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	        var p = 2 * l - q;
	        r = hue2rgb(p, q, h + 1/3);
	        g = hue2rgb(p, q, h);
	        b = hue2rgb(p, q, h - 1/3);
	    }

	    return { r: r * 255, g: g * 255, b: b * 255 };
	}

	// `rgbToHsv`
	// Converts an RGB color value to HSV
	// *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
	// *Returns:* { h, s, v } in [0,1]
	function rgbToHsv(r, g, b) {

	    r = bound01(r, 255);
	    g = bound01(g, 255);
	    b = bound01(b, 255);

	    var max = mathMax(r, g, b), min = mathMin(r, g, b);
	    var h, s, v = max;

	    var d = max - min;
	    s = max === 0 ? 0 : d / max;

	    if(max == min) {
	        h = 0; // achromatic
	    }
	    else {
	        switch(max) {
	            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
	            case g: h = (b - r) / d + 2; break;
	            case b: h = (r - g) / d + 4; break;
	        }
	        h /= 6;
	    }
	    return { h: h, s: s, v: v };
	}

	// `hsvToRgb`
	// Converts an HSV color value to RGB.
	// *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
	// *Returns:* { r, g, b } in the set [0, 255]
	 function hsvToRgb(h, s, v) {

	    h = bound01(h, 360) * 6;
	    s = bound01(s, 100);
	    v = bound01(v, 100);

	    var i = Math.floor(h),
	        f = h - i,
	        p = v * (1 - s),
	        q = v * (1 - f * s),
	        t = v * (1 - (1 - f) * s),
	        mod = i % 6,
	        r = [v, q, p, p, t, v][mod],
	        g = [t, v, v, q, p, p][mod],
	        b = [p, p, t, v, v, q][mod];

	    return { r: r * 255, g: g * 255, b: b * 255 };
	}

	// `rgbToHex`
	// Converts an RGB color to hex
	// Assumes r, g, and b are contained in the set [0, 255]
	// Returns a 3 or 6 character hex
	function rgbToHex(r, g, b, allow3Char) {

	    var hex = [
	        pad2(mathRound(r).toString(16)),
	        pad2(mathRound(g).toString(16)),
	        pad2(mathRound(b).toString(16))
	    ];

	    // Return a 3 character hex if possible
	    if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
	        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
	    }

	    return hex.join("");
	}

	// `rgbaToHex`
	// Converts an RGBA color plus alpha transparency to hex
	// Assumes r, g, b are contained in the set [0, 255] and
	// a in [0, 1]. Returns a 4 or 8 character rgba hex
	function rgbaToHex(r, g, b, a, allow4Char) {

	    var hex = [
	        pad2(mathRound(r).toString(16)),
	        pad2(mathRound(g).toString(16)),
	        pad2(mathRound(b).toString(16)),
	        pad2(convertDecimalToHex(a))
	    ];

	    // Return a 4 character hex if possible
	    if (allow4Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1) && hex[3].charAt(0) == hex[3].charAt(1)) {
	        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0) + hex[3].charAt(0);
	    }

	    return hex.join("");
	}

	// `rgbaToArgbHex`
	// Converts an RGBA color to an ARGB Hex8 string
	// Rarely used, but required for "toFilter()"
	function rgbaToArgbHex(r, g, b, a) {

	    var hex = [
	        pad2(convertDecimalToHex(a)),
	        pad2(mathRound(r).toString(16)),
	        pad2(mathRound(g).toString(16)),
	        pad2(mathRound(b).toString(16))
	    ];

	    return hex.join("");
	}

	// `equals`
	// Can be called with any tinycolor input
	tinycolor.equals = function (color1, color2) {
	    if (!color1 || !color2) { return false; }
	    return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
	};

	tinycolor.random = function() {
	    return tinycolor.fromRatio({
	        r: mathRandom(),
	        g: mathRandom(),
	        b: mathRandom()
	    });
	};


	// Modification Functions
	// ----------------------
	// Thanks to less.js for some of the basics here
	// <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>

	function desaturate(color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.s -= amount / 100;
	    hsl.s = clamp01(hsl.s);
	    return tinycolor(hsl);
	}

	function saturate(color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.s += amount / 100;
	    hsl.s = clamp01(hsl.s);
	    return tinycolor(hsl);
	}

	function greyscale(color) {
	    return tinycolor(color).desaturate(100);
	}

	function lighten (color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.l += amount / 100;
	    hsl.l = clamp01(hsl.l);
	    return tinycolor(hsl);
	}

	function brighten(color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var rgb = tinycolor(color).toRgb();
	    rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * - (amount / 100))));
	    rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * - (amount / 100))));
	    rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * - (amount / 100))));
	    return tinycolor(rgb);
	}

	function darken (color, amount) {
	    amount = (amount === 0) ? 0 : (amount || 10);
	    var hsl = tinycolor(color).toHsl();
	    hsl.l -= amount / 100;
	    hsl.l = clamp01(hsl.l);
	    return tinycolor(hsl);
	}

	// Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
	// Values outside of this range will be wrapped into this range.
	function spin(color, amount) {
	    var hsl = tinycolor(color).toHsl();
	    var hue = (hsl.h + amount) % 360;
	    hsl.h = hue < 0 ? 360 + hue : hue;
	    return tinycolor(hsl);
	}

	// Combination Functions
	// ---------------------
	// Thanks to jQuery xColor for some of the ideas behind these
	// <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

	function complement(color) {
	    var hsl = tinycolor(color).toHsl();
	    hsl.h = (hsl.h + 180) % 360;
	    return tinycolor(hsl);
	}

	function triad(color) {
	    var hsl = tinycolor(color).toHsl();
	    var h = hsl.h;
	    return [
	        tinycolor(color),
	        tinycolor({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
	        tinycolor({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
	    ];
	}

	function tetrad(color) {
	    var hsl = tinycolor(color).toHsl();
	    var h = hsl.h;
	    return [
	        tinycolor(color),
	        tinycolor({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
	        tinycolor({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
	        tinycolor({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
	    ];
	}

	function splitcomplement(color) {
	    var hsl = tinycolor(color).toHsl();
	    var h = hsl.h;
	    return [
	        tinycolor(color),
	        tinycolor({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
	        tinycolor({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
	    ];
	}

	function analogous(color, results, slices) {
	    results = results || 6;
	    slices = slices || 30;

	    var hsl = tinycolor(color).toHsl();
	    var part = 360 / slices;
	    var ret = [tinycolor(color)];

	    for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
	        hsl.h = (hsl.h + part) % 360;
	        ret.push(tinycolor(hsl));
	    }
	    return ret;
	}

	function monochromatic(color, results) {
	    results = results || 6;
	    var hsv = tinycolor(color).toHsv();
	    var h = hsv.h, s = hsv.s, v = hsv.v;
	    var ret = [];
	    var modification = 1 / results;

	    while (results--) {
	        ret.push(tinycolor({ h: h, s: s, v: v}));
	        v = (v + modification) % 1;
	    }

	    return ret;
	}

	// Utility Functions
	// ---------------------

	tinycolor.mix = function(color1, color2, amount) {
	    amount = (amount === 0) ? 0 : (amount || 50);

	    var rgb1 = tinycolor(color1).toRgb();
	    var rgb2 = tinycolor(color2).toRgb();

	    var p = amount / 100;

	    var rgba = {
	        r: ((rgb2.r - rgb1.r) * p) + rgb1.r,
	        g: ((rgb2.g - rgb1.g) * p) + rgb1.g,
	        b: ((rgb2.b - rgb1.b) * p) + rgb1.b,
	        a: ((rgb2.a - rgb1.a) * p) + rgb1.a
	    };

	    return tinycolor(rgba);
	};


	// Readability Functions
	// ---------------------
	// <http://www.w3.org/TR/2008/REC-WCAG20-20081211/#contrast-ratiodef (WCAG Version 2)

	// `contrast`
	// Analyze the 2 colors and returns the color contrast defined by (WCAG Version 2)
	tinycolor.readability = function(color1, color2) {
	    var c1 = tinycolor(color1);
	    var c2 = tinycolor(color2);
	    return (Math.max(c1.getLuminance(),c2.getLuminance())+0.05) / (Math.min(c1.getLuminance(),c2.getLuminance())+0.05);
	};

	// `isReadable`
	// Ensure that foreground and background color combinations meet WCAG2 guidelines.
	// The third argument is an optional Object.
	//      the 'level' property states 'AA' or 'AAA' - if missing or invalid, it defaults to 'AA';
	//      the 'size' property states 'large' or 'small' - if missing or invalid, it defaults to 'small'.
	// If the entire object is absent, isReadable defaults to {level:"AA",size:"small"}.

	// *Example*
	//    tinycolor.isReadable("#000", "#111") => false
	//    tinycolor.isReadable("#000", "#111",{level:"AA",size:"large"}) => false
	tinycolor.isReadable = function(color1, color2, wcag2) {
	    var readability = tinycolor.readability(color1, color2);
	    var wcag2Parms, out;

	    out = false;

	    wcag2Parms = validateWCAG2Parms(wcag2);
	    switch (wcag2Parms.level + wcag2Parms.size) {
	        case "AAsmall":
	        case "AAAlarge":
	            out = readability >= 4.5;
	            break;
	        case "AAlarge":
	            out = readability >= 3;
	            break;
	        case "AAAsmall":
	            out = readability >= 7;
	            break;
	    }
	    return out;

	};

	// `mostReadable`
	// Given a base color and a list of possible foreground or background
	// colors for that base, returns the most readable color.
	// Optionally returns Black or White if the most readable color is unreadable.
	// *Example*
	//    tinycolor.mostReadable(tinycolor.mostReadable("#123", ["#124", "#125"],{includeFallbackColors:false}).toHexString(); // "#112255"
	//    tinycolor.mostReadable(tinycolor.mostReadable("#123", ["#124", "#125"],{includeFallbackColors:true}).toHexString();  // "#ffffff"
	//    tinycolor.mostReadable("#a8015a", ["#faf3f3"],{includeFallbackColors:true,level:"AAA",size:"large"}).toHexString(); // "#faf3f3"
	//    tinycolor.mostReadable("#a8015a", ["#faf3f3"],{includeFallbackColors:true,level:"AAA",size:"small"}).toHexString(); // "#ffffff"
	tinycolor.mostReadable = function(baseColor, colorList, args) {
	    var bestColor = null;
	    var bestScore = 0;
	    var readability;
	    var includeFallbackColors, level, size ;
	    args = args || {};
	    includeFallbackColors = args.includeFallbackColors ;
	    level = args.level;
	    size = args.size;

	    for (var i= 0; i < colorList.length ; i++) {
	        readability = tinycolor.readability(baseColor, colorList[i]);
	        if (readability > bestScore) {
	            bestScore = readability;
	            bestColor = tinycolor(colorList[i]);
	        }
	    }

	    if (tinycolor.isReadable(baseColor, bestColor, {"level":level,"size":size}) || !includeFallbackColors) {
	        return bestColor;
	    }
	    else {
	        args.includeFallbackColors=false;
	        return tinycolor.mostReadable(baseColor,["#fff", "#000"],args);
	    }
	};


	// Big List of Colors
	// ------------------
	// <http://www.w3.org/TR/css3-color/#svg-color>
	var names = tinycolor.names = {
	    aliceblue: "f0f8ff",
	    antiquewhite: "faebd7",
	    aqua: "0ff",
	    aquamarine: "7fffd4",
	    azure: "f0ffff",
	    beige: "f5f5dc",
	    bisque: "ffe4c4",
	    black: "000",
	    blanchedalmond: "ffebcd",
	    blue: "00f",
	    blueviolet: "8a2be2",
	    brown: "a52a2a",
	    burlywood: "deb887",
	    burntsienna: "ea7e5d",
	    cadetblue: "5f9ea0",
	    chartreuse: "7fff00",
	    chocolate: "d2691e",
	    coral: "ff7f50",
	    cornflowerblue: "6495ed",
	    cornsilk: "fff8dc",
	    crimson: "dc143c",
	    cyan: "0ff",
	    darkblue: "00008b",
	    darkcyan: "008b8b",
	    darkgoldenrod: "b8860b",
	    darkgray: "a9a9a9",
	    darkgreen: "006400",
	    darkgrey: "a9a9a9",
	    darkkhaki: "bdb76b",
	    darkmagenta: "8b008b",
	    darkolivegreen: "556b2f",
	    darkorange: "ff8c00",
	    darkorchid: "9932cc",
	    darkred: "8b0000",
	    darksalmon: "e9967a",
	    darkseagreen: "8fbc8f",
	    darkslateblue: "483d8b",
	    darkslategray: "2f4f4f",
	    darkslategrey: "2f4f4f",
	    darkturquoise: "00ced1",
	    darkviolet: "9400d3",
	    deeppink: "ff1493",
	    deepskyblue: "00bfff",
	    dimgray: "696969",
	    dimgrey: "696969",
	    dodgerblue: "1e90ff",
	    firebrick: "b22222",
	    floralwhite: "fffaf0",
	    forestgreen: "228b22",
	    fuchsia: "f0f",
	    gainsboro: "dcdcdc",
	    ghostwhite: "f8f8ff",
	    gold: "ffd700",
	    goldenrod: "daa520",
	    gray: "808080",
	    green: "008000",
	    greenyellow: "adff2f",
	    grey: "808080",
	    honeydew: "f0fff0",
	    hotpink: "ff69b4",
	    indianred: "cd5c5c",
	    indigo: "4b0082",
	    ivory: "fffff0",
	    khaki: "f0e68c",
	    lavender: "e6e6fa",
	    lavenderblush: "fff0f5",
	    lawngreen: "7cfc00",
	    lemonchiffon: "fffacd",
	    lightblue: "add8e6",
	    lightcoral: "f08080",
	    lightcyan: "e0ffff",
	    lightgoldenrodyellow: "fafad2",
	    lightgray: "d3d3d3",
	    lightgreen: "90ee90",
	    lightgrey: "d3d3d3",
	    lightpink: "ffb6c1",
	    lightsalmon: "ffa07a",
	    lightseagreen: "20b2aa",
	    lightskyblue: "87cefa",
	    lightslategray: "789",
	    lightslategrey: "789",
	    lightsteelblue: "b0c4de",
	    lightyellow: "ffffe0",
	    lime: "0f0",
	    limegreen: "32cd32",
	    linen: "faf0e6",
	    magenta: "f0f",
	    maroon: "800000",
	    mediumaquamarine: "66cdaa",
	    mediumblue: "0000cd",
	    mediumorchid: "ba55d3",
	    mediumpurple: "9370db",
	    mediumseagreen: "3cb371",
	    mediumslateblue: "7b68ee",
	    mediumspringgreen: "00fa9a",
	    mediumturquoise: "48d1cc",
	    mediumvioletred: "c71585",
	    midnightblue: "191970",
	    mintcream: "f5fffa",
	    mistyrose: "ffe4e1",
	    moccasin: "ffe4b5",
	    navajowhite: "ffdead",
	    navy: "000080",
	    oldlace: "fdf5e6",
	    olive: "808000",
	    olivedrab: "6b8e23",
	    orange: "ffa500",
	    orangered: "ff4500",
	    orchid: "da70d6",
	    palegoldenrod: "eee8aa",
	    palegreen: "98fb98",
	    paleturquoise: "afeeee",
	    palevioletred: "db7093",
	    papayawhip: "ffefd5",
	    peachpuff: "ffdab9",
	    peru: "cd853f",
	    pink: "ffc0cb",
	    plum: "dda0dd",
	    powderblue: "b0e0e6",
	    purple: "800080",
	    rebeccapurple: "663399",
	    red: "f00",
	    rosybrown: "bc8f8f",
	    royalblue: "4169e1",
	    saddlebrown: "8b4513",
	    salmon: "fa8072",
	    sandybrown: "f4a460",
	    seagreen: "2e8b57",
	    seashell: "fff5ee",
	    sienna: "a0522d",
	    silver: "c0c0c0",
	    skyblue: "87ceeb",
	    slateblue: "6a5acd",
	    slategray: "708090",
	    slategrey: "708090",
	    snow: "fffafa",
	    springgreen: "00ff7f",
	    steelblue: "4682b4",
	    tan: "d2b48c",
	    teal: "008080",
	    thistle: "d8bfd8",
	    tomato: "ff6347",
	    turquoise: "40e0d0",
	    violet: "ee82ee",
	    wheat: "f5deb3",
	    white: "fff",
	    whitesmoke: "f5f5f5",
	    yellow: "ff0",
	    yellowgreen: "9acd32"
	};

	// Make it easy to access colors via `hexNames[hex]`
	var hexNames = tinycolor.hexNames = flip(names);


	// Utilities
	// ---------

	// `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
	function flip(o) {
	    var flipped = { };
	    for (var i in o) {
	        if (o.hasOwnProperty(i)) {
	            flipped[o[i]] = i;
	        }
	    }
	    return flipped;
	}

	// Return a valid alpha value [0,1] with all invalid values being set to 1
	function boundAlpha(a) {
	    a = parseFloat(a);

	    if (isNaN(a) || a < 0 || a > 1) {
	        a = 1;
	    }

	    return a;
	}

	// Take input from [0, n] and return it as [0, 1]
	function bound01(n, max) {
	    if (isOnePointZero(n)) { n = "100%"; }

	    var processPercent = isPercentage(n);
	    n = mathMin(max, mathMax(0, parseFloat(n)));

	    // Automatically convert percentage into number
	    if (processPercent) {
	        n = parseInt(n * max, 10) / 100;
	    }

	    // Handle floating point rounding errors
	    if ((Math.abs(n - max) < 0.000001)) {
	        return 1;
	    }

	    // Convert into [0, 1] range if it isn't already
	    return (n % max) / parseFloat(max);
	}

	// Force a number between 0 and 1
	function clamp01(val) {
	    return mathMin(1, mathMax(0, val));
	}

	// Parse a base-16 hex value into a base-10 integer
	function parseIntFromHex(val) {
	    return parseInt(val, 16);
	}

	// Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
	// <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
	function isOnePointZero(n) {
	    return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
	}

	// Check to see if string passed in is a percentage
	function isPercentage(n) {
	    return typeof n === "string" && n.indexOf('%') != -1;
	}

	// Force a hex value to have 2 characters
	function pad2(c) {
	    return c.length == 1 ? '0' + c : '' + c;
	}

	// Replace a decimal with it's percentage value
	function convertToPercentage(n) {
	    if (n <= 1) {
	        n = (n * 100) + "%";
	    }

	    return n;
	}

	// Converts a decimal to a hex value
	function convertDecimalToHex(d) {
	    return Math.round(parseFloat(d) * 255).toString(16);
	}
	// Converts a hex value to a decimal
	function convertHexToDecimal(h) {
	    return (parseIntFromHex(h) / 255);
	}

	var matchers = (function() {

	    // <http://www.w3.org/TR/css3-values/#integers>
	    var CSS_INTEGER = "[-\\+]?\\d+%?";

	    // <http://www.w3.org/TR/css3-values/#number-value>
	    var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";

	    // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
	    var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";

	    // Actual matching.
	    // Parentheses and commas are optional, but not required.
	    // Whitespace can take the place of commas or opening paren
	    var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
	    var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";

	    return {
	        CSS_UNIT: new RegExp(CSS_UNIT),
	        rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
	        rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
	        hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
	        hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
	        hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
	        hsva: new RegExp("hsva" + PERMISSIVE_MATCH4),
	        hex3: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
	        hex6: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
	        hex4: /^#?([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
	        hex8: /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
	    };
	})();

	// `isValidCSSUnit`
	// Take in a single string / number and check to see if it looks like a CSS unit
	// (see `matchers` above for definition).
	function isValidCSSUnit(color) {
	    return !!matchers.CSS_UNIT.exec(color);
	}

	// `stringInputToObject`
	// Permissive string parsing.  Take in a number of formats, and output an object
	// based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
	function stringInputToObject(color) {

	    color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
	    var named = false;
	    if (names[color]) {
	        color = names[color];
	        named = true;
	    }
	    else if (color == 'transparent') {
	        return { r: 0, g: 0, b: 0, a: 0, format: "name" };
	    }

	    // Try to match string input using regular expressions.
	    // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
	    // Just return an object and let the conversion functions handle that.
	    // This way the result will be the same whether the tinycolor is initialized with string or object.
	    var match;
	    if ((match = matchers.rgb.exec(color))) {
	        return { r: match[1], g: match[2], b: match[3] };
	    }
	    if ((match = matchers.rgba.exec(color))) {
	        return { r: match[1], g: match[2], b: match[3], a: match[4] };
	    }
	    if ((match = matchers.hsl.exec(color))) {
	        return { h: match[1], s: match[2], l: match[3] };
	    }
	    if ((match = matchers.hsla.exec(color))) {
	        return { h: match[1], s: match[2], l: match[3], a: match[4] };
	    }
	    if ((match = matchers.hsv.exec(color))) {
	        return { h: match[1], s: match[2], v: match[3] };
	    }
	    if ((match = matchers.hsva.exec(color))) {
	        return { h: match[1], s: match[2], v: match[3], a: match[4] };
	    }
	    if ((match = matchers.hex8.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1]),
	            g: parseIntFromHex(match[2]),
	            b: parseIntFromHex(match[3]),
	            a: convertHexToDecimal(match[4]),
	            format: named ? "name" : "hex8"
	        };
	    }
	    if ((match = matchers.hex6.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1]),
	            g: parseIntFromHex(match[2]),
	            b: parseIntFromHex(match[3]),
	            format: named ? "name" : "hex"
	        };
	    }
	    if ((match = matchers.hex4.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1] + '' + match[1]),
	            g: parseIntFromHex(match[2] + '' + match[2]),
	            b: parseIntFromHex(match[3] + '' + match[3]),
	            a: convertHexToDecimal(match[4] + '' + match[4]),
	            format: named ? "name" : "hex8"
	        };
	    }
	    if ((match = matchers.hex3.exec(color))) {
	        return {
	            r: parseIntFromHex(match[1] + '' + match[1]),
	            g: parseIntFromHex(match[2] + '' + match[2]),
	            b: parseIntFromHex(match[3] + '' + match[3]),
	            format: named ? "name" : "hex"
	        };
	    }

	    return false;
	}

	function validateWCAG2Parms(parms) {
	    // return valid WCAG2 parms for isReadable.
	    // If input parms are invalid, return {"level":"AA", "size":"small"}
	    var level, size;
	    parms = parms || {"level":"AA", "size":"small"};
	    level = (parms.level || "AA").toUpperCase();
	    size = (parms.size || "small").toLowerCase();
	    if (level !== "AA" && level !== "AAA") {
	        level = "AA";
	    }
	    if (size !== "small" && size !== "large") {
	        size = "small";
	    }
	    return {"level":level, "size":size};
	}

	// Node: Export function
	if (typeof module !== "undefined" && module.exports) {
	    module.exports = tinycolor;
	}
	// AMD/requirejs: Define the module
	else if (true) {
	    !(__WEBPACK_AMD_DEFINE_RESULT__ = function () {return tinycolor;}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}
	// Browser: Expose to window
	else {
	    window.tinycolor = tinycolor;
	}

	})(Math);


/***/ })
/******/ ]);