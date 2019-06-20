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

	var parseFn = function(prop) {
	  var geval = eval; // Avoid using eval directly https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval
	  try {
	    var evalled = geval('(' + prop + ')');
	    return evalled;
	  }
	  catch (e) {} // Can't eval, not a function
	  return null;
	};

	var parseAccessor = function(prop) {
	  if (!isNaN(parseFloat(prop))) { return parseFloat(prop); } // parse numbers
	  if (parseFn(prop)) { return parseFn(prop); } // parse functions
	  return prop; //strings
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
	    dagMode: {type: 'string', default: ''},
	    dagLevelDistance: {type: 'number', default: 0},
	    nodeRelSize: {type: 'number', default: 4}, // volume per val unit
	    nodeId: {type: 'string', default: 'id'},
	    nodeLabel: {parse: parseAccessor, default: 'name'},
	    nodeDesc: {parse: parseAccessor, default: 'desc'},
	    nodeVal: {parse: parseAccessor, default: 'val'},
	    nodeResolution: {type: 'number', default: 8}, // how many slice segments in the sphere's circumference
	    nodeColor: {parse: parseAccessor, default: 'color'},
	    nodeAutoColorBy: {parse: parseAccessor, default: ''}, // color nodes with the same field equally
	    nodeOpacity: {type: 'number', default: 0.75},
	    nodeThreeObject: {parse: parseAccessor, default: null},
	    nodeThreeObjectExtend: {parse: parseAccessor, default: false},
	    linkSource: {type: 'string', default: 'source'},
	    linkTarget: {type: 'string', default: 'target'},
	    linkLabel: {parse: parseAccessor, default: 'name'},
	    linkDesc: {parse: parseAccessor, default: 'desc'},
	    linkHoverPrecision: {type: 'number', default: 2},
	    linkVisibility: {parse: parseAccessor, default: true},
	    linkColor: {parse: parseAccessor, default: 'color'},
	    linkAutoColorBy: {parse: parseAccessor, default: ''}, // color links with the same field equally
	    linkOpacity: {type: 'number', default: 0.2},
	    linkWidth: {parse: parseAccessor, default: 0},
	    linkResolution: {type: 'number', default: 6}, // how many radial segments in each line cylinder's geometry
	    linkCurvature: {parse: parseAccessor, default: 0},
	    linkCurveRotation: {parse: parseAccessor, default: 0},
	    linkMaterial: {parse: parseAccessor, default: null},
	    linkThreeObject: {parse: parseAccessor, default: null},
	    linkThreeObjectExtend: {parse: parseAccessor, default: false},
	    linkPositionUpdate: {parse: parseFn, default: null},
	    linkDirectionalArrowLength: {parse: parseAccessor, default: 0},
	    linkDirectionalArrowColor: {parse: parseAccessor, default: null},
	    linkDirectionalArrowRelPos: {parse: parseAccessor,  default: 0.5}, // value between 0<>1 indicating the relative pos along the (exposed) line
	    linkDirectionalArrowResolution: {type: 'number', default: 8}, // how many slice segments in the arrow's conic circumference
	    linkDirectionalParticles: {parse: parseAccessor, default: 0}, // animate photons travelling in the link direction
	    linkDirectionalParticleSpeed: {parse: parseAccessor, default: 0.01}, // in link length ratio per frame
	    linkDirectionalParticleWidth: {parse: parseAccessor, default: 0.5},
	    linkDirectionalParticleColor: {parse: parseAccessor, default: null},
	    linkDirectionalParticleResolution: {type: 'number', default: 4}, // how many slice segments in the particle sphere's circumference
	    onNodeCenterHover: {parse: parseFn, default: function() {}},
	    onLinkCenterHover: {parse: parseFn, default: function() {}},
	    forceEngine: {type: 'string', default: 'd3'}, // 'd3' or 'ngraph'
	    d3AlphaDecay: {type: 'number', default: 0.0228},
	    d3VelocityDecay: {type: 'number', default: 0.4},
	    warmupTicks: {type: 'int', default: 0}, // how many times to tick the force engine at init before starting to render
	    cooldownTicks: {type: 'int', default: 1e18}, // Simulate infinity (int parser doesn't accept Infinity object)
	    cooldownTime: {type: 'int', default: 15000}, // ms
	    onEngineTick: {parse: parseFn, default: function() {}},
	    onEngineStop: {parse: parseFn, default: function() {}}
	  },

	  // Bind component methods
	  d3Force: function() {
	    if (!this.forceGraph) {
	      // Got here before component init -> initialize forceGraph
	      this.forceGraph = new ThreeForceGraph();
	    }

	    const forceGraph = this.forceGraph;
	    const returnVal = forceGraph.d3Force.apply(forceGraph, arguments);

	    return returnVal === forceGraph
	      ? this // return self, not the inner forcegraph component
	      : returnVal;
	  },

	  refresh: function() {
	    this.forceGraph && this.forceGraph.refresh();
	    return this;
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
	    if (!this.forceGraph) this.forceGraph = new ThreeForceGraph(); // initialize forceGraph if it doesn't exist yet
	    this.el.object3D.add(this.forceGraph);

	    this.forceGraph
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
	      'dagMode',
	      'dagLevelDistance',
	      'nodeRelSize',
	      'nodeId',
	      'nodeVal',
	      'nodeResolution',
	      'nodeColor',
	      'nodeAutoColorBy',
	      'nodeOpacity',
	      'nodeThreeObject',
	      'nodeThreeObjectExtend',
	      'linkSource',
	      'linkTarget',
	      'linkVisibility',
	      'linkColor',
	      'linkAutoColorBy',
	      'linkOpacity',
	      'linkWidth',
	      'linkResolution',
	      'linkCurvature',
	      'linkCurveRotation',
	      'linkMaterial',
	      'linkThreeObject',
	      'linkThreeObjectExtend',
	      'linkPositionUpdate',
	      'linkDirectionalArrowLength',
	      'linkDirectionalArrowColor',
	      'linkDirectionalArrowRelPos',
	      'linkDirectionalArrowResolution',
	      'linkDirectionalParticles',
	      'linkDirectionalParticleSpeed',
	      'linkDirectionalParticleWidth',
	      'linkDirectionalParticleColor',
	      'linkDirectionalParticleResolution',
	      'forceEngine',
	      'd3AlphaDecay',
	      'd3VelocityDecay',
	      'warmupTicks',
	      'cooldownTicks',
	      'cooldownTime',
	      'onEngineTick',
	      'onEngineStop'
	    ];

	    fgProps
	      .filter(function(p) { return p in diff; })
	      .forEach(function(p) { comp.forceGraph[p](elData[p] !== '' ? elData[p] : null); }); // Convert blank values into nulls

	    if ('nodes' in diff || 'links' in diff) {
	      comp.forceGraph.graphData({
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

	    var intersects = centerRaycaster.intersectObjects(this.forceGraph.children)
	      .filter(function(o) { // Check only node/link objects
	        return ['node', 'link'].indexOf(o.object.__graphObjType) !== -1;
	      })
	      .sort(function(a, b) { // Prioritize nodes over links
	        return isNode(b) - isNode(a);
	        function isNode(o) { return o.object.__graphObjType === 'node'; }
	      });

	    var topObject = intersects.length ? intersects[0].object : null;

	    if (topObject !== this.state.hoverObj) {
	      const prevObjType = this.state.hoverObj ? this.state.hoverObj.__graphObjType : null;
	      const prevObjData = this.state.hoverObj ? this.state.hoverObj.__data : null;
	      const objType = topObject ? topObject.__graphObjType : null;
	      const objData = topObject ? topObject.__data : null;

	      if (prevObjType && prevObjType !== objType) {
	        // Hover out
	        this.data['on' + (prevObjType === 'node' ? 'Node' : 'Link') + 'CenterHover'](null, prevObjData);
	      }
	      if (objType) {
	        // Hover in
	        this.data['on' + (objType === 'node' ? 'Node' : 'Link') + 'CenterHover'](objData, prevObjType === objType ? prevObjData : null);
	      }

	      this.state.hoverObj = topObject;
	      this.state.tooltipEl.setAttribute('value', topObject ? accessorFn(this.data[topObject.__graphObjType + 'Label'])(topObject.__data) || '' : '' );
	      this.state.subTooltipEl.setAttribute('value', topObject ? accessorFn(this.data[topObject.__graphObjType + 'Desc'])(topObject.__data) || '' : '' );
	    }

	    // Run force-graph ticker
	    this.forceGraph.tickFrame();
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

	var three$2 = __webpack_require__(3);
	var d3Force3d = __webpack_require__(4);
	var graph = _interopDefault(__webpack_require__(10));
	var forcelayout = _interopDefault(__webpack_require__(12));
	var forcelayout3d = _interopDefault(__webpack_require__(31));
	var Kapsule = _interopDefault(__webpack_require__(58));
	var accessorFn = _interopDefault(__webpack_require__(1));
	var d3Scale = __webpack_require__(60);
	var d3ScaleChromatic = __webpack_require__(67);
	var tinyColor = _interopDefault(__webpack_require__(68));

	function _typeof(obj) {
	  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
	    _typeof = function (obj) {
	      return typeof obj;
	    };
	  } else {
	    _typeof = function (obj) {
	      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
	    };
	  }

	  return _typeof(obj);
	}

	function _classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	}

	function _inherits(subClass, superClass) {
	  if (typeof superClass !== "function" && superClass !== null) {
	    throw new TypeError("Super expression must either be null or a function");
	  }

	  subClass.prototype = Object.create(superClass && superClass.prototype, {
	    constructor: {
	      value: subClass,
	      writable: true,
	      configurable: true
	    }
	  });
	  if (superClass) _setPrototypeOf(subClass, superClass);
	}

	function _getPrototypeOf(o) {
	  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
	    return o.__proto__ || Object.getPrototypeOf(o);
	  };
	  return _getPrototypeOf(o);
	}

	function _setPrototypeOf(o, p) {
	  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
	    o.__proto__ = p;
	    return o;
	  };

	  return _setPrototypeOf(o, p);
	}

	function isNativeReflectConstruct() {
	  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
	  if (Reflect.construct.sham) return false;
	  if (typeof Proxy === "function") return true;

	  try {
	    Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
	    return true;
	  } catch (e) {
	    return false;
	  }
	}

	function _construct(Parent, args, Class) {
	  if (isNativeReflectConstruct()) {
	    _construct = Reflect.construct;
	  } else {
	    _construct = function _construct(Parent, args, Class) {
	      var a = [null];
	      a.push.apply(a, args);
	      var Constructor = Function.bind.apply(Parent, a);
	      var instance = new Constructor();
	      if (Class) _setPrototypeOf(instance, Class.prototype);
	      return instance;
	    };
	  }

	  return _construct.apply(null, arguments);
	}

	function _assertThisInitialized(self) {
	  if (self === void 0) {
	    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	  }

	  return self;
	}

	function _possibleConstructorReturn(self, call) {
	  if (call && (typeof call === "object" || typeof call === "function")) {
	    return call;
	  }

	  return _assertThisInitialized(self);
	}

	function _toConsumableArray(arr) {
	  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
	}

	function _arrayWithoutHoles(arr) {
	  if (Array.isArray(arr)) {
	    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

	    return arr2;
	  }
	}

	function _iterableToArray(iter) {
	  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
	}

	function _nonIterableSpread() {
	  throw new TypeError("Invalid attempt to spread non-iterable instance");
	}

	var colorStr2Hex = function colorStr2Hex(str) {
	  return isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;
	};

	var colorAlpha = function colorAlpha(str) {
	  return isNaN(str) ? tinyColor(str).getAlpha() : 1;
	};

	var autoColorScale = d3Scale.scaleOrdinal(d3ScaleChromatic.schemePaired); // Autoset attribute colorField by colorByAccessor property
	// If an object has already a color, don't set it
	// Objects can be nodes or links

	function autoColorObjects(objects, colorByAccessor, colorField) {
	  if (!colorByAccessor || typeof colorField !== 'string') return;
	  objects.filter(function (obj) {
	    return !obj[colorField];
	  }).forEach(function (obj) {
	    obj[colorField] = autoColorScale(colorByAccessor(obj));
	  });
	}

	function getDagDepths (_ref, idAccessor) {
	  var nodes = _ref.nodes,
	      links = _ref.links;
	  // linked graph
	  var graph = {};
	  nodes.forEach(function (node) {
	    return graph[idAccessor(node)] = {
	      data: node,
	      out: [],
	      depth: -1
	    };
	  });
	  links.forEach(function (_ref2) {
	    var source = _ref2.source,
	        target = _ref2.target;
	    var sourceId = getNodeId(source);
	    var targetId = getNodeId(target);
	    if (!graph.hasOwnProperty(sourceId)) throw "Missing source node with id: ".concat(sourceId);
	    if (!graph.hasOwnProperty(targetId)) throw "Missing target node with id: ".concat(targetId);
	    var sourceNode = graph[sourceId];
	    var targetNode = graph[targetId];
	    sourceNode.out.push(targetNode);

	    function getNodeId(node) {
	      return _typeof(node) === 'object' ? idAccessor(node) : node;
	    }
	  });
	  traverse(Object.values(graph)); // cleanup

	  Object.keys(graph).forEach(function (id) {
	    return graph[id] = graph[id].depth;
	  });
	  return graph;

	  function traverse(nodes) {
	    var nodeStack = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
	    var currentDepth = nodeStack.length;

	    for (var i = 0, l = nodes.length; i < l; i++) {
	      var node = nodes[i];

	      if (nodeStack.indexOf(node) !== -1) {
	        var loop = [].concat(_toConsumableArray(nodeStack.slice(nodeStack.indexOf(node))), [node]).map(function (d) {
	          return idAccessor(d.data);
	        });
	        throw "Invalid DAG structure! Found cycle in node path: ".concat(loop.join(' -> '), ".");
	      }

	      if (currentDepth > node.depth) {
	        // Don't unnecessarily revisit chunks of the graph
	        node.depth = currentDepth;
	        traverse(node.out, [].concat(_toConsumableArray(nodeStack), [node]));
	      }
	    }
	  }
	}

	var three = window.THREE ? window.THREE // Prefer consumption from global THREE, if exists
	: {
	  Mesh: three$2.Mesh,
	  MeshLambertMaterial: three$2.MeshLambertMaterial,
	  BufferGeometry: three$2.BufferGeometry,
	  BufferAttribute: three$2.BufferAttribute,
	  Matrix4: three$2.Matrix4,
	  Vector3: three$2.Vector3,
	  SphereBufferGeometry: three$2.SphereBufferGeometry,
	  CylinderBufferGeometry: three$2.CylinderBufferGeometry,
	  ConeBufferGeometry: three$2.ConeBufferGeometry,
	  Line: three$2.Line,
	  LineBasicMaterial: three$2.LineBasicMaterial,
	  QuadraticBezierCurve3: three$2.QuadraticBezierCurve3,
	  CubicBezierCurve3: three$2.CubicBezierCurve3
	};
	var ngraph = {
	  graph: graph,
	  forcelayout: forcelayout,
	  forcelayout3d: forcelayout3d
	};

	var DAG_LEVEL_NODE_RATIO = 2;
	var ForceGraph = Kapsule({
	  props: {
	    jsonUrl: {
	      onChange: function onChange(jsonUrl, state) {
	        var _this = this;

	        if (jsonUrl && !state.fetchingJson) {
	          // Load data asynchronously
	          state.fetchingJson = true;
	          state.onLoading();
	          fetch(jsonUrl).then(function (r) {
	            return r.json();
	          }).then(function (json) {
	            state.fetchingJson = false;

	            _this.graphData(json);
	          });
	        }
	      },
	      triggerUpdate: false
	    },
	    graphData: {
	      "default": {
	        nodes: [],
	        links: []
	      },
	      onChange: function onChange(graphData, state) {
	        if (graphData.nodes.length || graphData.links.length) {
	          console.info('force-graph loading', graphData.nodes.length + ' nodes', graphData.links.length + ' links');
	        }

	        state.engineRunning = false; // Pause simulation immediately

	        state.sceneNeedsRepopulating = true;
	        state.simulationNeedsReheating = true;
	      }
	    },
	    numDimensions: {
	      "default": 3,
	      onChange: function onChange(numDim, state) {
	        state.simulationNeedsReheating = true;
	        var chargeForce = state.d3ForceLayout.force('charge'); // Increase repulsion on 3D mode for improved spatial separation

	        if (chargeForce) {
	          chargeForce.strength(numDim > 2 ? -60 : -30);
	        }

	        if (numDim < 3) {
	          eraseDimension(state.graphData.nodes, 'z');
	        }

	        if (numDim < 2) {
	          eraseDimension(state.graphData.nodes, 'y');
	        }

	        function eraseDimension(nodes, dim) {
	          nodes.forEach(function (d) {
	            delete d[dim]; // position

	            delete d["v".concat(dim)]; // velocity
	          });
	        }
	      }
	    },
	    dagMode: {
	      onChange: function onChange(dagMode, state) {
	        // td, bu, lr, rl, zin, zout, radialin, radialout
	        !dagMode && state.forceEngine === 'd3' && (state.graphData.nodes || []).forEach(function (n) {
	          return n.fx = n.fy = n.fz = undefined;
	        }); // unfix nodes when disabling dag mode

	        state.simulationNeedsReheating = true;
	      }
	    },
	    dagLevelDistance: {
	      onChange: function onChange(_, state) {
	        state.simulationNeedsReheating = true;
	      }
	    },
	    nodeRelSize: {
	      "default": 4,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    // volume per val unit
	    nodeId: {
	      "default": 'id',
	      onChange: function onChange(_, state) {
	        state.simulationNeedsReheating = true;
	      }
	    },
	    nodeVal: {
	      "default": 'val',
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    nodeResolution: {
	      "default": 8,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    // how many slice segments in the sphere's circumference
	    nodeColor: {
	      "default": 'color',
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    nodeAutoColorBy: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    nodeOpacity: {
	      "default": 0.75,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    nodeThreeObject: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    nodeThreeObjectExtend: {
	      "default": false,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkSource: {
	      "default": 'source',
	      onChange: function onChange(_, state) {
	        state.simulationNeedsReheating = true;
	      }
	    },
	    linkTarget: {
	      "default": 'target',
	      onChange: function onChange(_, state) {
	        state.simulationNeedsReheating = true;
	      }
	    },
	    linkVisibility: {
	      "default": true,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkColor: {
	      "default": 'color',
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkAutoColorBy: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkOpacity: {
	      "default": 0.2,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkWidth: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    // Rounded to nearest decimal. For falsy values use dimensionless line with 1px regardless of distance.
	    linkResolution: {
	      "default": 6,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    // how many radial segments in each line tube's geometry
	    linkCurvature: {
	      "default": 0,
	      triggerUpdate: false
	    },
	    // line curvature radius (0: straight, 1: semi-circle)
	    linkCurveRotation: {
	      "default": 0,
	      triggerUpdate: false
	    },
	    // line curve rotation along the line axis (0: interection with XY plane, PI: upside down)
	    linkMaterial: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkThreeObject: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkThreeObjectExtend: {
	      "default": false,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkPositionUpdate: {
	      triggerUpdate: false
	    },
	    // custom function to call for updating the link's position. Signature: (threeObj, { start: { x, y, z},  end: { x, y, z }}, link). If the function returns a truthy value, the regular link position update will not run.
	    linkDirectionalArrowLength: {
	      "default": 0,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkDirectionalArrowColor: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkDirectionalArrowRelPos: {
	      "default": 0.5,
	      triggerUpdate: false
	    },
	    // value between 0<>1 indicating the relative pos along the (exposed) line
	    linkDirectionalArrowResolution: {
	      "default": 8,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    // how many slice segments in the arrow's conic circumference
	    linkDirectionalParticles: {
	      "default": 0,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    // animate photons travelling in the link direction
	    linkDirectionalParticleSpeed: {
	      "default": 0.01,
	      triggerUpdate: false
	    },
	    // in link length ratio per frame
	    linkDirectionalParticleWidth: {
	      "default": 0.5,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkDirectionalParticleColor: {
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    linkDirectionalParticleResolution: {
	      "default": 4,
	      onChange: function onChange(_, state) {
	        state.sceneNeedsRepopulating = true;
	      }
	    },
	    // how many slice segments in the particle sphere's circumference
	    forceEngine: {
	      "default": 'd3',
	      onChange: function onChange(_, state) {
	        state.simulationNeedsReheating = true;
	      }
	    },
	    // d3 or ngraph
	    d3AlphaDecay: {
	      "default": 0.0228,
	      triggerUpdate: false,
	      onChange: function onChange(alphaDecay, state) {
	        state.d3ForceLayout.alphaDecay(alphaDecay);
	      }
	    },
	    d3AlphaTarget: {
	      "default": 0,
	      triggerUpdate: false,
	      onChange: function onChange(alphaTarget, state) {
	        state.d3ForceLayout.alphaTarget(alphaTarget);
	      }
	    },
	    d3VelocityDecay: {
	      "default": 0.4,
	      triggerUpdate: false,
	      onChange: function onChange(velocityDecay, state) {
	        state.d3ForceLayout.velocityDecay(velocityDecay);
	      }
	    },
	    warmupTicks: {
	      "default": 0,
	      triggerUpdate: false
	    },
	    // how many times to tick the force engine at init before starting to render
	    cooldownTicks: {
	      "default": Infinity,
	      triggerUpdate: false
	    },
	    cooldownTime: {
	      "default": 15000,
	      triggerUpdate: false
	    },
	    // ms
	    onLoading: {
	      "default": function _default() {},
	      triggerUpdate: false
	    },
	    onFinishLoading: {
	      "default": function _default() {},
	      triggerUpdate: false
	    },
	    onEngineTick: {
	      "default": function _default() {},
	      triggerUpdate: false
	    },
	    onEngineStop: {
	      "default": function _default() {},
	      triggerUpdate: false
	    }
	  },
	  methods: {
	    refresh: function refresh(state) {
	      state.sceneNeedsRepopulating = true;
	      state.simulationNeedsReheating = true;

	      state._rerender();

	      return this;
	    },
	    // Expose d3 forces for external manipulation
	    d3Force: function d3Force(state, forceName, forceFn) {
	      if (forceFn === undefined) {
	        return state.d3ForceLayout.force(forceName); // Force getter
	      }

	      state.d3ForceLayout.force(forceName, forceFn); // Force setter

	      return this;
	    },
	    _updateScene: function _updateScene(state) {},
	    // reset cooldown state
	    resetCountdown: function resetCountdown(state) {
	      state.cntTicks = 0;
	      state.startTickTime = new Date();
	      state.engineRunning = true;
	      return this;
	    },
	    tickFrame: function tickFrame(state) {
	      var isD3Sim = state.forceEngine !== 'ngraph';

	      if (state.engineRunning) {
	        layoutTick();
	      }

	      updateArrows();
	      updatePhotons();
	      return this; //

	      function layoutTick() {
	        if (++state.cntTicks > state.cooldownTicks || new Date() - state.startTickTime > state.cooldownTime) {
	          state.engineRunning = false; // Stop ticking graph

	          state.onEngineStop();
	        } else {
	          state.layout[isD3Sim ? 'tick' : 'step'](); // Tick it

	          state.onEngineTick();
	        } // Update nodes position


	        state.graphData.nodes.forEach(function (node) {
	          var obj = node.__threeObj;
	          if (!obj) return;
	          var pos = isD3Sim ? node : state.layout.getNodePosition(node[state.nodeId]);
	          obj.position.x = pos.x;
	          obj.position.y = pos.y || 0;
	          obj.position.z = pos.z || 0;
	        }); // Update links position

	        var linkCurvatureAccessor = accessorFn(state.linkCurvature);
	        var linkCurveRotationAccessor = accessorFn(state.linkCurveRotation);
	        var linkThreeObjectExtendAccessor = accessorFn(state.linkThreeObjectExtend);
	        state.graphData.links.forEach(function (link) {
	          var line = link.__lineObj;
	          if (!line) return;
	          var pos = isD3Sim ? link : state.layout.getLinkPosition(state.layout.graph.getLink(link.source, link.target).id);
	          var start = pos[isD3Sim ? 'source' : 'from'];
	          var end = pos[isD3Sim ? 'target' : 'to'];
	          if (!start.hasOwnProperty('x') || !end.hasOwnProperty('x')) return; // skip invalid link

	          calcLinkCurve(link); // calculate link curve for all links, including custom replaced, so it can be used in directional functionality

	          var extendedObj = linkThreeObjectExtendAccessor(link);

	          if (state.linkPositionUpdate && state.linkPositionUpdate(extendedObj ? line.children[0] : line, // pass child custom object if extending the default
	          {
	            start: {
	              x: start.x,
	              y: start.y,
	              z: start.z
	            },
	            end: {
	              x: end.x,
	              y: end.y,
	              z: end.z
	            }
	          }, link) && !extendedObj) {
	            // exit if successfully custom updated position of non-extended obj
	            return;
	          }

	          if (line.type === 'Line') {
	            // Update line geometry
	            var curveResolution = 30; // # line segments

	            var curve = link.__curve;

	            if (!curve) {
	              // straight line
	              var linePos = line.geometry.getAttribute('position');

	              if (!linePos || !linePos.array || linePos.array.length !== 6) {
	                line.geometry.addAttribute('position', linePos = new three.BufferAttribute(new Float32Array(2 * 3), 3));
	              }

	              linePos.array[0] = start.x;
	              linePos.array[1] = start.y || 0;
	              linePos.array[2] = start.z || 0;
	              linePos.array[3] = end.x;
	              linePos.array[4] = end.y || 0;
	              linePos.array[5] = end.z || 0;
	              linePos.needsUpdate = true;
	            } else {
	              // bezier curve line
	              line.geometry.setFromPoints(curve.getPoints(curveResolution));
	            }

	            line.geometry.computeBoundingSphere();
	          } else if (line.type === 'Mesh') {
	            // Update cylinder geometry
	            // links with width ignore linkCurvature because TubeGeometries can't be updated
	            link.__curve = null; // force reset link curve

	            var vStart = new three.Vector3(start.x, start.y || 0, start.z || 0);
	            var vEnd = new three.Vector3(end.x, end.y || 0, end.z || 0);
	            var distance = vStart.distanceTo(vEnd);
	            line.position.x = vStart.x;
	            line.position.y = vStart.y;
	            line.position.z = vStart.z;
	            line.scale.z = distance;
	            line.parent.localToWorld(vEnd); // lookAt requires world coords

	            line.lookAt(vEnd);
	          }
	        }); //

	        function calcLinkCurve(link) {
	          var pos = isD3Sim ? link : state.layout.getLinkPosition(state.layout.graph.getLink(link.source, link.target).id);
	          var start = pos[isD3Sim ? 'source' : 'from'];
	          var end = pos[isD3Sim ? 'target' : 'to'];
	          if (!start.hasOwnProperty('x') || !end.hasOwnProperty('x')) return; // skip invalid link

	          var curvature = linkCurvatureAccessor(link);

	          if (!curvature) {
	            link.__curve = null; // Straight line
	          } else {
	            // bezier curve line (only for line types)
	            var vStart = new three.Vector3(start.x, start.y || 0, start.z || 0);
	            var vEnd = new three.Vector3(end.x, end.y || 0, end.z || 0);
	            var l = vStart.distanceTo(vEnd); // line length

	            var curve;
	            var curveRotation = linkCurveRotationAccessor(link);

	            if (l > 0) {
	              var dx = end.x - start.x;
	              var dy = end.y - start.y || 0;
	              var vLine = new three.Vector3().subVectors(vEnd, vStart);
	              var cp = vLine.clone().multiplyScalar(curvature).cross(dx !== 0 || dy !== 0 ? new three.Vector3(0, 0, 1) : new three.Vector3(0, 1, 0)) // avoid cross-product of parallel vectors (prefer Z, fallback to Y)
	              .applyAxisAngle(vLine.normalize(), curveRotation) // rotate along line axis according to linkCurveRotation
	              .add(new three.Vector3().addVectors(vStart, vEnd).divideScalar(2));
	              curve = new three.QuadraticBezierCurve3(vStart, cp, vEnd);
	            } else {
	              // Same point, draw a loop
	              var d = curvature * 70;
	              var endAngle = -curveRotation; // Rotate clockwise (from Z angle perspective)

	              var startAngle = endAngle + Math.PI / 2;
	              curve = new three.CubicBezierCurve3(vStart, new three.Vector3(d * Math.cos(startAngle), d * Math.sin(startAngle), 0).add(vStart), new three.Vector3(d * Math.cos(endAngle), d * Math.sin(endAngle), 0).add(vStart), vEnd);
	            }

	            link.__curve = curve;
	          }
	        }
	      }

	      function updateArrows() {
	        // update link arrow position
	        var arrowRelPosAccessor = accessorFn(state.linkDirectionalArrowRelPos);
	        var arrowLengthAccessor = accessorFn(state.linkDirectionalArrowLength);
	        var nodeValAccessor = accessorFn(state.nodeVal);
	        state.graphData.links.forEach(function (link) {
	          var arrowObj = link.__arrowObj;
	          if (!arrowObj) return;
	          var pos = isD3Sim ? link : state.layout.getLinkPosition(state.layout.graph.getLink(link.source, link.target).id);
	          var start = pos[isD3Sim ? 'source' : 'from'];
	          var end = pos[isD3Sim ? 'target' : 'to'];
	          if (!start.hasOwnProperty('x') || !end.hasOwnProperty('x')) return; // skip invalid link

	          var startR = Math.sqrt(Math.max(0, nodeValAccessor(start) || 1)) * state.nodeRelSize;
	          var endR = Math.sqrt(Math.max(0, nodeValAccessor(end) || 1)) * state.nodeRelSize;
	          var arrowLength = arrowLengthAccessor(link);
	          var arrowRelPos = arrowRelPosAccessor(link);
	          var getPosAlongLine = link.__curve ? function (t) {
	            return link.__curve.getPoint(t);
	          } // interpolate along bezier curve
	          : function (t) {
	            // straight line: interpolate linearly
	            var iplt = function iplt(dim, start, end, t) {
	              return start[dim] + (end[dim] - start[dim]) * t || 0;
	            };

	            return {
	              x: iplt('x', start, end, t),
	              y: iplt('y', start, end, t),
	              z: iplt('z', start, end, t)
	            };
	          };
	          var lineLen = link.__curve ? link.__curve.getLength() : Math.sqrt(['x', 'y', 'z'].map(function (dim) {
	            return Math.pow((end[dim] || 0) - (start[dim] || 0), 2);
	          }).reduce(function (acc, v) {
	            return acc + v;
	          }, 0));
	          var posAlongLine = startR + arrowLength + (lineLen - startR - endR - arrowLength) * arrowRelPos;
	          var arrowHead = getPosAlongLine(posAlongLine / lineLen);
	          var arrowTail = getPosAlongLine((posAlongLine - arrowLength) / lineLen);
	          ['x', 'y', 'z'].forEach(function (dim) {
	            return arrowObj.position[dim] = arrowTail[dim];
	          });

	          var headVec = _construct(three.Vector3, _toConsumableArray(['x', 'y', 'z'].map(function (c) {
	            return arrowHead[c];
	          })));

	          arrowObj.parent.localToWorld(headVec); // lookAt requires world coords

	          arrowObj.lookAt(headVec);
	        });
	      }

	      function updatePhotons() {
	        // update link particle positions
	        var particleSpeedAccessor = accessorFn(state.linkDirectionalParticleSpeed);
	        state.graphData.links.forEach(function (link) {
	          var photons = link.__photonObjs;
	          if (!photons || !photons.length) return;
	          var pos = isD3Sim ? link : state.layout.getLinkPosition(state.layout.graph.getLink(link.source, link.target).id);
	          var start = pos[isD3Sim ? 'source' : 'from'];
	          var end = pos[isD3Sim ? 'target' : 'to'];
	          if (!start.hasOwnProperty('x') || !end.hasOwnProperty('x')) return; // skip invalid link

	          var particleSpeed = particleSpeedAccessor(link);
	          var getPhotonPos = link.__curve ? function (t) {
	            return link.__curve.getPoint(t);
	          } // interpolate along bezier curve
	          : function (t) {
	            // straight line: interpolate linearly
	            var iplt = function iplt(dim, start, end, t) {
	              return start[dim] + (end[dim] - start[dim]) * t || 0;
	            };

	            return {
	              x: iplt('x', start, end, t),
	              y: iplt('y', start, end, t),
	              z: iplt('z', start, end, t)
	            };
	          };
	          photons.forEach(function (photon, idx) {
	            var photonPosRatio = photon.__progressRatio = ((photon.__progressRatio || idx / photons.length) + particleSpeed) % 1;
	            var pos = getPhotonPos(photonPosRatio);
	            ['x', 'y', 'z'].forEach(function (dim) {
	              return photon.position[dim] = pos[dim];
	            });
	          });
	        });
	      }
	    }
	  },
	  stateInit: function stateInit() {
	    return {
	      d3ForceLayout: d3Force3d.forceSimulation().force('link', d3Force3d.forceLink()).force('charge', d3Force3d.forceManyBody()).force('center', d3Force3d.forceCenter()).force('dagRadial', null).stop(),
	      engineRunning: false,
	      sceneNeedsRepopulating: true,
	      simulationNeedsReheating: true
	    };
	  },
	  init: function init(threeObj, state) {
	    // Main three object to manipulate
	    state.graphScene = threeObj;
	  },
	  update: function update(state) {
	    state.engineRunning = false; // pause simulation

	    if (state.sceneNeedsRepopulating) {
	      state.sceneNeedsRepopulating = false;

	      if (state.nodeAutoColorBy !== null) {
	        // Auto add color to uncolored nodes
	        autoColorObjects(state.graphData.nodes, accessorFn(state.nodeAutoColorBy), state.nodeColor);
	      }

	      if (state.linkAutoColorBy !== null) {
	        // Auto add color to uncolored links
	        autoColorObjects(state.graphData.links, accessorFn(state.linkAutoColorBy), state.linkColor);
	      } // Clear the scene


	      var materialDispose = function materialDispose(material) {
	        if (material instanceof Array) {
	          material.forEach(materialDispose);
	        } else {
	          if (material.map) {
	            material.map.dispose();
	          }

	          material.dispose();
	        }
	      };

	      var deallocate = function deallocate(obj) {
	        if (obj.geometry) {
	          obj.geometry.dispose();
	        }

	        if (obj.material) {
	          materialDispose(obj.material);
	        }

	        if (obj.texture) {
	          obj.texture.dispose();
	        }

	        if (obj.children) {
	          obj.children.forEach(deallocate);
	        }
	      };

	      while (state.graphScene.children.length) {
	        var obj = state.graphScene.children[0];
	        state.graphScene.remove(obj);
	        deallocate(obj);
	      } // Add WebGL objects


	      var customNodeObjectAccessor = accessorFn(state.nodeThreeObject);
	      var customNodeObjectExtendAccessor = accessorFn(state.nodeThreeObjectExtend);
	      var valAccessor = accessorFn(state.nodeVal);
	      var colorAccessor = accessorFn(state.nodeColor);
	      var sphereGeometries = {}; // indexed by node value

	      var sphereMaterials = {}; // indexed by color

	      state.graphData.nodes.forEach(function (node) {
	        var customObj = customNodeObjectAccessor(node);
	        var extendObj = customNodeObjectExtendAccessor(node);

	        if (customObj && state.nodeThreeObject === customObj) {
	          // clone object if it's a shared object among all nodes
	          customObj = customObj.clone();
	        }

	        var obj;

	        if (customObj && !extendObj) {
	          obj = customObj;
	        } else {
	          // Add default object (sphere mesh)
	          var val = valAccessor(node) || 1;

	          if (!sphereGeometries.hasOwnProperty(val)) {
	            sphereGeometries[val] = new three.SphereBufferGeometry(Math.cbrt(val) * state.nodeRelSize, state.nodeResolution, state.nodeResolution);
	          }

	          var color = colorAccessor(node);

	          if (!sphereMaterials.hasOwnProperty(color)) {
	            sphereMaterials[color] = new three.MeshLambertMaterial({
	              color: colorStr2Hex(color || '#ffffaa'),
	              transparent: true,
	              opacity: state.nodeOpacity * colorAlpha(color)
	            });
	          }

	          obj = new three.Mesh(sphereGeometries[val], sphereMaterials[color]);

	          if (customObj && extendObj) {
	            obj.add(customObj); // extend default with custom
	          }
	        }

	        obj.__graphObjType = 'node'; // Add object type

	        obj.__data = node; // Attach node data

	        state.graphScene.add(node.__threeObj = obj);
	      });
	      var customLinkObjectAccessor = accessorFn(state.linkThreeObject);
	      var customLinkObjectExtendAccessor = accessorFn(state.linkThreeObjectExtend);
	      var customLinkMaterialAccessor = accessorFn(state.linkMaterial);
	      var linkVisibilityAccessor = accessorFn(state.linkVisibility);
	      var linkColorAccessor = accessorFn(state.linkColor);
	      var linkWidthAccessor = accessorFn(state.linkWidth);
	      var linkArrowLengthAccessor = accessorFn(state.linkDirectionalArrowLength);
	      var linkArrowColorAccessor = accessorFn(state.linkDirectionalArrowColor);
	      var linkParticlesAccessor = accessorFn(state.linkDirectionalParticles);
	      var linkParticleWidthAccessor = accessorFn(state.linkDirectionalParticleWidth);
	      var linkParticleColorAccessor = accessorFn(state.linkDirectionalParticleColor);
	      var lineMaterials = {}; // indexed by link color

	      var cylinderGeometries = {}; // indexed by link width

	      var particleMaterials = {}; // indexed by link color

	      var particleGeometries = {}; // indexed by particle width

	      state.graphData.links.forEach(function (link) {
	        if (!linkVisibilityAccessor(link)) {
	          // Exclude non-visible links
	          link.__lineObj = link.__arrowObj = link.__photonObjs = null;
	          return;
	        }

	        var color = linkColorAccessor(link);
	        var customObj = customLinkObjectAccessor(link);
	        var extendObj = customLinkObjectExtendAccessor(link);

	        if (customObj && state.linkThreeObject === customObj) {
	          // clone object if it's a shared object among all links
	          customObj = customObj.clone();
	        }

	        var lineObj;

	        if (customObj && !extendObj) {
	          lineObj = customObj;
	        } else {
	          // Add default line object
	          var linkWidth = Math.ceil(linkWidthAccessor(link) * 10) / 10;
	          var useCylinder = !!linkWidth;
	          var geometry;

	          if (useCylinder) {
	            if (!cylinderGeometries.hasOwnProperty(linkWidth)) {
	              var r = linkWidth / 2;
	              geometry = new three.CylinderBufferGeometry(r, r, 1, state.linkResolution, 1, false);
	              geometry.applyMatrix(new three.Matrix4().makeTranslation(0, 1 / 2, 0));
	              geometry.applyMatrix(new three.Matrix4().makeRotationX(Math.PI / 2));
	              cylinderGeometries[linkWidth] = geometry;
	            }

	            geometry = cylinderGeometries[linkWidth];
	          } else {
	            // Use plain line (constant width)
	            geometry = new three.BufferGeometry();
	            geometry.addAttribute('position', new three.BufferAttribute(new Float32Array(2 * 3), 3));
	          }

	          var lineMaterial = customLinkMaterialAccessor(link);

	          if (!lineMaterial) {
	            if (!lineMaterials.hasOwnProperty(color)) {
	              var lineOpacity = state.linkOpacity * colorAlpha(color);
	              lineMaterials[color] = new three.MeshLambertMaterial({
	                color: colorStr2Hex(color || '#f0f0f0'),
	                transparent: lineOpacity < 1,
	                opacity: lineOpacity,
	                depthWrite: lineOpacity >= 1 // Prevent transparency issues

	              });
	            }

	            lineMaterial = lineMaterials[color];
	          }

	          lineObj = new three[useCylinder ? 'Mesh' : 'Line'](geometry, lineMaterial);

	          if (customObj && extendObj) {
	            lineObj.add(customObj); // extend default with custom
	          }
	        }

	        lineObj.renderOrder = 10; // Prevent visual glitches of dark lines on top of nodes by rendering them last

	        lineObj.__graphObjType = 'link'; // Add object type

	        lineObj.__data = link; // Attach link data

	        state.graphScene.add(link.__lineObj = lineObj); // Add arrow

	        var arrowLength = linkArrowLengthAccessor(link);

	        if (arrowLength && arrowLength > 0) {
	          var arrowColor = linkArrowColorAccessor(link) || color || '#f0f0f0';
	          var coneGeometry = new three.ConeBufferGeometry(arrowLength * 0.25, arrowLength, state.linkDirectionalArrowResolution); // Correct orientation

	          coneGeometry.translate(0, arrowLength / 2, 0);
	          coneGeometry.rotateX(Math.PI / 2);
	          var arrowObj = new three.Mesh(coneGeometry, new three.MeshLambertMaterial({
	            color: colorStr2Hex(arrowColor),
	            transparent: true,
	            opacity: state.linkOpacity * 3
	          }));
	          state.graphScene.add(link.__arrowObj = arrowObj);
	        } // Add photon particles


	        var numPhotons = Math.round(Math.abs(linkParticlesAccessor(link)));
	        var photonR = Math.ceil(linkParticleWidthAccessor(link) * 10) / 10 / 2;
	        var photonColor = linkParticleColorAccessor(link) || color || '#f0f0f0';

	        if (!particleGeometries.hasOwnProperty(photonR)) {
	          particleGeometries[photonR] = new three.SphereBufferGeometry(photonR, state.linkDirectionalParticleResolution, state.linkDirectionalParticleResolution);
	        }

	        var particleGeometry = particleGeometries[photonR];

	        if (!particleMaterials.hasOwnProperty(photonColor)) {
	          particleMaterials[photonColor] = new three.MeshLambertMaterial({
	            color: colorStr2Hex(photonColor),
	            transparent: true,
	            opacity: state.linkOpacity * 3
	          });
	        }

	        var particleMaterial = particleMaterials[photonColor];

	        var photons = _toConsumableArray(Array(numPhotons)).map(function () {
	          return new three.Mesh(particleGeometry, particleMaterial);
	        });

	        photons.forEach(function (photon) {
	          return state.graphScene.add(photon);
	        });
	        link.__photonObjs = photons;
	      });
	    }

	    if (state.simulationNeedsReheating) {
	      state.simulationNeedsReheating = false;
	      state.engineRunning = false; // Pause simulation
	      // parse links

	      state.graphData.links.forEach(function (link) {
	        link.source = link[state.linkSource];
	        link.target = link[state.linkTarget];
	      }); // Feed data to force-directed layout

	      var isD3Sim = state.forceEngine !== 'ngraph';
	      var layout;

	      if (isD3Sim) {
	        // D3-force
	        (layout = state.d3ForceLayout).stop().alpha(1) // re-heat the simulation
	        .numDimensions(state.numDimensions).nodes(state.graphData.nodes); // add links (if link force is still active)

	        var linkForce = state.d3ForceLayout.force('link');

	        if (linkForce) {
	          linkForce.id(function (d) {
	            return d[state.nodeId];
	          }).links(state.graphData.links);
	        } // setup dag force constraints


	        var nodeDepths = state.dagMode && getDagDepths(state.graphData, function (node) {
	          return node[state.nodeId];
	        });
	        var maxDepth = Math.max.apply(Math, _toConsumableArray(Object.values(nodeDepths || [])));
	        var dagLevelDistance = state.dagLevelDistance || state.graphData.nodes.length / (maxDepth || 1) * DAG_LEVEL_NODE_RATIO * (['radialin', 'radialout'].indexOf(state.dagMode) !== -1 ? 0.7 : 1); // Fix nodes to x,y,z for dag mode

	        if (state.dagMode) {
	          var getFFn = function getFFn(fix, invert) {
	            return function (node) {
	              return !fix ? undefined : (nodeDepths[node[state.nodeId]] - maxDepth / 2) * dagLevelDistance * (invert ? -1 : 1);
	            };
	          };

	          var fxFn = getFFn(['lr', 'rl'].indexOf(state.dagMode) !== -1, state.dagMode === 'rl');
	          var fyFn = getFFn(['td', 'bu'].indexOf(state.dagMode) !== -1, state.dagMode === 'td');
	          var fzFn = getFFn(['zin', 'zout'].indexOf(state.dagMode) !== -1, state.dagMode === 'zout');
	          state.graphData.nodes.forEach(function (node) {
	            node.fx = fxFn(node);
	            node.fy = fyFn(node);
	            node.fz = fzFn(node);
	          });
	        }

	        state.d3ForceLayout.force('dagRadial', ['radialin', 'radialout'].indexOf(state.dagMode) !== -1 ? d3Force3d.forceRadial(function (node) {
	          var nodeDepth = nodeDepths[node[state.nodeId]];
	          return (state.dagMode === 'radialin' ? maxDepth - nodeDepth : nodeDepth) * dagLevelDistance;
	        }).strength(1) : null);
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


	      state.layout = layout;
	      this.resetCountdown();
	      state.onFinishLoading();
	    }

	    state.engineRunning = true; // resume simulation
	  }
	});

	function fromKapsule (kapsule) {
	  var baseClass = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Object;
	  var initKapsuleWithSelf = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

	  var FromKapsule =
	  /*#__PURE__*/
	  function (_baseClass) {
	    _inherits(FromKapsule, _baseClass);

	    function FromKapsule() {
	      var _getPrototypeOf2;

	      var _this;

	      _classCallCheck(this, FromKapsule);

	      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	        args[_key] = arguments[_key];
	      }

	      _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(FromKapsule)).call.apply(_getPrototypeOf2, [this].concat(args)));
	      _this.__kapsuleInstance = kapsule().apply(void 0, [].concat(_toConsumableArray(initKapsuleWithSelf ? [_assertThisInitialized(_this)] : []), args));
	      return _this;
	    }

	    return FromKapsule;
	  }(baseClass); // attach kapsule props/methods to class prototype


	  Object.keys(kapsule()).forEach(function (m) {
	    return FromKapsule.prototype[m] = function () {
	      var _this$__kapsuleInstan;

	      var returnVal = (_this$__kapsuleInstan = this.__kapsuleInstance)[m].apply(_this$__kapsuleInstan, arguments);

	      return returnVal === this.__kapsuleInstance ? this // chain based on this class, not the kapsule obj
	      : returnVal;
	    };
	  });
	  return FromKapsule;
	}

	var three$1 = window.THREE ? window.THREE : {
	  Group: three$2.Group
	}; // Prefer consumption from global THREE, if exists
	var threeForcegraph = fromKapsule(ForceGraph, three$1.Group, true);

	module.exports = threeForcegraph;


/***/ }),
/* 3 */
/***/ (function(module, exports) {

	module.exports = THREE;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	// https://github.com/vasturiano/d3-force-3d v2.0.1 Copyright 2018 Vasco Asturiano
	(function (global, factory) {
	 true ? factory(exports, __webpack_require__(5), __webpack_require__(6), __webpack_require__(7), __webpack_require__(8), __webpack_require__(9)) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-binarytree', 'd3-quadtree', 'd3-octree', 'd3-dispatch', 'd3-timer'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3,global.d3,global.d3));
	}(this, (function (exports,d3Binarytree,d3Quadtree,d3Octree,d3Dispatch,d3Timer) { 'use strict';

	function center(x, y, z) {
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
	}

	function constant(x) {
	  return function() {
	    return x;
	  };
	}

	function jiggle() {
	  return (Math.random() - 0.5) * 1e-6;
	}

	function x(d) {
	  return d.x + d.vx;
	}

	function y(d) {
	  return d.y + d.vy;
	}

	function z(d) {
	  return d.z + d.vz;
	}

	function collide(radius) {
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
	}

	function index(d) {
	  return d.index;
	}

	function find(nodeById, nodeId) {
	  var node = nodeById.get(nodeId);
	  if (!node) throw new Error("missing: " + nodeId);
	  return node;
	}

	function link(links) {
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
	        nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d])),
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
	}

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

	var initialRadius = 10,
	    initialAngleRoll = Math.PI * (3 - Math.sqrt(5)), // Golden angle
	    initialAngleYaw = Math.PI / 24; // Sequential

	function simulation(nodes, numDimensions) {
	  numDimensions = numDimensions || 2;

	  var nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(numDimensions))),
	      simulation,
	      alpha = 1,
	      alphaMin = 0.001,
	      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
	      alphaTarget = 0,
	      velocityDecay = 0.6,
	      forces = new Map(),
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

	  function tick(iterations) {
	    var i, n = nodes.length, node;

	    if (iterations === undefined) iterations = 1;

	    for (var k = 0; k < iterations; ++k) {
	      alpha += (alphaTarget - alpha) * alphaDecay;

	      forces.forEach(function (force) {
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

	    return simulation;
	  }

	  function initializeNodes() {
	    for (var i = 0, n = nodes.length, node; i < n; ++i) {
	      node = nodes[i], node.index = i;
	      if (!isNaN(node.fx)) node.x = node.fx;
	      if (!isNaN(node.fy)) node.y = node.fy;
	      if (!isNaN(node.fz)) node.z = node.fz;
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
	          ? (nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(_))), forces.forEach(initializeForce), simulation)
	          : nDim;
	    },

	    nodes: function(_) {
	      return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
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
	      return arguments.length > 1 ? ((_ == null ? forces.delete(name) : forces.set(name, initializeForce(_))), simulation) : forces.get(name);
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
	}

	function manyBody() {
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
	}

	function radial(radius, x, y, z) {
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
	}

	function x$2(x) {
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
	}

	function y$2(y) {
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
	}

	function z$2(z) {
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
	}

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

	// https://github.com/vasturiano/d3-binarytree v0.1.4 Copyright 2018 Vasco Asturiano
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	function tree_add(d) {
	  var x = +this._x.call(null, d);
	  return add(this.cover(x), x, d);
	}

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

	function tree_cover(x) {
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
	}

	function tree_data() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	}

	function tree_extent(_) {
	  return arguments.length
	      ? this.cover(+_[0][0]).cover(+_[1][0])
	      : isNaN(this._x0) ? undefined : [[this._x0], [this._x1]];
	}

	function Half(node, x0, x1) {
	  this.node = node;
	  this.x0 = x0;
	  this.x1 = x1;
	}

	function tree_find(x, radius) {
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
	}

	function tree_remove(d) {
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
	}

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	function tree_root() {
	  return this._root;
	}

	function tree_size() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	}

	function tree_visit(callback) {
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
	}

	function tree_visitAfter(callback) {
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
	}

	function defaultX(d) {
	  return d[0];
	}

	function tree_x(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	}

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

	// https://d3js.org/d3-quadtree/ v1.0.6 Copyright 2019 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	function tree_add(d) {
	  var x = +this._x.call(null, d),
	      y = +this._y.call(null, d);
	  return add(this.cover(x, y), x, y, d);
	}

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

	  // If there were no (valid) points, abort.
	  if (x0 > x1 || y0 > y1) return this;

	  // Expand the tree to cover the new points.
	  this.cover(x0, y0).cover(x1, y1);

	  // Add the new points.
	  for (i = 0; i < n; ++i) {
	    add(this, xz[i], yz[i], data[i]);
	  }

	  return this;
	}

	function tree_cover(x, y) {
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
	  else {
	    var z = x1 - x0,
	        node = this._root,
	        parent,
	        i;

	    while (x0 > x || x >= x1 || y0 > y || y >= y1) {
	      i = (y < y0) << 1 | (x < x0);
	      parent = new Array(4), parent[i] = node, node = parent, z *= 2;
	      switch (i) {
	        case 0: x1 = x0 + z, y1 = y0 + z; break;
	        case 1: x0 = x1 - z, y1 = y0 + z; break;
	        case 2: x1 = x0 + z, y0 = y1 - z; break;
	        case 3: x0 = x1 - z, y0 = y1 - z; break;
	      }
	    }

	    if (this._root && this._root.length) this._root = node;
	  }

	  this._x0 = x0;
	  this._y0 = y0;
	  this._x1 = x1;
	  this._y1 = y1;
	  return this;
	}

	function tree_data() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	}

	function tree_extent(_) {
	  return arguments.length
	      ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
	      : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
	}

	function Quad(node, x0, y0, x1, y1) {
	  this.node = node;
	  this.x0 = x0;
	  this.y0 = y0;
	  this.x1 = x1;
	  this.y1 = y1;
	}

	function tree_find(x, y, radius) {
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
	}

	function tree_remove(d) {
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
	}

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	function tree_root() {
	  return this._root;
	}

	function tree_size() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	}

	function tree_visit(callback) {
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
	}

	function tree_visitAfter(callback) {
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
	}

	function defaultX(d) {
	  return d[0];
	}

	function tree_x(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	}

	function defaultY(d) {
	  return d[1];
	}

	function tree_y(_) {
	  return arguments.length ? (this._y = _, this) : this._y;
	}

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

	// https://github.com/vasturiano/d3-octree v0.1.4 Copyright 2018 Vasco Asturiano
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	function tree_add(d) {
	  var x = +this._x.call(null, d),
	      y = +this._y.call(null, d),
	      z = +this._z.call(null, d);
	  return add(this.cover(x, y, z), x, y, z, d);
	}

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

	function tree_cover(x, y, z) {
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
	}

	function tree_data() {
	  var data = [];
	  this.visit(function(node) {
	    if (!node.length) do data.push(node.data); while (node = node.next)
	  });
	  return data;
	}

	function tree_extent(_) {
	  return arguments.length
	      ? this.cover(+_[0][0], +_[0][1], +_[0][2]).cover(+_[1][0], +_[1][1], +_[1][2])
	      : isNaN(this._x0) ? undefined : [[this._x0, this._y0, this._z0], [this._x1, this._y1, this._z1]];
	}

	function Octant(node, x0, y0, z0, x1, y1, z1) {
	  this.node = node;
	  this.x0 = x0;
	  this.y0 = y0;
	  this.z0 = z0;
	  this.x1 = x1;
	  this.y1 = y1;
	  this.z1 = z1;
	}

	function tree_find(x, y, z, radius) {
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
	}

	function tree_remove(d) {
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
	}

	function removeAll(data) {
	  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
	  return this;
	}

	function tree_root() {
	  return this._root;
	}

	function tree_size() {
	  var size = 0;
	  this.visit(function(node) {
	    if (!node.length) do ++size; while (node = node.next)
	  });
	  return size;
	}

	function tree_visit(callback) {
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
	}

	function tree_visitAfter(callback) {
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
	}

	function defaultX(d) {
	  return d[0];
	}

	function tree_x(_) {
	  return arguments.length ? (this._x = _, this) : this._x;
	}

	function defaultY(d) {
	  return d[1];
	}

	function tree_y(_) {
	  return arguments.length ? (this._y = _, this) : this._y;
	}

	function defaultZ(d) {
	  return d[2];
	}

	function tree_z(_) {
	  return arguments.length ? (this._z = _, this) : this._z;
	}

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

	// https://d3js.org/d3-dispatch/ v1.0.5 Copyright 2018 Mike Bostock
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
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-timer/ v1.0.9 Copyright 2018 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var frame = 0, // is an animation frame pending?
	    timeout = 0, // is a timeout pending?
	    interval = 0, // are any timers active?
	    pokeDelay = 1000, // how frequently we check for clock skew
	    taskHead,
	    taskTail,
	    clockLast = 0,
	    clockNow = 0,
	    clockSkew = 0,
	    clock = typeof performance === "object" && performance.now ? performance : Date,
	    setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

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

	function timeout$1(callback, delay, time) {
	  var t = new Timer;
	  delay = delay == null ? 0 : +delay;
	  t.restart(function(elapsed) {
	    t.stop();
	    callback(elapsed + delay);
	  }, delay, time);
	  return t;
	}

	function interval$1(callback, delay, time) {
	  var t = new Timer, total = delay;
	  if (delay == null) return t.restart(callback, delay, time), t;
	  delay = +delay, time = time == null ? now() : +time;
	  t.restart(function tick(elapsed) {
	    elapsed += total;
	    t.restart(tick, total += delay, time);
	    callback(elapsed);
	  }, delay, time);
	  return t;
	}

	exports.now = now;
	exports.timer = timer;
	exports.timerFlush = timerFlush;
	exports.timeout = timeout$1;
	exports.interval = interval$1;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 10 */
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

	var eventify = __webpack_require__(11);

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
	      'Note: there is also change in default behavior: From now on each graph\n'+
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
/* 11 */
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
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(13);

	var eventify = __webpack_require__(30);

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

	  var createSimulator = __webpack_require__(13);
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
	     * @returns {boolean} true if the system should be considered stable; False otherwise.
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
	      physicsSimulator.invalidateBBox();
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
	     * and first argument is treated as tail of the link (fromId)
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
	     * Gets amount of movement performed during last step operation
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
	   * which means layout algorithm cannot move it. Node can be marked
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
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(14);
	  var expose = __webpack_require__(15);
	  var merge = __webpack_require__(16);
	  var eventify = __webpack_require__(17);

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
	  var createDragForce = settings.createDragForce || __webpack_require__(25);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(26);
	  var integrate = settings.integrator || __webpack_require__(27);
	  var createBody = settings.createBody || __webpack_require__(28);

	  var bodies = [], // Bodies in this simulation.
	      springs = [], // Springs in this simulation.
	      quadTree =  createQuadTree(settings),
	      bounds = createBounds(bodies, settings),
	      springForce = createSpringForce(settings),
	      dragForce = createDragForce(settings);

	  var bboxNeedsUpdate = true;
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
	      if (bboxNeedsUpdate) {
	        bounds.update();
	        bboxNeedsUpdate = false;
	      }
	      return bounds.box;
	    },

	    invalidateBBox: function () {
	      bboxNeedsUpdate = true;
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
/* 14 */
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
/* 15 */
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
/* 16 */
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
/* 17 */
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

	module.exports = random;

	// TODO: Deprecate?
	module.exports.random = random,
	module.exports.randomIterator = randomIterator

	/**
	 * Creates seeded PRNG with two methods:
	 *   next() and nextDouble()
	 */
	function random(inputSeed) {
	  var seed = typeof inputSeed === 'number' ? inputSeed : (+new Date());
	  return new Generator(seed)
	}

	function Generator(seed) {
	  this.seed = seed;
	}

	/**
	  * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
	  *
	  * @param maxValue Number REQUIRED. Omitting this number will result in NaN values from PRNG.
	  */
	Generator.prototype.next = next;

	/**
	  * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
	  * This function is the same as Math.random() (except that it could be seeded)
	  */
	Generator.prototype.nextDouble = nextDouble;

	/**
	 * Returns a random real number uniformly in [0, 1)
	 */
	Generator.prototype.uniform = nextDouble;

	Generator.prototype.gaussian = gaussian;

	function gaussian() {
	  // use the polar form of the Box-Muller transform
	  // based on https://introcs.cs.princeton.edu/java/23recursion/StdRandom.java
	  var r, x, y;
	  do {
	    x = this.nextDouble() * 2 - 1;
	    y = this.nextDouble() * 2 - 1;
	    r = x * x + y * y;
	  } while (r >= 1 || r === 0);

	  return x * Math.sqrt(-2 * Math.log(r)/r);
	}

	function nextDouble() {
	  var seed = this.seed;
	  // Robert Jenkins' 32 bit integer hash function.
	  seed = ((seed + 0x7ed55d16) + (seed << 12)) & 0xffffffff;
	  seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
	  seed = ((seed + 0x165667b1) + (seed << 5)) & 0xffffffff;
	  seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff;
	  seed = ((seed + 0xfd7046c5) + (seed << 3)) & 0xffffffff;
	  seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
	  this.seed = seed;
	  return (seed & 0xfffffff) / 0x10000000;
	}

	function next(maxValue) {
	  return Math.floor(this.nextDouble() * maxValue);
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
	    forEach: forEach,

	    /**
	     * Shuffles array randomly, in place.
	     */
	    shuffle: shuffle
	  };

	  function shuffle() {
	    var i, j, t;
	    for (i = array.length - 1; i > 0; --i) {
	      j = localRandom.next(i + 1); // i inclusive
	      t = array[j];
	      array[j] = array[i];
	      array[i] = t;
	    }

	    return array;
	  }

	  function forEach(callback) {
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
	  }
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
	  var random = __webpack_require__(24).random(42);
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
/***/ (function(module, exports) {

	module.exports = random;

	// TODO: Deprecate?
	module.exports.random = random,
	module.exports.randomIterator = randomIterator

	/**
	 * Creates seeded PRNG with two methods:
	 *   next() and nextDouble()
	 */
	function random(inputSeed) {
	  var seed = typeof inputSeed === 'number' ? inputSeed : (+new Date());
	  return new Generator(seed)
	}

	function Generator(seed) {
	  this.seed = seed;
	}

	/**
	  * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
	  *
	  * @param maxValue Number REQUIRED. Omitting this number will result in NaN values from PRNG.
	  */
	Generator.prototype.next = next;

	/**
	  * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
	  * This function is the same as Math.random() (except that it could be seeded)
	  */
	Generator.prototype.nextDouble = nextDouble;

	/**
	 * Returns a random real number uniformly in [0, 1)
	 */
	Generator.prototype.uniform = nextDouble;

	Generator.prototype.gaussian = gaussian;

	function gaussian() {
	  // use the polar form of the Box-Muller transform
	  // based on https://introcs.cs.princeton.edu/java/23recursion/StdRandom.java
	  var r, x, y;
	  do {
	    x = this.nextDouble() * 2 - 1;
	    y = this.nextDouble() * 2 - 1;
	    r = x * x + y * y;
	  } while (r >= 1 || r === 0);

	  return x * Math.sqrt(-2 * Math.log(r)/r);
	}

	function nextDouble() {
	  var seed = this.seed;
	  // Robert Jenkins' 32 bit integer hash function.
	  seed = ((seed + 0x7ed55d16) + (seed << 12)) & 0xffffffff;
	  seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
	  seed = ((seed + 0x165667b1) + (seed << 5)) & 0xffffffff;
	  seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff;
	  seed = ((seed + 0xfd7046c5) + (seed << 3)) & 0xffffffff;
	  seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
	  this.seed = seed;
	  return (seed & 0xfffffff) / 0x10000000;
	}

	function next(maxValue) {
	  return Math.floor(this.nextDouble() * maxValue);
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
	    forEach: forEach,

	    /**
	     * Shuffles array randomly, in place.
	     */
	    shuffle: shuffle
	  };

	  function shuffle() {
	    var i, j, t;
	    for (i = array.length - 1; i > 0; --i) {
	      j = localRandom.next(i + 1); // i inclusive
	      t = array[j];
	      array[j] = array[i];
	      array[i] = t;
	    }

	    return array;
	  }

	  function forEach(callback) {
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
	  }
	}

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(16),
	      expose = __webpack_require__(15);

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
/* 26 */
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
	  var merge = __webpack_require__(16);
	  var random = __webpack_require__(24).random(42);
	  var expose = __webpack_require__(15);

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
/* 27 */
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
	      // We normalize it so that we move within timeStep range. 
	      // for the case when v <= 1 - we let velocity to fade out.
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
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(29);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 29 */
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
/* 30 */
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
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This module provides all required forces to regular ngraph.physics.simulator
	 * to make it 3D simulator. Ideally ngraph.physics.simulator should operate
	 * with vectors, but on practices that showed performance decrease... Maybe
	 * I was doing it wrong, will see if I can refactor/throw away this module.
	 */
	module.exports = createLayout;
	createLayout.get2dLayout = __webpack_require__(32);

	function createLayout(graph, physicsSettings) {
	  var merge = __webpack_require__(36);
	  physicsSettings = merge(physicsSettings, {
	        createQuadTree: __webpack_require__(48),
	        createBounds: __webpack_require__(52),
	        createDragForce: __webpack_require__(53),
	        createSpringForce: __webpack_require__(54),
	        integrator: getIntegrator(physicsSettings),
	        createBody: __webpack_require__(55)
	      });

	  return createLayout.get2dLayout(graph, physicsSettings);
	}

	function getIntegrator(physicsSettings) {
	  if (physicsSettings && physicsSettings.integrator === 'verlet') {
	    return __webpack_require__(56);
	  }

	  return __webpack_require__(57)
	}


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(33);

	var eventify = __webpack_require__(11);

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

	  var createSimulator = __webpack_require__(33);
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
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(34);
	  var expose = __webpack_require__(35);
	  var merge = __webpack_require__(36);
	  var eventify = __webpack_require__(11);

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
	  var createQuadTree = settings.createQuadTree || __webpack_require__(37);
	  var createBounds = settings.createBounds || __webpack_require__(42);
	  var createDragForce = settings.createDragForce || __webpack_require__(43);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(44);
	  var integrate = settings.integrator || __webpack_require__(45);
	  var createBody = settings.createBody || __webpack_require__(46);

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
/* 34 */
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
/* 35 */
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
/* 36 */
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
/* 37 */
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
	  var random = __webpack_require__(38).random(1984),
	    Node = __webpack_require__(39),
	    InsertStack = __webpack_require__(40),
	    isSamePosition = __webpack_require__(41);

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
/* 38 */
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
/* 39 */
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
/* 40 */
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
/* 41 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);

	    return (dx < 1e-8 && dy < 1e-8);
	};


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(38).random(42);
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
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(36),
	      expose = __webpack_require__(35);

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
/* 44 */
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
	  var merge = __webpack_require__(36);
	  var random = __webpack_require__(38).random(42);
	  var expose = __webpack_require__(35);

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
/* 45 */
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
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(47);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 47 */
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
/* 48 */
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
	  var random = __webpack_require__(38).random(1984),
	    Node = __webpack_require__(49),
	    InsertStack = __webpack_require__(50),
	    isSamePosition = __webpack_require__(51);

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
/* 49 */
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
/* 50 */
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
/* 51 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);
	    var dz = Math.abs(point1.z - point2.z);

	    return (dx < 1e-8 && dy < 1e-8 && dz < 1e-8);
	};


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(38).random(42);
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
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents 3d drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(36),
	      expose = __webpack_require__(35);

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
/* 54 */
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
	  var merge = __webpack_require__(36);
	  var random = __webpack_require__(38).random(42);
	  var expose = __webpack_require__(35);

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
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(47);

	module.exports = function(pos) {
	  return new physics.Body3d(pos);
	}


/***/ }),
/* 56 */
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
/* 57 */
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
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var debounce = _interopDefault(__webpack_require__(59));

	function _classCallCheck(instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	}

	function _slicedToArray(arr, i) {
	  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
	}

	function _arrayWithHoles(arr) {
	  if (Array.isArray(arr)) return arr;
	}

	function _iterableToArrayLimit(arr, i) {
	  var _arr = [];
	  var _n = true;
	  var _d = false;
	  var _e = undefined;

	  try {
	    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	      _arr.push(_s.value);

	      if (i && _arr.length === i) break;
	    }
	  } catch (err) {
	    _d = true;
	    _e = err;
	  } finally {
	    try {
	      if (!_n && _i["return"] != null) _i["return"]();
	    } finally {
	      if (_d) throw _e;
	    }
	  }

	  return _arr;
	}

	function _nonIterableRest() {
	  throw new TypeError("Invalid attempt to destructure non-iterable instance");
	}

	var Prop = function Prop(name, _ref) {
	  var _ref$default = _ref["default"],
	      defaultVal = _ref$default === void 0 ? null : _ref$default,
	      _ref$triggerUpdate = _ref.triggerUpdate,
	      triggerUpdate = _ref$triggerUpdate === void 0 ? true : _ref$triggerUpdate,
	      _ref$onChange = _ref.onChange,
	      onChange = _ref$onChange === void 0 ? function (newVal, state) {} : _ref$onChange;

	  _classCallCheck(this, Prop);

	  this.name = name;
	  this.defaultVal = defaultVal;
	  this.triggerUpdate = triggerUpdate;
	  this.onChange = onChange;
	};

	function index (_ref2) {
	  var _ref2$stateInit = _ref2.stateInit,
	      stateInit = _ref2$stateInit === void 0 ? function () {
	    return {};
	  } : _ref2$stateInit,
	      _ref2$props = _ref2.props,
	      rawProps = _ref2$props === void 0 ? {} : _ref2$props,
	      _ref2$methods = _ref2.methods,
	      methods = _ref2$methods === void 0 ? {} : _ref2$methods,
	      _ref2$aliases = _ref2.aliases,
	      aliases = _ref2$aliases === void 0 ? {} : _ref2$aliases,
	      _ref2$init = _ref2.init,
	      initFn = _ref2$init === void 0 ? function () {} : _ref2$init,
	      _ref2$update = _ref2.update,
	      updateFn = _ref2$update === void 0 ? function () {} : _ref2$update;
	  // Parse props into Prop instances
	  var props = Object.keys(rawProps).map(function (propName) {
	    return new Prop(propName, rawProps[propName]);
	  });
	  return function () {
	    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	    // Holds component state
	    var state = Object.assign({}, stateInit instanceof Function ? stateInit(options) : stateInit, // Support plain objects for backwards compatibility
	    {
	      initialised: false
	    }); // Component constructor

	    function comp(nodeElement) {
	      initStatic(nodeElement, options);
	      digest();
	      return comp;
	    }

	    var initStatic = function initStatic(nodeElement, options) {
	      initFn.call(comp, nodeElement, state, options);
	      state.initialised = true;
	    };

	    var digest = debounce(function () {
	      if (!state.initialised) {
	        return;
	      }

	      updateFn.call(comp, state);
	    }, 1); // Getter/setter methods

	    props.forEach(function (prop) {
	      comp[prop.name] = getSetProp(prop.name, prop.triggerUpdate, prop.onChange);

	      function getSetProp(prop) {
	        var redigest = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
	        var onChange = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (newVal, state) {};
	        return function (_) {
	          var curVal = state[prop];

	          if (!arguments.length) {
	            return curVal;
	          } // Getter mode


	          state[prop] = _;
	          onChange.call(comp, _, state, curVal);

	          if (redigest) {
	            digest();
	          }

	          return comp;
	        };
	      }
	    }); // Other methods

	    Object.keys(methods).forEach(function (methodName) {
	      comp[methodName] = function () {
	        var _methods$methodName;

	        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	          args[_key] = arguments[_key];
	        }

	        return (_methods$methodName = methods[methodName]).call.apply(_methods$methodName, [comp, state].concat(args));
	      };
	    }); // Link aliases

	    Object.entries(aliases).forEach(function (_ref3) {
	      var _ref4 = _slicedToArray(_ref3, 2),
	          alias = _ref4[0],
	          target = _ref4[1];

	      return comp[alias] = comp[target];
	    }); // Reset all component props to their default value

	    comp.resetProps = function () {
	      props.forEach(function (prop) {
	        comp[prop.name](prop.defaultVal);
	      });
	      return comp;
	    }; //


	    comp.resetProps(); // Apply all prop defaults

	    state._rerender = digest; // Expose digest method

	    return comp;
	  };
	}

	module.exports = index;


/***/ }),
/* 59 */
/***/ (function(module, exports) {

	/**
	 * Returns a function, that, as long as it continues to be invoked, will not
	 * be triggered. The function will be called after it stops being called for
	 * N milliseconds. If `immediate` is passed, trigger the function on the
	 * leading edge, instead of the trailing. The function also has a property 'clear' 
	 * that is a function which will clear the timer to prevent previously scheduled executions. 
	 *
	 * @source underscore.js
	 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
	 * @param {Function} function to wrap
	 * @param {Number} timeout in ms (`100`)
	 * @param {Boolean} whether to execute at the beginning (`false`)
	 * @api public
	 */
	function debounce(func, wait, immediate){
	  var timeout, args, context, timestamp, result;
	  if (null == wait) wait = 100;

	  function later() {
	    var last = Date.now() - timestamp;

	    if (last < wait && last >= 0) {
	      timeout = setTimeout(later, wait - last);
	    } else {
	      timeout = null;
	      if (!immediate) {
	        result = func.apply(context, args);
	        context = args = null;
	      }
	    }
	  };

	  var debounced = function(){
	    context = this;
	    args = arguments;
	    timestamp = Date.now();
	    var callNow = immediate && !timeout;
	    if (!timeout) timeout = setTimeout(later, wait);
	    if (callNow) {
	      result = func.apply(context, args);
	      context = args = null;
	    }

	    return result;
	  };

	  debounced.clear = function() {
	    if (timeout) {
	      clearTimeout(timeout);
	      timeout = null;
	    }
	  };
	  
	  debounced.flush = function() {
	    if (timeout) {
	      result = func.apply(context, args);
	      context = args = null;
	      
	      clearTimeout(timeout);
	      timeout = null;
	    }
	  };

	  return debounced;
	};

	// Adds compatibility for ES modules
	debounce.debounce = debounce;

	module.exports = debounce;


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-scale/ v3.0.0 Copyright 2019 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports, __webpack_require__(61), __webpack_require__(62), __webpack_require__(64), __webpack_require__(65), __webpack_require__(66)) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-array', 'd3-interpolate', 'd3-format', 'd3-time', 'd3-time-format'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3,global.d3,global.d3));
	}(this, (function (exports,d3Array,d3Interpolate,d3Format,d3Time,d3TimeFormat) { 'use strict';

	function initRange(domain, range) {
	  switch (arguments.length) {
	    case 0: break;
	    case 1: this.range(domain); break;
	    default: this.range(range).domain(domain); break;
	  }
	  return this;
	}

	function initInterpolator(domain, interpolator) {
	  switch (arguments.length) {
	    case 0: break;
	    case 1: this.interpolator(domain); break;
	    default: this.interpolator(interpolator).domain(domain); break;
	  }
	  return this;
	}

	const implicit = Symbol("implicit");

	function ordinal() {
	  var index = new Map(),
	      domain = [],
	      range = [],
	      unknown = implicit;

	  function scale(d) {
	    var key = d + "", i = index.get(key);
	    if (!i) {
	      if (unknown !== implicit) return unknown;
	      index.set(key, i = domain.push(d));
	    }
	    return range[(i - 1) % range.length];
	  }

	  scale.domain = function(_) {
	    if (!arguments.length) return domain.slice();
	    domain = [], index = new Map();
	    for (const value of _) {
	      const key = value + "";
	      if (index.has(key)) continue;
	      index.set(key, domain.push(value));
	    }
	    return scale;
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = Array.from(_), scale) : range.slice();
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  scale.copy = function() {
	    return ordinal(domain, range).unknown(unknown);
	  };

	  initRange.apply(scale, arguments);

	  return scale;
	}

	function band() {
	  var scale = ordinal().unknown(undefined),
	      domain = scale.domain,
	      ordinalRange = scale.range,
	      r0 = 0,
	      r1 = 1,
	      step,
	      bandwidth,
	      round = false,
	      paddingInner = 0,
	      paddingOuter = 0,
	      align = 0.5;

	  delete scale.unknown;

	  function rescale() {
	    var n = domain().length,
	        reverse = r1 < r0,
	        start = reverse ? r1 : r0,
	        stop = reverse ? r0 : r1;
	    step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
	    if (round) step = Math.floor(step);
	    start += (stop - start - step * (n - paddingInner)) * align;
	    bandwidth = step * (1 - paddingInner);
	    if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
	    var values = d3Array.range(n).map(function(i) { return start + step * i; });
	    return ordinalRange(reverse ? values.reverse() : values);
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (domain(_), rescale()) : domain();
	  };

	  scale.range = function(_) {
	    return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
	  };

	  scale.rangeRound = function(_) {
	    return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
	  };

	  scale.bandwidth = function() {
	    return bandwidth;
	  };

	  scale.step = function() {
	    return step;
	  };

	  scale.round = function(_) {
	    return arguments.length ? (round = !!_, rescale()) : round;
	  };

	  scale.padding = function(_) {
	    return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
	  };

	  scale.paddingInner = function(_) {
	    return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
	  };

	  scale.paddingOuter = function(_) {
	    return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
	  };

	  scale.align = function(_) {
	    return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
	  };

	  scale.copy = function() {
	    return band(domain(), [r0, r1])
	        .round(round)
	        .paddingInner(paddingInner)
	        .paddingOuter(paddingOuter)
	        .align(align);
	  };

	  return initRange.apply(rescale(), arguments);
	}

	function pointish(scale) {
	  var copy = scale.copy;

	  scale.padding = scale.paddingOuter;
	  delete scale.paddingInner;
	  delete scale.paddingOuter;

	  scale.copy = function() {
	    return pointish(copy());
	  };

	  return scale;
	}

	function point() {
	  return pointish(band.apply(null, arguments).paddingInner(1));
	}

	function constant(x) {
	  return function() {
	    return x;
	  };
	}

	function number(x) {
	  return +x;
	}

	var unit = [0, 1];

	function identity(x) {
	  return x;
	}

	function normalize(a, b) {
	  return (b -= (a = +a))
	      ? function(x) { return (x - a) / b; }
	      : constant(isNaN(b) ? NaN : 0.5);
	}

	function clamper(domain) {
	  var a = domain[0], b = domain[domain.length - 1], t;
	  if (a > b) t = a, a = b, b = t;
	  return function(x) { return Math.max(a, Math.min(b, x)); };
	}

	// normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
	// interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
	function bimap(domain, range, interpolate) {
	  var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
	  if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
	  else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
	  return function(x) { return r0(d0(x)); };
	}

	function polymap(domain, range, interpolate) {
	  var j = Math.min(domain.length, range.length) - 1,
	      d = new Array(j),
	      r = new Array(j),
	      i = -1;

	  // Reverse descending domains.
	  if (domain[j] < domain[0]) {
	    domain = domain.slice().reverse();
	    range = range.slice().reverse();
	  }

	  while (++i < j) {
	    d[i] = normalize(domain[i], domain[i + 1]);
	    r[i] = interpolate(range[i], range[i + 1]);
	  }

	  return function(x) {
	    var i = d3Array.bisect(domain, x, 1, j) - 1;
	    return r[i](d[i](x));
	  };
	}

	function copy(source, target) {
	  return target
	      .domain(source.domain())
	      .range(source.range())
	      .interpolate(source.interpolate())
	      .clamp(source.clamp())
	      .unknown(source.unknown());
	}

	function transformer() {
	  var domain = unit,
	      range = unit,
	      interpolate = d3Interpolate.interpolate,
	      transform,
	      untransform,
	      unknown,
	      clamp = identity,
	      piecewise,
	      output,
	      input;

	  function rescale() {
	    piecewise = Math.min(domain.length, range.length) > 2 ? polymap : bimap;
	    output = input = null;
	    return scale;
	  }

	  function scale(x) {
	    return isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
	  }

	  scale.invert = function(y) {
	    return clamp(untransform((input || (input = piecewise(range, domain.map(transform), d3Interpolate.interpolateNumber)))(y)));
	  };

	  scale.domain = function(_) {
	    return arguments.length ? (domain = Array.from(_, number), clamp === identity || (clamp = clamper(domain)), rescale()) : domain.slice();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
	  };

	  scale.rangeRound = function(_) {
	    return range = Array.from(_), interpolate = d3Interpolate.interpolateRound, rescale();
	  };

	  scale.clamp = function(_) {
	    return arguments.length ? (clamp = _ ? clamper(domain) : identity, scale) : clamp !== identity;
	  };

	  scale.interpolate = function(_) {
	    return arguments.length ? (interpolate = _, rescale()) : interpolate;
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  return function(t, u) {
	    transform = t, untransform = u;
	    return rescale();
	  };
	}

	function continuous(transform, untransform) {
	  return transformer()(transform, untransform);
	}

	function tickFormat(start, stop, count, specifier) {
	  var step = d3Array.tickStep(start, stop, count),
	      precision;
	  specifier = d3Format.formatSpecifier(specifier == null ? ",f" : specifier);
	  switch (specifier.type) {
	    case "s": {
	      var value = Math.max(Math.abs(start), Math.abs(stop));
	      if (specifier.precision == null && !isNaN(precision = d3Format.precisionPrefix(step, value))) specifier.precision = precision;
	      return d3Format.formatPrefix(specifier, value);
	    }
	    case "":
	    case "e":
	    case "g":
	    case "p":
	    case "r": {
	      if (specifier.precision == null && !isNaN(precision = d3Format.precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
	      break;
	    }
	    case "f":
	    case "%": {
	      if (specifier.precision == null && !isNaN(precision = d3Format.precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
	      break;
	    }
	  }
	  return d3Format.format(specifier);
	}

	function linearish(scale) {
	  var domain = scale.domain;

	  scale.ticks = function(count) {
	    var d = domain();
	    return d3Array.ticks(d[0], d[d.length - 1], count == null ? 10 : count);
	  };

	  scale.tickFormat = function(count, specifier) {
	    var d = domain();
	    return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
	  };

	  scale.nice = function(count) {
	    if (count == null) count = 10;

	    var d = domain(),
	        i0 = 0,
	        i1 = d.length - 1,
	        start = d[i0],
	        stop = d[i1],
	        step;

	    if (stop < start) {
	      step = start, start = stop, stop = step;
	      step = i0, i0 = i1, i1 = step;
	    }

	    step = d3Array.tickIncrement(start, stop, count);

	    if (step > 0) {
	      start = Math.floor(start / step) * step;
	      stop = Math.ceil(stop / step) * step;
	      step = d3Array.tickIncrement(start, stop, count);
	    } else if (step < 0) {
	      start = Math.ceil(start * step) / step;
	      stop = Math.floor(stop * step) / step;
	      step = d3Array.tickIncrement(start, stop, count);
	    }

	    if (step > 0) {
	      d[i0] = Math.floor(start / step) * step;
	      d[i1] = Math.ceil(stop / step) * step;
	      domain(d);
	    } else if (step < 0) {
	      d[i0] = Math.ceil(start * step) / step;
	      d[i1] = Math.floor(stop * step) / step;
	      domain(d);
	    }

	    return scale;
	  };

	  return scale;
	}

	function linear() {
	  var scale = continuous(identity, identity);

	  scale.copy = function() {
	    return copy(scale, linear());
	  };

	  initRange.apply(scale, arguments);

	  return linearish(scale);
	}

	function identity$1(domain) {
	  var unknown;

	  function scale(x) {
	    return isNaN(x = +x) ? unknown : x;
	  }

	  scale.invert = scale;

	  scale.domain = scale.range = function(_) {
	    return arguments.length ? (domain = Array.from(_, number), scale) : domain.slice();
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  scale.copy = function() {
	    return identity$1(domain).unknown(unknown);
	  };

	  domain = arguments.length ? Array.from(domain, number) : [0, 1];

	  return linearish(scale);
	}

	function nice(domain, interval) {
	  domain = domain.slice();

	  var i0 = 0,
	      i1 = domain.length - 1,
	      x0 = domain[i0],
	      x1 = domain[i1],
	      t;

	  if (x1 < x0) {
	    t = i0, i0 = i1, i1 = t;
	    t = x0, x0 = x1, x1 = t;
	  }

	  domain[i0] = interval.floor(x0);
	  domain[i1] = interval.ceil(x1);
	  return domain;
	}

	function transformLog(x) {
	  return Math.log(x);
	}

	function transformExp(x) {
	  return Math.exp(x);
	}

	function transformLogn(x) {
	  return -Math.log(-x);
	}

	function transformExpn(x) {
	  return -Math.exp(-x);
	}

	function pow10(x) {
	  return isFinite(x) ? +("1e" + x) : x < 0 ? 0 : x;
	}

	function powp(base) {
	  return base === 10 ? pow10
	      : base === Math.E ? Math.exp
	      : function(x) { return Math.pow(base, x); };
	}

	function logp(base) {
	  return base === Math.E ? Math.log
	      : base === 10 && Math.log10
	      || base === 2 && Math.log2
	      || (base = Math.log(base), function(x) { return Math.log(x) / base; });
	}

	function reflect(f) {
	  return function(x) {
	    return -f(-x);
	  };
	}

	function loggish(transform) {
	  var scale = transform(transformLog, transformExp),
	      domain = scale.domain,
	      base = 10,
	      logs,
	      pows;

	  function rescale() {
	    logs = logp(base), pows = powp(base);
	    if (domain()[0] < 0) {
	      logs = reflect(logs), pows = reflect(pows);
	      transform(transformLogn, transformExpn);
	    } else {
	      transform(transformLog, transformExp);
	    }
	    return scale;
	  }

	  scale.base = function(_) {
	    return arguments.length ? (base = +_, rescale()) : base;
	  };

	  scale.domain = function(_) {
	    return arguments.length ? (domain(_), rescale()) : domain();
	  };

	  scale.ticks = function(count) {
	    var d = domain(),
	        u = d[0],
	        v = d[d.length - 1],
	        r;

	    if (r = v < u) i = u, u = v, v = i;

	    var i = logs(u),
	        j = logs(v),
	        p,
	        k,
	        t,
	        n = count == null ? 10 : +count,
	        z = [];

	    if (!(base % 1) && j - i < n) {
	      i = Math.round(i) - 1, j = Math.round(j) + 1;
	      if (u > 0) for (; i < j; ++i) {
	        for (k = 1, p = pows(i); k < base; ++k) {
	          t = p * k;
	          if (t < u) continue;
	          if (t > v) break;
	          z.push(t);
	        }
	      } else for (; i < j; ++i) {
	        for (k = base - 1, p = pows(i); k >= 1; --k) {
	          t = p * k;
	          if (t < u) continue;
	          if (t > v) break;
	          z.push(t);
	        }
	      }
	    } else {
	      z = d3Array.ticks(i, j, Math.min(j - i, n)).map(pows);
	    }

	    return r ? z.reverse() : z;
	  };

	  scale.tickFormat = function(count, specifier) {
	    if (specifier == null) specifier = base === 10 ? ".0e" : ",";
	    if (typeof specifier !== "function") specifier = d3Format.format(specifier);
	    if (count === Infinity) return specifier;
	    if (count == null) count = 10;
	    var k = Math.max(1, base * count / scale.ticks().length); // TODO fast estimate?
	    return function(d) {
	      var i = d / pows(Math.round(logs(d)));
	      if (i * base < base - 0.5) i *= base;
	      return i <= k ? specifier(d) : "";
	    };
	  };

	  scale.nice = function() {
	    return domain(nice(domain(), {
	      floor: function(x) { return pows(Math.floor(logs(x))); },
	      ceil: function(x) { return pows(Math.ceil(logs(x))); }
	    }));
	  };

	  return scale;
	}

	function log() {
	  var scale = loggish(transformer()).domain([1, 10]);

	  scale.copy = function() {
	    return copy(scale, log()).base(scale.base());
	  };

	  initRange.apply(scale, arguments);

	  return scale;
	}

	function transformSymlog(c) {
	  return function(x) {
	    return Math.sign(x) * Math.log1p(Math.abs(x / c));
	  };
	}

	function transformSymexp(c) {
	  return function(x) {
	    return Math.sign(x) * Math.expm1(Math.abs(x)) * c;
	  };
	}

	function symlogish(transform) {
	  var c = 1, scale = transform(transformSymlog(c), transformSymexp(c));

	  scale.constant = function(_) {
	    return arguments.length ? transform(transformSymlog(c = +_), transformSymexp(c)) : c;
	  };

	  return linearish(scale);
	}

	function symlog() {
	  var scale = symlogish(transformer());

	  scale.copy = function() {
	    return copy(scale, symlog()).constant(scale.constant());
	  };

	  return initRange.apply(scale, arguments);
	}

	function transformPow(exponent) {
	  return function(x) {
	    return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
	  };
	}

	function transformSqrt(x) {
	  return x < 0 ? -Math.sqrt(-x) : Math.sqrt(x);
	}

	function transformSquare(x) {
	  return x < 0 ? -x * x : x * x;
	}

	function powish(transform) {
	  var scale = transform(identity, identity),
	      exponent = 1;

	  function rescale() {
	    return exponent === 1 ? transform(identity, identity)
	        : exponent === 0.5 ? transform(transformSqrt, transformSquare)
	        : transform(transformPow(exponent), transformPow(1 / exponent));
	  }

	  scale.exponent = function(_) {
	    return arguments.length ? (exponent = +_, rescale()) : exponent;
	  };

	  return linearish(scale);
	}

	function pow() {
	  var scale = powish(transformer());

	  scale.copy = function() {
	    return copy(scale, pow()).exponent(scale.exponent());
	  };

	  initRange.apply(scale, arguments);

	  return scale;
	}

	function sqrt() {
	  return pow.apply(null, arguments).exponent(0.5);
	}

	function quantile() {
	  var domain = [],
	      range = [],
	      thresholds = [],
	      unknown;

	  function rescale() {
	    var i = 0, n = Math.max(1, range.length);
	    thresholds = new Array(n - 1);
	    while (++i < n) thresholds[i - 1] = d3Array.quantile(domain, i / n);
	    return scale;
	  }

	  function scale(x) {
	    return isNaN(x = +x) ? unknown : range[d3Array.bisect(thresholds, x)];
	  }

	  scale.invertExtent = function(y) {
	    var i = range.indexOf(y);
	    return i < 0 ? [NaN, NaN] : [
	      i > 0 ? thresholds[i - 1] : domain[0],
	      i < thresholds.length ? thresholds[i] : domain[domain.length - 1]
	    ];
	  };

	  scale.domain = function(_) {
	    if (!arguments.length) return domain.slice();
	    domain = [];
	    for (let d of _) if (d != null && !isNaN(d = +d)) domain.push(d);
	    domain.sort(d3Array.ascending);
	    return rescale();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  scale.quantiles = function() {
	    return thresholds.slice();
	  };

	  scale.copy = function() {
	    return quantile()
	        .domain(domain)
	        .range(range)
	        .unknown(unknown);
	  };

	  return initRange.apply(scale, arguments);
	}

	function quantize() {
	  var x0 = 0,
	      x1 = 1,
	      n = 1,
	      domain = [0.5],
	      range = [0, 1],
	      unknown;

	  function scale(x) {
	    return x <= x ? range[d3Array.bisect(domain, x, 0, n)] : unknown;
	  }

	  function rescale() {
	    var i = -1;
	    domain = new Array(n);
	    while (++i < n) domain[i] = ((i + 1) * x1 - (i - n) * x0) / (n + 1);
	    return scale;
	  }

	  scale.domain = function(_) {
	    return arguments.length ? ([x0, x1] = _, x0 = +x0, x1 = +x1, rescale()) : [x0, x1];
	  };

	  scale.range = function(_) {
	    return arguments.length ? (n = (range = Array.from(_)).length - 1, rescale()) : range.slice();
	  };

	  scale.invertExtent = function(y) {
	    var i = range.indexOf(y);
	    return i < 0 ? [NaN, NaN]
	        : i < 1 ? [x0, domain[0]]
	        : i >= n ? [domain[n - 1], x1]
	        : [domain[i - 1], domain[i]];
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : scale;
	  };

	  scale.thresholds = function() {
	    return domain.slice();
	  };

	  scale.copy = function() {
	    return quantize()
	        .domain([x0, x1])
	        .range(range)
	        .unknown(unknown);
	  };

	  return initRange.apply(linearish(scale), arguments);
	}

	function threshold() {
	  var domain = [0.5],
	      range = [0, 1],
	      unknown,
	      n = 1;

	  function scale(x) {
	    return x <= x ? range[d3Array.bisect(domain, x, 0, n)] : unknown;
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (domain = Array.from(_), n = Math.min(domain.length, range.length - 1), scale) : domain.slice();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = Array.from(_), n = Math.min(domain.length, range.length - 1), scale) : range.slice();
	  };

	  scale.invertExtent = function(y) {
	    var i = range.indexOf(y);
	    return [domain[i - 1], domain[i]];
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  scale.copy = function() {
	    return threshold()
	        .domain(domain)
	        .range(range)
	        .unknown(unknown);
	  };

	  return initRange.apply(scale, arguments);
	}

	var durationSecond = 1000,
	    durationMinute = durationSecond * 60,
	    durationHour = durationMinute * 60,
	    durationDay = durationHour * 24,
	    durationWeek = durationDay * 7,
	    durationMonth = durationDay * 30,
	    durationYear = durationDay * 365;

	function date(t) {
	  return new Date(t);
	}

	function number$1(t) {
	  return t instanceof Date ? +t : +new Date(+t);
	}

	function calendar(year, month, week, day, hour, minute, second, millisecond, format) {
	  var scale = continuous(identity, identity),
	      invert = scale.invert,
	      domain = scale.domain;

	  var formatMillisecond = format(".%L"),
	      formatSecond = format(":%S"),
	      formatMinute = format("%I:%M"),
	      formatHour = format("%I %p"),
	      formatDay = format("%a %d"),
	      formatWeek = format("%b %d"),
	      formatMonth = format("%B"),
	      formatYear = format("%Y");

	  var tickIntervals = [
	    [second,  1,      durationSecond],
	    [second,  5,  5 * durationSecond],
	    [second, 15, 15 * durationSecond],
	    [second, 30, 30 * durationSecond],
	    [minute,  1,      durationMinute],
	    [minute,  5,  5 * durationMinute],
	    [minute, 15, 15 * durationMinute],
	    [minute, 30, 30 * durationMinute],
	    [  hour,  1,      durationHour  ],
	    [  hour,  3,  3 * durationHour  ],
	    [  hour,  6,  6 * durationHour  ],
	    [  hour, 12, 12 * durationHour  ],
	    [   day,  1,      durationDay   ],
	    [   day,  2,  2 * durationDay   ],
	    [  week,  1,      durationWeek  ],
	    [ month,  1,      durationMonth ],
	    [ month,  3,  3 * durationMonth ],
	    [  year,  1,      durationYear  ]
	  ];

	  function tickFormat(date) {
	    return (second(date) < date ? formatMillisecond
	        : minute(date) < date ? formatSecond
	        : hour(date) < date ? formatMinute
	        : day(date) < date ? formatHour
	        : month(date) < date ? (week(date) < date ? formatDay : formatWeek)
	        : year(date) < date ? formatMonth
	        : formatYear)(date);
	  }

	  function tickInterval(interval, start, stop, step) {
	    if (interval == null) interval = 10;

	    // If a desired tick count is specified, pick a reasonable tick interval
	    // based on the extent of the domain and a rough estimate of tick size.
	    // Otherwise, assume interval is already a time interval and use it.
	    if (typeof interval === "number") {
	      var target = Math.abs(stop - start) / interval,
	          i = d3Array.bisector(function(i) { return i[2]; }).right(tickIntervals, target);
	      if (i === tickIntervals.length) {
	        step = d3Array.tickStep(start / durationYear, stop / durationYear, interval);
	        interval = year;
	      } else if (i) {
	        i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
	        step = i[1];
	        interval = i[0];
	      } else {
	        step = Math.max(d3Array.tickStep(start, stop, interval), 1);
	        interval = millisecond;
	      }
	    }

	    return step == null ? interval : interval.every(step);
	  }

	  scale.invert = function(y) {
	    return new Date(invert(y));
	  };

	  scale.domain = function(_) {
	    return arguments.length ? domain(Array.from(_, number$1)) : domain().map(date);
	  };

	  scale.ticks = function(interval, step) {
	    var d = domain(),
	        t0 = d[0],
	        t1 = d[d.length - 1],
	        r = t1 < t0,
	        t;
	    if (r) t = t0, t0 = t1, t1 = t;
	    t = tickInterval(interval, t0, t1, step);
	    t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
	    return r ? t.reverse() : t;
	  };

	  scale.tickFormat = function(count, specifier) {
	    return specifier == null ? tickFormat : format(specifier);
	  };

	  scale.nice = function(interval, step) {
	    var d = domain();
	    return (interval = tickInterval(interval, d[0], d[d.length - 1], step))
	        ? domain(nice(d, interval))
	        : scale;
	  };

	  scale.copy = function() {
	    return copy(scale, calendar(year, month, week, day, hour, minute, second, millisecond, format));
	  };

	  return scale;
	}

	function time() {
	  return initRange.apply(calendar(d3Time.timeYear, d3Time.timeMonth, d3Time.timeWeek, d3Time.timeDay, d3Time.timeHour, d3Time.timeMinute, d3Time.timeSecond, d3Time.timeMillisecond, d3TimeFormat.timeFormat).domain([new Date(2000, 0, 1), new Date(2000, 0, 2)]), arguments);
	}

	function utcTime() {
	  return initRange.apply(calendar(d3Time.utcYear, d3Time.utcMonth, d3Time.utcWeek, d3Time.utcDay, d3Time.utcHour, d3Time.utcMinute, d3Time.utcSecond, d3Time.utcMillisecond, d3TimeFormat.utcFormat).domain([Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2)]), arguments);
	}

	function transformer$1() {
	  var x0 = 0,
	      x1 = 1,
	      t0,
	      t1,
	      k10,
	      transform,
	      interpolator = identity,
	      clamp = false,
	      unknown;

	  function scale(x) {
	    return isNaN(x = +x) ? unknown : interpolator(k10 === 0 ? 0.5 : (x = (transform(x) - t0) * k10, clamp ? Math.max(0, Math.min(1, x)) : x));
	  }

	  scale.domain = function(_) {
	    return arguments.length ? ([x0, x1] = _, t0 = transform(x0 = +x0), t1 = transform(x1 = +x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0), scale) : [x0, x1];
	  };

	  scale.clamp = function(_) {
	    return arguments.length ? (clamp = !!_, scale) : clamp;
	  };

	  scale.interpolator = function(_) {
	    return arguments.length ? (interpolator = _, scale) : interpolator;
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  return function(t) {
	    transform = t, t0 = t(x0), t1 = t(x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0);
	    return scale;
	  };
	}

	function copy$1(source, target) {
	  return target
	      .domain(source.domain())
	      .interpolator(source.interpolator())
	      .clamp(source.clamp())
	      .unknown(source.unknown());
	}

	function sequential() {
	  var scale = linearish(transformer$1()(identity));

	  scale.copy = function() {
	    return copy$1(scale, sequential());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function sequentialLog() {
	  var scale = loggish(transformer$1()).domain([1, 10]);

	  scale.copy = function() {
	    return copy$1(scale, sequentialLog()).base(scale.base());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function sequentialSymlog() {
	  var scale = symlogish(transformer$1());

	  scale.copy = function() {
	    return copy$1(scale, sequentialSymlog()).constant(scale.constant());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function sequentialPow() {
	  var scale = powish(transformer$1());

	  scale.copy = function() {
	    return copy$1(scale, sequentialPow()).exponent(scale.exponent());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function sequentialSqrt() {
	  return sequentialPow.apply(null, arguments).exponent(0.5);
	}

	function sequentialQuantile() {
	  var domain = [],
	      interpolator = identity;

	  function scale(x) {
	    if (!isNaN(x = +x)) return interpolator((d3Array.bisect(domain, x) - 1) / (domain.length - 1));
	  }

	  scale.domain = function(_) {
	    if (!arguments.length) return domain.slice();
	    domain = [];
	    for (let d of _) if (d != null && !isNaN(d = +d)) domain.push(d);
	    domain.sort(d3Array.ascending);
	    return scale;
	  };

	  scale.interpolator = function(_) {
	    return arguments.length ? (interpolator = _, scale) : interpolator;
	  };

	  scale.copy = function() {
	    return sequentialQuantile(interpolator).domain(domain);
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function transformer$2() {
	  var x0 = 0,
	      x1 = 0.5,
	      x2 = 1,
	      t0,
	      t1,
	      t2,
	      k10,
	      k21,
	      interpolator = identity,
	      transform,
	      clamp = false,
	      unknown;

	  function scale(x) {
	    return isNaN(x = +x) ? unknown : (x = 0.5 + ((x = +transform(x)) - t1) * (x < t1 ? k10 : k21), interpolator(clamp ? Math.max(0, Math.min(1, x)) : x));
	  }

	  scale.domain = function(_) {
	    return arguments.length ? ([x0, x1, x2] = _, t0 = transform(x0 = +x0), t1 = transform(x1 = +x1), t2 = transform(x2 = +x2), k10 = t0 === t1 ? 0 : 0.5 / (t1 - t0), k21 = t1 === t2 ? 0 : 0.5 / (t2 - t1), scale) : [x0, x1, x2];
	  };

	  scale.clamp = function(_) {
	    return arguments.length ? (clamp = !!_, scale) : clamp;
	  };

	  scale.interpolator = function(_) {
	    return arguments.length ? (interpolator = _, scale) : interpolator;
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  return function(t) {
	    transform = t, t0 = t(x0), t1 = t(x1), t2 = t(x2), k10 = t0 === t1 ? 0 : 0.5 / (t1 - t0), k21 = t1 === t2 ? 0 : 0.5 / (t2 - t1);
	    return scale;
	  };
	}

	function diverging() {
	  var scale = linearish(transformer$2()(identity));

	  scale.copy = function() {
	    return copy$1(scale, diverging());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function divergingLog() {
	  var scale = loggish(transformer$2()).domain([0.1, 1, 10]);

	  scale.copy = function() {
	    return copy$1(scale, divergingLog()).base(scale.base());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function divergingSymlog() {
	  var scale = symlogish(transformer$2());

	  scale.copy = function() {
	    return copy$1(scale, divergingSymlog()).constant(scale.constant());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function divergingPow() {
	  var scale = powish(transformer$2());

	  scale.copy = function() {
	    return copy$1(scale, divergingPow()).exponent(scale.exponent());
	  };

	  return initInterpolator.apply(scale, arguments);
	}

	function divergingSqrt() {
	  return divergingPow.apply(null, arguments).exponent(0.5);
	}

	exports.scaleBand = band;
	exports.scalePoint = point;
	exports.scaleIdentity = identity$1;
	exports.scaleLinear = linear;
	exports.scaleLog = log;
	exports.scaleSymlog = symlog;
	exports.scaleOrdinal = ordinal;
	exports.scaleImplicit = implicit;
	exports.scalePow = pow;
	exports.scaleSqrt = sqrt;
	exports.scaleQuantile = quantile;
	exports.scaleQuantize = quantize;
	exports.scaleThreshold = threshold;
	exports.scaleTime = time;
	exports.scaleUtc = utcTime;
	exports.scaleSequential = sequential;
	exports.scaleSequentialLog = sequentialLog;
	exports.scaleSequentialPow = sequentialPow;
	exports.scaleSequentialSqrt = sequentialSqrt;
	exports.scaleSequentialSymlog = sequentialSymlog;
	exports.scaleSequentialQuantile = sequentialQuantile;
	exports.scaleDiverging = diverging;
	exports.scaleDivergingLog = divergingLog;
	exports.scaleDivergingPow = divergingPow;
	exports.scaleDivergingSqrt = divergingSqrt;
	exports.scaleDivergingSymlog = divergingSymlog;
	exports.tickFormat = tickFormat;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-array/ v2.2.0 Copyright 2019 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	function ascending(a, b) {
	  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

	function bisector(compare) {
	  if (compare.length === 1) compare = ascendingComparator(compare);
	  return {
	    left: function(a, x, lo, hi) {
	      if (lo == null) lo = 0;
	      if (hi == null) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) < 0) lo = mid + 1;
	        else hi = mid;
	      }
	      return lo;
	    },
	    right: function(a, x, lo, hi) {
	      if (lo == null) lo = 0;
	      if (hi == null) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) > 0) hi = mid;
	        else lo = mid + 1;
	      }
	      return lo;
	    }
	  };
	}

	function ascendingComparator(f) {
	  return function(d, x) {
	    return ascending(f(d), x);
	  };
	}

	var ascendingBisect = bisector(ascending);
	var bisectRight = ascendingBisect.right;
	var bisectLeft = ascendingBisect.left;

	function count(values, valueof) {
	  let count = 0;
	  if (valueof === undefined) {
	    for (const value of values) {
	      if (value != null && value >= value) {
	        ++count;
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null && value >= value) {
	        ++count;
	      }
	    }
	  }
	  return count;
	}

	function length(array) {
	  return array.length | 0;
	}

	function empty(length) {
	  return !(length > 0);
	}

	function arrayify(values) {
	  return typeof values !== "object" || "length" in values ? values : Array.from(values);
	}

	function reducer(reduce) {
	  return values => reduce(...values);
	}

	function cross(...values) {
	  const reduce = typeof values[values.length - 1] === "function" && reducer(values.pop());
	  values = values.map(arrayify);
	  const lengths = values.map(length);
	  const j = values.length - 1;
	  const index = new Array(j + 1).fill(0);
	  const product = [];
	  if (j < 0 || lengths.some(empty)) return product;
	  while (true) {
	    product.push(index.map((j, i) => values[i][j]));
	    let i = j;
	    while (++index[i] === lengths[i]) {
	      if (i === 0) return reduce ? product.map(reduce) : product;
	      index[i--] = 0;
	    }
	  }
	}

	function descending(a, b) {
	  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
	}

	function variance(values, valueof) {
	  let count = 0;
	  let delta;
	  let mean = 0;
	  let sum = 0;
	  if (valueof === undefined) {
	    for (let value of values) {
	      if (value != null && (value = +value) >= value) {
	        delta = value - mean;
	        mean += delta / ++count;
	        sum += delta * (value - mean);
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
	        delta = value - mean;
	        mean += delta / ++count;
	        sum += delta * (value - mean);
	      }
	    }
	  }
	  if (count > 1) return sum / (count - 1);
	}

	function deviation(values, valueof) {
	  const v = variance(values, valueof);
	  return v ? Math.sqrt(v) : v;
	}

	function extent(values, valueof) {
	  let min;
	  let max;
	  if (valueof === undefined) {
	    for (const value of values) {
	      if (value != null) {
	        if (min === undefined) {
	          if (value >= value) min = max = value;
	        } else {
	          if (min > value) min = value;
	          if (max < value) max = value;
	        }
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null) {
	        if (min === undefined) {
	          if (value >= value) min = max = value;
	        } else {
	          if (min > value) min = value;
	          if (max < value) max = value;
	        }
	      }
	    }
	  }
	  return [min, max];
	}

	function identity(x) {
	  return x;
	}

	function group(values, ...keys) {
	  return nest(values, identity, identity, keys);
	}

	function groups(values, ...keys) {
	  return nest(values, Array.from, identity, keys);
	}

	function rollup(values, reduce, ...keys) {
	  return nest(values, identity, reduce, keys);
	}

	function rollups(values, reduce, ...keys) {
	  return nest(values, Array.from, reduce, keys);
	}

	function nest(values, map, reduce, keys) {
	  return (function regroup(values, i) {
	    if (i >= keys.length) return reduce(values);
	    const groups = new Map();
	    const keyof = keys[i++];
	    let index = -1;
	    for (const value of values) {
	      const key = keyof(value, ++index, values);
	      const group = groups.get(key);
	      if (group) group.push(value);
	      else groups.set(key, [value]);
	    }
	    for (const [key, values] of groups) {
	      groups.set(key, regroup(values, i));
	    }
	    return map(groups);
	  })(values, 0);
	}

	var array = Array.prototype;

	var slice = array.slice;
	var map = array.map;

	function constant(x) {
	  return function() {
	    return x;
	  };
	}

	function range(start, stop, step) {
	  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

	  var i = -1,
	      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
	      range = new Array(n);

	  while (++i < n) {
	    range[i] = start + i * step;
	  }

	  return range;
	}

	var e10 = Math.sqrt(50),
	    e5 = Math.sqrt(10),
	    e2 = Math.sqrt(2);

	function ticks(start, stop, count) {
	  var reverse,
	      i = -1,
	      n,
	      ticks,
	      step;

	  stop = +stop, start = +start, count = +count;
	  if (start === stop && count > 0) return [start];
	  if (reverse = stop < start) n = start, start = stop, stop = n;
	  if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

	  if (step > 0) {
	    start = Math.ceil(start / step);
	    stop = Math.floor(stop / step);
	    ticks = new Array(n = Math.ceil(stop - start + 1));
	    while (++i < n) ticks[i] = (start + i) * step;
	  } else {
	    start = Math.floor(start * step);
	    stop = Math.ceil(stop * step);
	    ticks = new Array(n = Math.ceil(start - stop + 1));
	    while (++i < n) ticks[i] = (start - i) / step;
	  }

	  if (reverse) ticks.reverse();

	  return ticks;
	}

	function tickIncrement(start, stop, count) {
	  var step = (stop - start) / Math.max(0, count),
	      power = Math.floor(Math.log(step) / Math.LN10),
	      error = step / Math.pow(10, power);
	  return power >= 0
	      ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
	      : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
	}

	function tickStep(start, stop, count) {
	  var step0 = Math.abs(stop - start) / Math.max(0, count),
	      step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
	      error = step0 / step1;
	  if (error >= e10) step1 *= 10;
	  else if (error >= e5) step1 *= 5;
	  else if (error >= e2) step1 *= 2;
	  return stop < start ? -step1 : step1;
	}

	function sturges(values) {
	  return Math.ceil(Math.log(values.length) / Math.LN2) + 1;
	}

	function bin() {
	  var value = identity,
	      domain = extent,
	      threshold = sturges;

	  function histogram(data) {
	    if (!Array.isArray(data)) data = Array.from(data);

	    var i,
	        n = data.length,
	        x,
	        values = new Array(n);

	    for (i = 0; i < n; ++i) {
	      values[i] = value(data[i], i, data);
	    }

	    var xz = domain(values),
	        x0 = xz[0],
	        x1 = xz[1],
	        tz = threshold(values, x0, x1);

	    // Convert number of thresholds into uniform thresholds.
	    if (!Array.isArray(tz)) {
	      tz = tickStep(x0, x1, tz);
	      tz = range(Math.ceil(x0 / tz) * tz, x1, tz); // exclusive
	    }

	    // Remove any thresholds outside the domain.
	    var m = tz.length;
	    while (tz[0] <= x0) tz.shift(), --m;
	    while (tz[m - 1] > x1) tz.pop(), --m;

	    var bins = new Array(m + 1),
	        bin;

	    // Initialize bins.
	    for (i = 0; i <= m; ++i) {
	      bin = bins[i] = [];
	      bin.x0 = i > 0 ? tz[i - 1] : x0;
	      bin.x1 = i < m ? tz[i] : x1;
	    }

	    // Assign data to bins by value, ignoring any outside the domain.
	    for (i = 0; i < n; ++i) {
	      x = values[i];
	      if (x0 <= x && x <= x1) {
	        bins[bisectRight(tz, x, 0, m)].push(data[i]);
	      }
	    }

	    return bins;
	  }

	  histogram.value = function(_) {
	    return arguments.length ? (value = typeof _ === "function" ? _ : constant(_), histogram) : value;
	  };

	  histogram.domain = function(_) {
	    return arguments.length ? (domain = typeof _ === "function" ? _ : constant([_[0], _[1]]), histogram) : domain;
	  };

	  histogram.thresholds = function(_) {
	    return arguments.length ? (threshold = typeof _ === "function" ? _ : Array.isArray(_) ? constant(slice.call(_)) : constant(_), histogram) : threshold;
	  };

	  return histogram;
	}

	function number(x) {
	  return x === null ? NaN : +x;
	}

	function quantile(values, p, valueof = number) {
	  if (!(n = values.length)) return;
	  if ((p = +p) <= 0 || n < 2) return +valueof(values[0], 0, values);
	  if (p >= 1) return +valueof(values[n - 1], n - 1, values);
	  var n,
	      i = (n - 1) * p,
	      i0 = Math.floor(i),
	      value0 = +valueof(values[i0], i0, values),
	      value1 = +valueof(values[i0 + 1], i0 + 1, values);
	  return value0 + (value1 - value0) * (i - i0);
	}

	function freedmanDiaconis(values, min, max) {
	  values = map.call(values, number).sort(ascending);
	  return Math.ceil((max - min) / (2 * (quantile(values, 0.75) - quantile(values, 0.25)) * Math.pow(values.length, -1 / 3)));
	}

	function scott(values, min, max) {
	  return Math.ceil((max - min) / (3.5 * deviation(values) * Math.pow(values.length, -1 / 3)));
	}

	function max(values, valueof) {
	  let max;
	  if (valueof === undefined) {
	    for (const value of values) {
	      if (value != null
	          && (max < value || (max === undefined && value >= value))) {
	        max = value;
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null
	          && (max < value || (max === undefined && value >= value))) {
	        max = value;
	      }
	    }
	  }
	  return max;
	}

	function maxIndex(values, valueof) {
	  let max;
	  let maxIndex = -1;
	  let index = -1;
	  if (valueof === undefined) {
	    for (const value of values) {
	      ++index;
	      if (value != null
	          && (max < value || (max === undefined && value >= value))) {
	        max = value, maxIndex = index;
	      }
	    }
	  } else {
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null
	          && (max < value || (max === undefined && value >= value))) {
	        max = value, maxIndex = index;
	      }
	    }
	  }
	  return maxIndex;
	}

	function mean(values, valueof) {
	  let count = 0;
	  let sum = 0;
	  if (valueof === undefined) {
	    for (let value of values) {
	      if (value != null && (value = +value) >= value) {
	        ++count, sum += value;
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
	        ++count, sum += value;
	      }
	    }
	  }
	  if (count) return sum / count;
	}

	// Based on https://github.com/mourner/quickselect
	// ISC license, Copyright 2018 Vladimir Agafonkin.
	function quickselect(array, k, left = 0, right = array.length - 1, compare = ascending) {
	  while (right > left) {
	    if (right - left > 600) {
	      const n = right - left + 1;
	      const m = k - left + 1;
	      const z = Math.log(n);
	      const s = 0.5 * Math.exp(2 * z / 3);
	      const sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
	      const newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
	      const newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
	      quickselect(array, k, newLeft, newRight, compare);
	    }

	    const t = array[k];
	    let i = left;
	    let j = right;

	    swap(array, left, k);
	    if (compare(array[right], t) > 0) swap(array, left, right);

	    while (i < j) {
	      swap(array, i, j), ++i, --j;
	      while (compare(array[i], t) < 0) ++i;
	      while (compare(array[j], t) > 0) --j;
	    }

	    if (compare(array[left], t) === 0) swap(array, left, j);
	    else ++j, swap(array, j, right);

	    if (j <= k) left = j + 1;
	    if (k <= j) right = j - 1;
	  }
	  return array;
	}

	function swap(array, i, j) {
	  const t = array[i];
	  array[i] = array[j];
	  array[j] = t;
	}

	function* numbers(values, valueof) {
	  if (valueof === undefined) {
	    for (let value of values) {
	      if (value != null && (value = +value) >= value) {
	        yield value;
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
	        yield value;
	      }
	    }
	  }
	}

	function median(values, valueof) {
	  values = Float64Array.from(numbers(values, valueof));
	  if (!values.length) return;
	  const n = values.length;
	  const i = n >> 1;
	  quickselect(values, i - 1, 0);
	  if ((n & 1) === 0) quickselect(values, i, i);
	  return quantile(values, 0.5);
	}

	function* flatten(arrays) {
	  for (const array of arrays) {
	    yield* array;
	  }
	}

	function merge(arrays) {
	  return Array.from(flatten(arrays));
	}

	function min(values, valueof) {
	  let min;
	  if (valueof === undefined) {
	    for (const value of values) {
	      if (value != null
	          && (min > value || (min === undefined && value >= value))) {
	        min = value;
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null
	          && (min > value || (min === undefined && value >= value))) {
	        min = value;
	      }
	    }
	  }
	  return min;
	}

	function minIndex(values, valueof) {
	  let min;
	  let minIndex = -1;
	  let index = -1;
	  if (valueof === undefined) {
	    for (const value of values) {
	      ++index;
	      if (value != null
	          && (min > value || (min === undefined && value >= value))) {
	        min = value, minIndex = index;
	      }
	    }
	  } else {
	    for (let value of values) {
	      if ((value = valueof(value, ++index, values)) != null
	          && (min > value || (min === undefined && value >= value))) {
	        min = value, minIndex = index;
	      }
	    }
	  }
	  return minIndex;
	}

	function pairs(values, pairof = pair) {
	  const pairs = [];
	  let previous;
	  let first = false;
	  for (const value of values) {
	    if (first) pairs.push(pairof(previous, value));
	    previous = value;
	    first = true;
	  }
	  return pairs;
	}

	function pair(a, b) {
	  return [a, b];
	}

	function permute(source, keys) {
	  return Array.from(keys, key => source[key]);
	}

	function least(values, compare = ascending) {
	  let min;
	  let defined = false;
	  if (compare.length === 1) {
	    let minValue;
	    for (const element of values) {
	      const value = compare(element);
	      if (defined
	          ? ascending(value, minValue) < 0
	          : ascending(value, value) === 0) {
	        min = element;
	        minValue = value;
	        defined = true;
	      }
	    }
	  } else {
	    for (const value of values) {
	      if (defined
	          ? compare(value, min) < 0
	          : compare(value, value) === 0) {
	        min = value;
	        defined = true;
	      }
	    }
	  }
	  return min;
	}

	function leastIndex(values, compare = ascending) {
	  let min;
	  let minIndex = -1;
	  let index = -1;
	  if (compare.length === 1) {
	    for (const element of values) {
	      ++index;
	      const value = compare(element);
	      if (minIndex < 0
	          ? ascending(value, value) === 0
	          : ascending(value, min) < 0) {
	        min = value;
	        minIndex = index;
	      }
	    }
	  } else {
	    for (const value of values) {
	      ++index;
	      if (minIndex < 0
	          ? compare(value, value) === 0
	          : compare(value, min) < 0) {
	        min = value;
	        minIndex = index;
	      }
	    }
	  }
	  return minIndex;
	}

	function scan(values, compare) {
	  const index = leastIndex(values, compare);
	  return index < 0 ? undefined : index;
	}

	function shuffle(array, i0 = 0, i1 = array.length) {
	  var m = i1 - (i0 = +i0),
	      t,
	      i;

	  while (m) {
	    i = Math.random() * m-- | 0;
	    t = array[m + i0];
	    array[m + i0] = array[i + i0];
	    array[i + i0] = t;
	  }

	  return array;
	}

	function sum(values, valueof) {
	  let sum = 0;
	  if (valueof === undefined) {
	    for (let value of values) {
	      if (value = +value) {
	        sum += value;
	      }
	    }
	  } else {
	    let index = -1;
	    for (let value of values) {
	      if (value = +valueof(value, ++index, values)) {
	        sum += value;
	      }
	    }
	  }
	  return sum;
	}

	function transpose(matrix) {
	  if (!(n = matrix.length)) return [];
	  for (var i = -1, m = min(matrix, length$1), transpose = new Array(m); ++i < m;) {
	    for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n;) {
	      row[j] = matrix[j][i];
	    }
	  }
	  return transpose;
	}

	function length$1(d) {
	  return d.length;
	}

	function zip() {
	  return transpose(arguments);
	}

	exports.bisect = bisectRight;
	exports.bisectRight = bisectRight;
	exports.bisectLeft = bisectLeft;
	exports.ascending = ascending;
	exports.bisector = bisector;
	exports.count = count;
	exports.cross = cross;
	exports.descending = descending;
	exports.deviation = deviation;
	exports.extent = extent;
	exports.group = group;
	exports.groups = groups;
	exports.rollup = rollup;
	exports.rollups = rollups;
	exports.bin = bin;
	exports.histogram = bin;
	exports.thresholdFreedmanDiaconis = freedmanDiaconis;
	exports.thresholdScott = scott;
	exports.thresholdSturges = sturges;
	exports.max = max;
	exports.maxIndex = maxIndex;
	exports.mean = mean;
	exports.median = median;
	exports.merge = merge;
	exports.min = min;
	exports.minIndex = minIndex;
	exports.pairs = pairs;
	exports.permute = permute;
	exports.quantile = quantile;
	exports.quickselect = quickselect;
	exports.range = range;
	exports.least = least;
	exports.leastIndex = leastIndex;
	exports.scan = scan;
	exports.shuffle = shuffle;
	exports.sum = sum;
	exports.ticks = ticks;
	exports.tickIncrement = tickIncrement;
	exports.tickStep = tickStep;
	exports.transpose = transpose;
	exports.variance = variance;
	exports.zip = zip;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-interpolate/ v1.3.2 Copyright 2018 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports, __webpack_require__(63)) :
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

	function basis$1(values) {
	  var n = values.length - 1;
	  return function(t) {
	    var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
	        v1 = values[i],
	        v2 = values[i + 1],
	        v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
	        v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
	    return basis((t - i / n) * n, v0, v1, v2, v3);
	  };
	}

	function basisClosed(values) {
	  var n = values.length;
	  return function(t) {
	    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n),
	        v0 = values[(i + n - 1) % n],
	        v1 = values[i % n],
	        v2 = values[(i + 1) % n],
	        v3 = values[(i + 2) % n];
	    return basis((t - i / n) * n, v0, v1, v2, v3);
	  };
	}

	function constant(x) {
	  return function() {
	    return x;
	  };
	}

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

	var rgb = (function rgbGamma(y) {
	  var color = gamma(y);

	  function rgb(start, end) {
	    var r = color((start = d3Color.rgb(start)).r, (end = d3Color.rgb(end)).r),
	        g = color(start.g, end.g),
	        b = color(start.b, end.b),
	        opacity = nogamma(start.opacity, end.opacity);
	    return function(t) {
	      start.r = r(t);
	      start.g = g(t);
	      start.b = b(t);
	      start.opacity = opacity(t);
	      return start + "";
	    };
	  }

	  rgb.gamma = rgbGamma;

	  return rgb;
	})(1);

	function rgbSpline(spline) {
	  return function(colors) {
	    var n = colors.length,
	        r = new Array(n),
	        g = new Array(n),
	        b = new Array(n),
	        i, color;
	    for (i = 0; i < n; ++i) {
	      color = d3Color.rgb(colors[i]);
	      r[i] = color.r || 0;
	      g[i] = color.g || 0;
	      b[i] = color.b || 0;
	    }
	    r = spline(r);
	    g = spline(g);
	    b = spline(b);
	    color.opacity = 1;
	    return function(t) {
	      color.r = r(t);
	      color.g = g(t);
	      color.b = b(t);
	      return color + "";
	    };
	  };
	}

	var rgbBasis = rgbSpline(basis$1);
	var rgbBasisClosed = rgbSpline(basisClosed);

	function array(a, b) {
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
	}

	function date(a, b) {
	  var d = new Date;
	  return a = +a, b -= a, function(t) {
	    return d.setTime(a + b * t), d;
	  };
	}

	function number(a, b) {
	  return a = +a, b -= a, function(t) {
	    return a + b * t;
	  };
	}

	function object(a, b) {
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
	}

	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
	    reB = new RegExp(reA.source, "g");

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

	function string(a, b) {
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
	}

	function value(a, b) {
	  var t = typeof b, c;
	  return b == null || t === "boolean" ? constant(b)
	      : (t === "number" ? number
	      : t === "string" ? ((c = d3Color.color(b)) ? (b = c, rgb) : string)
	      : b instanceof d3Color.color ? rgb
	      : b instanceof Date ? date
	      : Array.isArray(b) ? array
	      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
	      : number)(a, b);
	}

	function discrete(range) {
	  var n = range.length;
	  return function(t) {
	    return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
	  };
	}

	function hue$1(a, b) {
	  var i = hue(+a, +b);
	  return function(t) {
	    var x = i(t);
	    return x - 360 * Math.floor(x / 360);
	  };
	}

	function round(a, b) {
	  return a = +a, b -= a, function(t) {
	    return Math.round(a + b * t);
	  };
	}

	var degrees = 180 / Math.PI;

	var identity = {
	  translateX: 0,
	  translateY: 0,
	  rotate: 0,
	  skewX: 0,
	  scaleX: 1,
	  scaleY: 1
	};

	function decompose(a, b, c, d, e, f) {
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
	}

	var cssNode,
	    cssRoot,
	    cssView,
	    svgNode;

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

	var rho = Math.SQRT2,
	    rho2 = 2,
	    rho4 = 4,
	    epsilon2 = 1e-12;

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
	function zoom(p0, p1) {
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
	}

	function hsl(hue$$1) {
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

	var hsl$1 = hsl(hue);
	var hslLong = hsl(nogamma);

	function lab(start, end) {
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

	function hcl(hue$$1) {
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

	var hcl$1 = hcl(hue);
	var hclLong = hcl(nogamma);

	function cubehelix(hue$$1) {
	  return (function cubehelixGamma(y) {
	    y = +y;

	    function cubehelix(start, end) {
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

	    cubehelix.gamma = cubehelixGamma;

	    return cubehelix;
	  })(1);
	}

	var cubehelix$1 = cubehelix(hue);
	var cubehelixLong = cubehelix(nogamma);

	function piecewise(interpolate, values) {
	  var i = 0, n = values.length - 1, v = values[0], I = new Array(n < 0 ? 0 : n);
	  while (i < n) I[i] = interpolate(v, v = values[++i]);
	  return function(t) {
	    var i = Math.max(0, Math.min(n - 1, Math.floor(t *= n)));
	    return I[i](t - i);
	  };
	}

	function quantize(interpolator, n) {
	  var samples = new Array(n);
	  for (var i = 0; i < n; ++i) samples[i] = interpolator(i / (n - 1));
	  return samples;
	}

	exports.interpolate = value;
	exports.interpolateArray = array;
	exports.interpolateBasis = basis$1;
	exports.interpolateBasisClosed = basisClosed;
	exports.interpolateDate = date;
	exports.interpolateDiscrete = discrete;
	exports.interpolateHue = hue$1;
	exports.interpolateNumber = number;
	exports.interpolateObject = object;
	exports.interpolateRound = round;
	exports.interpolateString = string;
	exports.interpolateTransformCss = interpolateTransformCss;
	exports.interpolateTransformSvg = interpolateTransformSvg;
	exports.interpolateZoom = zoom;
	exports.interpolateRgb = rgb;
	exports.interpolateRgbBasis = rgbBasis;
	exports.interpolateRgbBasisClosed = rgbBasisClosed;
	exports.interpolateHsl = hsl$1;
	exports.interpolateHslLong = hslLong;
	exports.interpolateLab = lab;
	exports.interpolateHcl = hcl$1;
	exports.interpolateHclLong = hclLong;
	exports.interpolateCubehelix = cubehelix$1;
	exports.interpolateCubehelixLong = cubehelixLong;
	exports.piecewise = piecewise;
	exports.quantize = quantize;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-color/ v1.2.3 Copyright 2018 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	function define(constructor, factory, prototype) {
	  constructor.prototype = factory.prototype = prototype;
	  prototype.constructor = constructor;
	}

	function extend(parent, definition) {
	  var prototype = Object.create(parent.prototype);
	  for (var key in definition) prototype[key] = definition[key];
	  return prototype;
	}

	function Color() {}

	var darker = 0.7;
	var brighter = 1 / darker;

	var reI = "\\s*([+-]?\\d+)\\s*",
	    reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
	    reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
	    reHex3 = /^#([0-9a-f]{3})$/,
	    reHex6 = /^#([0-9a-f]{6})$/,
	    reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
	    reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
	    reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
	    reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
	    reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
	    reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

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
	  hex: function() {
	    return this.rgb().hex();
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
	  hex: function() {
	    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
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

	function hex(value) {
	  value = Math.max(0, Math.min(255, Math.round(value) || 0));
	  return (value < 16 ? "0" : "") + value.toString(16);
	}

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

	// https://beta.observablehq.com/@mbostock/lab-and-rgb
	var K = 18,
	    Xn = 0.96422,
	    Yn = 1,
	    Zn = 0.82521,
	    t0 = 4 / 29,
	    t1 = 6 / 29,
	    t2 = 3 * t1 * t1,
	    t3 = t1 * t1 * t1;

	function labConvert(o) {
	  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
	  if (o instanceof Hcl) {
	    if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
	    var h = o.h * deg2rad;
	    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
	  }
	  if (!(o instanceof Rgb)) o = rgbConvert(o);
	  var r = rgb2lrgb(o.r),
	      g = rgb2lrgb(o.g),
	      b = rgb2lrgb(o.b),
	      y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
	  if (r === g && g === b) x = z = y; else {
	    x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
	    z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
	  }
	  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
	}

	function gray(l, opacity) {
	  return new Lab(l, 0, 0, opacity == null ? 1 : opacity);
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
	    return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  darker: function(k) {
	    return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
	  },
	  rgb: function() {
	    var y = (this.l + 16) / 116,
	        x = isNaN(this.a) ? y : y + this.a / 500,
	        z = isNaN(this.b) ? y : y - this.b / 200;
	    x = Xn * lab2xyz(x);
	    y = Yn * lab2xyz(y);
	    z = Zn * lab2xyz(z);
	    return new Rgb(
	      lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
	      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
	      lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
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

	function lrgb2rgb(x) {
	  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	}

	function rgb2lrgb(x) {
	  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	}

	function hclConvert(o) {
	  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
	  if (!(o instanceof Lab)) o = labConvert(o);
	  if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0, o.l, o.opacity);
	  var h = Math.atan2(o.b, o.a) * rad2deg;
	  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
	}

	function lch(l, c, h, opacity) {
	  return arguments.length === 1 ? hclConvert(l) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
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
	    return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
	  },
	  darker: function(k) {
	    return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
	  },
	  rgb: function() {
	    return labConvert(this).rgb();
	  }
	}));

	var A = -0.14861,
	    B = +1.78277,
	    C = -0.29227,
	    D = -0.90649,
	    E = +1.97294,
	    ED = E * D,
	    EB = E * B,
	    BC_DA = B * C - D * A;

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
	exports.lch = lch;
	exports.gray = gray;
	exports.cubehelix = cubehelix;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-format/ v1.3.2 Copyright 2018 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	// Computes the decimal coefficient and exponent of the specified number x with
	// significant digits p, where x is positive and p is in [1, 21] or undefined.
	// For example, formatDecimal(1.23) returns ["123", 0].
	function formatDecimal(x, p) {
	  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
	  var i, coefficient = x.slice(0, i);

	  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
	  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
	  return [
	    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
	    +x.slice(i + 1)
	  ];
	}

	function exponent(x) {
	  return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
	}

	function formatGroup(grouping, thousands) {
	  return function(value, width) {
	    var i = value.length,
	        t = [],
	        j = 0,
	        g = grouping[0],
	        length = 0;

	    while (i > 0 && g > 0) {
	      if (length + g + 1 > width) g = Math.max(1, width - length);
	      t.push(value.substring(i -= g, i + g));
	      if ((length += g + 1) > width) break;
	      g = grouping[j = (j + 1) % grouping.length];
	    }

	    return t.reverse().join(thousands);
	  };
	}

	function formatNumerals(numerals) {
	  return function(value) {
	    return value.replace(/[0-9]/g, function(i) {
	      return numerals[+i];
	    });
	  };
	}

	// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
	var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

	function formatSpecifier(specifier) {
	  return new FormatSpecifier(specifier);
	}

	formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

	function FormatSpecifier(specifier) {
	  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
	  var match;
	  this.fill = match[1] || " ";
	  this.align = match[2] || ">";
	  this.sign = match[3] || "-";
	  this.symbol = match[4] || "";
	  this.zero = !!match[5];
	  this.width = match[6] && +match[6];
	  this.comma = !!match[7];
	  this.precision = match[8] && +match[8].slice(1);
	  this.trim = !!match[9];
	  this.type = match[10] || "";
	}

	FormatSpecifier.prototype.toString = function() {
	  return this.fill
	      + this.align
	      + this.sign
	      + this.symbol
	      + (this.zero ? "0" : "")
	      + (this.width == null ? "" : Math.max(1, this.width | 0))
	      + (this.comma ? "," : "")
	      + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
	      + (this.trim ? "~" : "")
	      + this.type;
	};

	// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
	function formatTrim(s) {
	  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
	    switch (s[i]) {
	      case ".": i0 = i1 = i; break;
	      case "0": if (i0 === 0) i0 = i; i1 = i; break;
	      default: if (i0 > 0) { if (!+s[i]) break out; i0 = 0; } break;
	    }
	  }
	  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
	}

	var prefixExponent;

	function formatPrefixAuto(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1],
	      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
	      n = coefficient.length;
	  return i === n ? coefficient
	      : i > n ? coefficient + new Array(i - n + 1).join("0")
	      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
	      : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
	}

	function formatRounded(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1];
	  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
	      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
	      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
	}

	var formatTypes = {
	  "%": function(x, p) { return (x * 100).toFixed(p); },
	  "b": function(x) { return Math.round(x).toString(2); },
	  "c": function(x) { return x + ""; },
	  "d": function(x) { return Math.round(x).toString(10); },
	  "e": function(x, p) { return x.toExponential(p); },
	  "f": function(x, p) { return x.toFixed(p); },
	  "g": function(x, p) { return x.toPrecision(p); },
	  "o": function(x) { return Math.round(x).toString(8); },
	  "p": function(x, p) { return formatRounded(x * 100, p); },
	  "r": formatRounded,
	  "s": formatPrefixAuto,
	  "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
	  "x": function(x) { return Math.round(x).toString(16); }
	};

	function identity(x) {
	  return x;
	}

	var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

	function formatLocale(locale) {
	  var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity,
	      currency = locale.currency,
	      decimal = locale.decimal,
	      numerals = locale.numerals ? formatNumerals(locale.numerals) : identity,
	      percent = locale.percent || "%";

	  function newFormat(specifier) {
	    specifier = formatSpecifier(specifier);

	    var fill = specifier.fill,
	        align = specifier.align,
	        sign = specifier.sign,
	        symbol = specifier.symbol,
	        zero = specifier.zero,
	        width = specifier.width,
	        comma = specifier.comma,
	        precision = specifier.precision,
	        trim = specifier.trim,
	        type = specifier.type;

	    // The "n" type is an alias for ",g".
	    if (type === "n") comma = true, type = "g";

	    // The "" type, and any invalid type, is an alias for ".12~g".
	    else if (!formatTypes[type]) precision == null && (precision = 12), trim = true, type = "g";

	    // If zero fill is specified, padding goes after sign and before digits.
	    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

	    // Compute the prefix and suffix.
	    // For SI-prefix, the suffix is lazily computed.
	    var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
	        suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? percent : "";

	    // What format function should we use?
	    // Is this an integer type?
	    // Can this type generate exponential notation?
	    var formatType = formatTypes[type],
	        maybeSuffix = /[defgprs%]/.test(type);

	    // Set the default precision if not specified,
	    // or clamp the specified precision to the supported range.
	    // For significant precision, it must be in [1, 21].
	    // For fixed precision, it must be in [0, 20].
	    precision = precision == null ? 6
	        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
	        : Math.max(0, Math.min(20, precision));

	    function format(value) {
	      var valuePrefix = prefix,
	          valueSuffix = suffix,
	          i, n, c;

	      if (type === "c") {
	        valueSuffix = formatType(value) + valueSuffix;
	        value = "";
	      } else {
	        value = +value;

	        // Perform the initial formatting.
	        var valueNegative = value < 0;
	        value = formatType(Math.abs(value), precision);

	        // Trim insignificant zeros.
	        if (trim) value = formatTrim(value);

	        // If a negative value rounds to zero during formatting, treat as positive.
	        if (valueNegative && +value === 0) valueNegative = false;

	        // Compute the prefix and suffix.
	        valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
	        valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

	        // Break the formatted value into the integer “value” part that can be
	        // grouped, and fractional or exponential “suffix” part that is not.
	        if (maybeSuffix) {
	          i = -1, n = value.length;
	          while (++i < n) {
	            if (c = value.charCodeAt(i), 48 > c || c > 57) {
	              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
	              value = value.slice(0, i);
	              break;
	            }
	          }
	        }
	      }

	      // If the fill character is not "0", grouping is applied before padding.
	      if (comma && !zero) value = group(value, Infinity);

	      // Compute the padding.
	      var length = valuePrefix.length + value.length + valueSuffix.length,
	          padding = length < width ? new Array(width - length + 1).join(fill) : "";

	      // If the fill character is "0", grouping is applied after padding.
	      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

	      // Reconstruct the final output based on the desired alignment.
	      switch (align) {
	        case "<": value = valuePrefix + value + valueSuffix + padding; break;
	        case "=": value = valuePrefix + padding + value + valueSuffix; break;
	        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
	        default: value = padding + valuePrefix + value + valueSuffix; break;
	      }

	      return numerals(value);
	    }

	    format.toString = function() {
	      return specifier + "";
	    };

	    return format;
	  }

	  function formatPrefix(specifier, value) {
	    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
	        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
	        k = Math.pow(10, -e),
	        prefix = prefixes[8 + e / 3];
	    return function(value) {
	      return f(k * value) + prefix;
	    };
	  }

	  return {
	    format: newFormat,
	    formatPrefix: formatPrefix
	  };
	}

	var locale;

	defaultLocale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["$", ""]
	});

	function defaultLocale(definition) {
	  locale = formatLocale(definition);
	  exports.format = locale.format;
	  exports.formatPrefix = locale.formatPrefix;
	  return locale;
	}

	function precisionFixed(step) {
	  return Math.max(0, -exponent(Math.abs(step)));
	}

	function precisionPrefix(step, value) {
	  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
	}

	function precisionRound(step, max) {
	  step = Math.abs(step), max = Math.abs(max) - step;
	  return Math.max(0, exponent(max) - exponent(step)) + 1;
	}

	exports.formatDefaultLocale = defaultLocale;
	exports.formatLocale = formatLocale;
	exports.formatSpecifier = formatSpecifier;
	exports.precisionFixed = precisionFixed;
	exports.precisionPrefix = precisionPrefix;
	exports.precisionRound = precisionRound;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-time/ v1.0.11 Copyright 2019 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
	}(this, (function (exports) { 'use strict';

	var t0 = new Date,
	    t1 = new Date;

	function newInterval(floori, offseti, count, field) {

	  function interval(date) {
	    return floori(date = new Date(+date)), date;
	  }

	  interval.floor = interval;

	  interval.ceil = function(date) {
	    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
	  };

	  interval.round = function(date) {
	    var d0 = interval(date),
	        d1 = interval.ceil(date);
	    return date - d0 < d1 - date ? d0 : d1;
	  };

	  interval.offset = function(date, step) {
	    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
	  };

	  interval.range = function(start, stop, step) {
	    var range = [], previous;
	    start = interval.ceil(start);
	    step = step == null ? 1 : Math.floor(step);
	    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
	    do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
	    while (previous < start && start < stop);
	    return range;
	  };

	  interval.filter = function(test) {
	    return newInterval(function(date) {
	      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
	    }, function(date, step) {
	      if (date >= date) {
	        if (step < 0) while (++step <= 0) {
	          while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
	        } else while (--step >= 0) {
	          while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
	        }
	      }
	    });
	  };

	  if (count) {
	    interval.count = function(start, end) {
	      t0.setTime(+start), t1.setTime(+end);
	      floori(t0), floori(t1);
	      return Math.floor(count(t0, t1));
	    };

	    interval.every = function(step) {
	      step = Math.floor(step);
	      return !isFinite(step) || !(step > 0) ? null
	          : !(step > 1) ? interval
	          : interval.filter(field
	              ? function(d) { return field(d) % step === 0; }
	              : function(d) { return interval.count(0, d) % step === 0; });
	    };
	  }

	  return interval;
	}

	var millisecond = newInterval(function() {
	  // noop
	}, function(date, step) {
	  date.setTime(+date + step);
	}, function(start, end) {
	  return end - start;
	});

	// An optimized implementation for this simple case.
	millisecond.every = function(k) {
	  k = Math.floor(k);
	  if (!isFinite(k) || !(k > 0)) return null;
	  if (!(k > 1)) return millisecond;
	  return newInterval(function(date) {
	    date.setTime(Math.floor(date / k) * k);
	  }, function(date, step) {
	    date.setTime(+date + step * k);
	  }, function(start, end) {
	    return (end - start) / k;
	  });
	};
	var milliseconds = millisecond.range;

	var durationSecond = 1e3;
	var durationMinute = 6e4;
	var durationHour = 36e5;
	var durationDay = 864e5;
	var durationWeek = 6048e5;

	var second = newInterval(function(date) {
	  date.setTime(date - date.getMilliseconds());
	}, function(date, step) {
	  date.setTime(+date + step * durationSecond);
	}, function(start, end) {
	  return (end - start) / durationSecond;
	}, function(date) {
	  return date.getUTCSeconds();
	});
	var seconds = second.range;

	var minute = newInterval(function(date) {
	  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond);
	}, function(date, step) {
	  date.setTime(+date + step * durationMinute);
	}, function(start, end) {
	  return (end - start) / durationMinute;
	}, function(date) {
	  return date.getMinutes();
	});
	var minutes = minute.range;

	var hour = newInterval(function(date) {
	  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond - date.getMinutes() * durationMinute);
	}, function(date, step) {
	  date.setTime(+date + step * durationHour);
	}, function(start, end) {
	  return (end - start) / durationHour;
	}, function(date) {
	  return date.getHours();
	});
	var hours = hour.range;

	var day = newInterval(function(date) {
	  date.setHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setDate(date.getDate() + step);
	}, function(start, end) {
	  return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
	}, function(date) {
	  return date.getDate() - 1;
	});
	var days = day.range;

	function weekday(i) {
	  return newInterval(function(date) {
	    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
	    date.setHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setDate(date.getDate() + step * 7);
	  }, function(start, end) {
	    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
	  });
	}

	var sunday = weekday(0);
	var monday = weekday(1);
	var tuesday = weekday(2);
	var wednesday = weekday(3);
	var thursday = weekday(4);
	var friday = weekday(5);
	var saturday = weekday(6);

	var sundays = sunday.range;
	var mondays = monday.range;
	var tuesdays = tuesday.range;
	var wednesdays = wednesday.range;
	var thursdays = thursday.range;
	var fridays = friday.range;
	var saturdays = saturday.range;

	var month = newInterval(function(date) {
	  date.setDate(1);
	  date.setHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setMonth(date.getMonth() + step);
	}, function(start, end) {
	  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
	}, function(date) {
	  return date.getMonth();
	});
	var months = month.range;

	var year = newInterval(function(date) {
	  date.setMonth(0, 1);
	  date.setHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setFullYear(date.getFullYear() + step);
	}, function(start, end) {
	  return end.getFullYear() - start.getFullYear();
	}, function(date) {
	  return date.getFullYear();
	});

	// An optimized implementation for this simple case.
	year.every = function(k) {
	  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
	    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
	    date.setMonth(0, 1);
	    date.setHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setFullYear(date.getFullYear() + step * k);
	  });
	};
	var years = year.range;

	var utcMinute = newInterval(function(date) {
	  date.setUTCSeconds(0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * durationMinute);
	}, function(start, end) {
	  return (end - start) / durationMinute;
	}, function(date) {
	  return date.getUTCMinutes();
	});
	var utcMinutes = utcMinute.range;

	var utcHour = newInterval(function(date) {
	  date.setUTCMinutes(0, 0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * durationHour);
	}, function(start, end) {
	  return (end - start) / durationHour;
	}, function(date) {
	  return date.getUTCHours();
	});
	var utcHours = utcHour.range;

	var utcDay = newInterval(function(date) {
	  date.setUTCHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setUTCDate(date.getUTCDate() + step);
	}, function(start, end) {
	  return (end - start) / durationDay;
	}, function(date) {
	  return date.getUTCDate() - 1;
	});
	var utcDays = utcDay.range;

	function utcWeekday(i) {
	  return newInterval(function(date) {
	    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
	    date.setUTCHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setUTCDate(date.getUTCDate() + step * 7);
	  }, function(start, end) {
	    return (end - start) / durationWeek;
	  });
	}

	var utcSunday = utcWeekday(0);
	var utcMonday = utcWeekday(1);
	var utcTuesday = utcWeekday(2);
	var utcWednesday = utcWeekday(3);
	var utcThursday = utcWeekday(4);
	var utcFriday = utcWeekday(5);
	var utcSaturday = utcWeekday(6);

	var utcSundays = utcSunday.range;
	var utcMondays = utcMonday.range;
	var utcTuesdays = utcTuesday.range;
	var utcWednesdays = utcWednesday.range;
	var utcThursdays = utcThursday.range;
	var utcFridays = utcFriday.range;
	var utcSaturdays = utcSaturday.range;

	var utcMonth = newInterval(function(date) {
	  date.setUTCDate(1);
	  date.setUTCHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setUTCMonth(date.getUTCMonth() + step);
	}, function(start, end) {
	  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
	}, function(date) {
	  return date.getUTCMonth();
	});
	var utcMonths = utcMonth.range;

	var utcYear = newInterval(function(date) {
	  date.setUTCMonth(0, 1);
	  date.setUTCHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setUTCFullYear(date.getUTCFullYear() + step);
	}, function(start, end) {
	  return end.getUTCFullYear() - start.getUTCFullYear();
	}, function(date) {
	  return date.getUTCFullYear();
	});

	// An optimized implementation for this simple case.
	utcYear.every = function(k) {
	  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
	    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
	    date.setUTCMonth(0, 1);
	    date.setUTCHours(0, 0, 0, 0);
	  }, function(date, step) {
	    date.setUTCFullYear(date.getUTCFullYear() + step * k);
	  });
	};
	var utcYears = utcYear.range;

	exports.timeInterval = newInterval;
	exports.timeMillisecond = millisecond;
	exports.timeMilliseconds = milliseconds;
	exports.utcMillisecond = millisecond;
	exports.utcMilliseconds = milliseconds;
	exports.timeSecond = second;
	exports.timeSeconds = seconds;
	exports.utcSecond = second;
	exports.utcSeconds = seconds;
	exports.timeMinute = minute;
	exports.timeMinutes = minutes;
	exports.timeHour = hour;
	exports.timeHours = hours;
	exports.timeDay = day;
	exports.timeDays = days;
	exports.timeWeek = sunday;
	exports.timeWeeks = sundays;
	exports.timeSunday = sunday;
	exports.timeSundays = sundays;
	exports.timeMonday = monday;
	exports.timeMondays = mondays;
	exports.timeTuesday = tuesday;
	exports.timeTuesdays = tuesdays;
	exports.timeWednesday = wednesday;
	exports.timeWednesdays = wednesdays;
	exports.timeThursday = thursday;
	exports.timeThursdays = thursdays;
	exports.timeFriday = friday;
	exports.timeFridays = fridays;
	exports.timeSaturday = saturday;
	exports.timeSaturdays = saturdays;
	exports.timeMonth = month;
	exports.timeMonths = months;
	exports.timeYear = year;
	exports.timeYears = years;
	exports.utcMinute = utcMinute;
	exports.utcMinutes = utcMinutes;
	exports.utcHour = utcHour;
	exports.utcHours = utcHours;
	exports.utcDay = utcDay;
	exports.utcDays = utcDays;
	exports.utcWeek = utcSunday;
	exports.utcWeeks = utcSundays;
	exports.utcSunday = utcSunday;
	exports.utcSundays = utcSundays;
	exports.utcMonday = utcMonday;
	exports.utcMondays = utcMondays;
	exports.utcTuesday = utcTuesday;
	exports.utcTuesdays = utcTuesdays;
	exports.utcWednesday = utcWednesday;
	exports.utcWednesdays = utcWednesdays;
	exports.utcThursday = utcThursday;
	exports.utcThursdays = utcThursdays;
	exports.utcFriday = utcFriday;
	exports.utcFridays = utcFridays;
	exports.utcSaturday = utcSaturday;
	exports.utcSaturdays = utcSaturdays;
	exports.utcMonth = utcMonth;
	exports.utcMonths = utcMonths;
	exports.utcYear = utcYear;
	exports.utcYears = utcYears;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-time-format/ v2.1.3 Copyright 2018 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports, __webpack_require__(65)) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-time'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3));
	}(this, (function (exports,d3Time) { 'use strict';

	function localDate(d) {
	  if (0 <= d.y && d.y < 100) {
	    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
	    date.setFullYear(d.y);
	    return date;
	  }
	  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
	}

	function utcDate(d) {
	  if (0 <= d.y && d.y < 100) {
	    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
	    date.setUTCFullYear(d.y);
	    return date;
	  }
	  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
	}

	function newYear(y) {
	  return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
	}

	function formatLocale(locale) {
	  var locale_dateTime = locale.dateTime,
	      locale_date = locale.date,
	      locale_time = locale.time,
	      locale_periods = locale.periods,
	      locale_weekdays = locale.days,
	      locale_shortWeekdays = locale.shortDays,
	      locale_months = locale.months,
	      locale_shortMonths = locale.shortMonths;

	  var periodRe = formatRe(locale_periods),
	      periodLookup = formatLookup(locale_periods),
	      weekdayRe = formatRe(locale_weekdays),
	      weekdayLookup = formatLookup(locale_weekdays),
	      shortWeekdayRe = formatRe(locale_shortWeekdays),
	      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
	      monthRe = formatRe(locale_months),
	      monthLookup = formatLookup(locale_months),
	      shortMonthRe = formatRe(locale_shortMonths),
	      shortMonthLookup = formatLookup(locale_shortMonths);

	  var formats = {
	    "a": formatShortWeekday,
	    "A": formatWeekday,
	    "b": formatShortMonth,
	    "B": formatMonth,
	    "c": null,
	    "d": formatDayOfMonth,
	    "e": formatDayOfMonth,
	    "f": formatMicroseconds,
	    "H": formatHour24,
	    "I": formatHour12,
	    "j": formatDayOfYear,
	    "L": formatMilliseconds,
	    "m": formatMonthNumber,
	    "M": formatMinutes,
	    "p": formatPeriod,
	    "Q": formatUnixTimestamp,
	    "s": formatUnixTimestampSeconds,
	    "S": formatSeconds,
	    "u": formatWeekdayNumberMonday,
	    "U": formatWeekNumberSunday,
	    "V": formatWeekNumberISO,
	    "w": formatWeekdayNumberSunday,
	    "W": formatWeekNumberMonday,
	    "x": null,
	    "X": null,
	    "y": formatYear,
	    "Y": formatFullYear,
	    "Z": formatZone,
	    "%": formatLiteralPercent
	  };

	  var utcFormats = {
	    "a": formatUTCShortWeekday,
	    "A": formatUTCWeekday,
	    "b": formatUTCShortMonth,
	    "B": formatUTCMonth,
	    "c": null,
	    "d": formatUTCDayOfMonth,
	    "e": formatUTCDayOfMonth,
	    "f": formatUTCMicroseconds,
	    "H": formatUTCHour24,
	    "I": formatUTCHour12,
	    "j": formatUTCDayOfYear,
	    "L": formatUTCMilliseconds,
	    "m": formatUTCMonthNumber,
	    "M": formatUTCMinutes,
	    "p": formatUTCPeriod,
	    "Q": formatUnixTimestamp,
	    "s": formatUnixTimestampSeconds,
	    "S": formatUTCSeconds,
	    "u": formatUTCWeekdayNumberMonday,
	    "U": formatUTCWeekNumberSunday,
	    "V": formatUTCWeekNumberISO,
	    "w": formatUTCWeekdayNumberSunday,
	    "W": formatUTCWeekNumberMonday,
	    "x": null,
	    "X": null,
	    "y": formatUTCYear,
	    "Y": formatUTCFullYear,
	    "Z": formatUTCZone,
	    "%": formatLiteralPercent
	  };

	  var parses = {
	    "a": parseShortWeekday,
	    "A": parseWeekday,
	    "b": parseShortMonth,
	    "B": parseMonth,
	    "c": parseLocaleDateTime,
	    "d": parseDayOfMonth,
	    "e": parseDayOfMonth,
	    "f": parseMicroseconds,
	    "H": parseHour24,
	    "I": parseHour24,
	    "j": parseDayOfYear,
	    "L": parseMilliseconds,
	    "m": parseMonthNumber,
	    "M": parseMinutes,
	    "p": parsePeriod,
	    "Q": parseUnixTimestamp,
	    "s": parseUnixTimestampSeconds,
	    "S": parseSeconds,
	    "u": parseWeekdayNumberMonday,
	    "U": parseWeekNumberSunday,
	    "V": parseWeekNumberISO,
	    "w": parseWeekdayNumberSunday,
	    "W": parseWeekNumberMonday,
	    "x": parseLocaleDate,
	    "X": parseLocaleTime,
	    "y": parseYear,
	    "Y": parseFullYear,
	    "Z": parseZone,
	    "%": parseLiteralPercent
	  };

	  // These recursive directive definitions must be deferred.
	  formats.x = newFormat(locale_date, formats);
	  formats.X = newFormat(locale_time, formats);
	  formats.c = newFormat(locale_dateTime, formats);
	  utcFormats.x = newFormat(locale_date, utcFormats);
	  utcFormats.X = newFormat(locale_time, utcFormats);
	  utcFormats.c = newFormat(locale_dateTime, utcFormats);

	  function newFormat(specifier, formats) {
	    return function(date) {
	      var string = [],
	          i = -1,
	          j = 0,
	          n = specifier.length,
	          c,
	          pad,
	          format;

	      if (!(date instanceof Date)) date = new Date(+date);

	      while (++i < n) {
	        if (specifier.charCodeAt(i) === 37) {
	          string.push(specifier.slice(j, i));
	          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
	          else pad = c === "e" ? " " : "0";
	          if (format = formats[c]) c = format(date, pad);
	          string.push(c);
	          j = i + 1;
	        }
	      }

	      string.push(specifier.slice(j, i));
	      return string.join("");
	    };
	  }

	  function newParse(specifier, newDate) {
	    return function(string) {
	      var d = newYear(1900),
	          i = parseSpecifier(d, specifier, string += "", 0),
	          week, day;
	      if (i != string.length) return null;

	      // If a UNIX timestamp is specified, return it.
	      if ("Q" in d) return new Date(d.Q);

	      // The am-pm flag is 0 for AM, and 1 for PM.
	      if ("p" in d) d.H = d.H % 12 + d.p * 12;

	      // Convert day-of-week and week-of-year to day-of-year.
	      if ("V" in d) {
	        if (d.V < 1 || d.V > 53) return null;
	        if (!("w" in d)) d.w = 1;
	        if ("Z" in d) {
	          week = utcDate(newYear(d.y)), day = week.getUTCDay();
	          week = day > 4 || day === 0 ? d3Time.utcMonday.ceil(week) : d3Time.utcMonday(week);
	          week = d3Time.utcDay.offset(week, (d.V - 1) * 7);
	          d.y = week.getUTCFullYear();
	          d.m = week.getUTCMonth();
	          d.d = week.getUTCDate() + (d.w + 6) % 7;
	        } else {
	          week = newDate(newYear(d.y)), day = week.getDay();
	          week = day > 4 || day === 0 ? d3Time.timeMonday.ceil(week) : d3Time.timeMonday(week);
	          week = d3Time.timeDay.offset(week, (d.V - 1) * 7);
	          d.y = week.getFullYear();
	          d.m = week.getMonth();
	          d.d = week.getDate() + (d.w + 6) % 7;
	        }
	      } else if ("W" in d || "U" in d) {
	        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
	        day = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
	        d.m = 0;
	        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
	      }

	      // If a time zone is specified, all fields are interpreted as UTC and then
	      // offset according to the specified time zone.
	      if ("Z" in d) {
	        d.H += d.Z / 100 | 0;
	        d.M += d.Z % 100;
	        return utcDate(d);
	      }

	      // Otherwise, all fields are in local time.
	      return newDate(d);
	    };
	  }

	  function parseSpecifier(d, specifier, string, j) {
	    var i = 0,
	        n = specifier.length,
	        m = string.length,
	        c,
	        parse;

	    while (i < n) {
	      if (j >= m) return -1;
	      c = specifier.charCodeAt(i++);
	      if (c === 37) {
	        c = specifier.charAt(i++);
	        parse = parses[c in pads ? specifier.charAt(i++) : c];
	        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
	      } else if (c != string.charCodeAt(j++)) {
	        return -1;
	      }
	    }

	    return j;
	  }

	  function parsePeriod(d, string, i) {
	    var n = periodRe.exec(string.slice(i));
	    return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseShortWeekday(d, string, i) {
	    var n = shortWeekdayRe.exec(string.slice(i));
	    return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseWeekday(d, string, i) {
	    var n = weekdayRe.exec(string.slice(i));
	    return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseShortMonth(d, string, i) {
	    var n = shortMonthRe.exec(string.slice(i));
	    return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseMonth(d, string, i) {
	    var n = monthRe.exec(string.slice(i));
	    return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseLocaleDateTime(d, string, i) {
	    return parseSpecifier(d, locale_dateTime, string, i);
	  }

	  function parseLocaleDate(d, string, i) {
	    return parseSpecifier(d, locale_date, string, i);
	  }

	  function parseLocaleTime(d, string, i) {
	    return parseSpecifier(d, locale_time, string, i);
	  }

	  function formatShortWeekday(d) {
	    return locale_shortWeekdays[d.getDay()];
	  }

	  function formatWeekday(d) {
	    return locale_weekdays[d.getDay()];
	  }

	  function formatShortMonth(d) {
	    return locale_shortMonths[d.getMonth()];
	  }

	  function formatMonth(d) {
	    return locale_months[d.getMonth()];
	  }

	  function formatPeriod(d) {
	    return locale_periods[+(d.getHours() >= 12)];
	  }

	  function formatUTCShortWeekday(d) {
	    return locale_shortWeekdays[d.getUTCDay()];
	  }

	  function formatUTCWeekday(d) {
	    return locale_weekdays[d.getUTCDay()];
	  }

	  function formatUTCShortMonth(d) {
	    return locale_shortMonths[d.getUTCMonth()];
	  }

	  function formatUTCMonth(d) {
	    return locale_months[d.getUTCMonth()];
	  }

	  function formatUTCPeriod(d) {
	    return locale_periods[+(d.getUTCHours() >= 12)];
	  }

	  return {
	    format: function(specifier) {
	      var f = newFormat(specifier += "", formats);
	      f.toString = function() { return specifier; };
	      return f;
	    },
	    parse: function(specifier) {
	      var p = newParse(specifier += "", localDate);
	      p.toString = function() { return specifier; };
	      return p;
	    },
	    utcFormat: function(specifier) {
	      var f = newFormat(specifier += "", utcFormats);
	      f.toString = function() { return specifier; };
	      return f;
	    },
	    utcParse: function(specifier) {
	      var p = newParse(specifier, utcDate);
	      p.toString = function() { return specifier; };
	      return p;
	    }
	  };
	}

	var pads = {"-": "", "_": " ", "0": "0"},
	    numberRe = /^\s*\d+/, // note: ignores next directive
	    percentRe = /^%/,
	    requoteRe = /[\\^$*+?|[\]().{}]/g;

	function pad(value, fill, width) {
	  var sign = value < 0 ? "-" : "",
	      string = (sign ? -value : value) + "",
	      length = string.length;
	  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
	}

	function requote(s) {
	  return s.replace(requoteRe, "\\$&");
	}

	function formatRe(names) {
	  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
	}

	function formatLookup(names) {
	  var map = {}, i = -1, n = names.length;
	  while (++i < n) map[names[i].toLowerCase()] = i;
	  return map;
	}

	function parseWeekdayNumberSunday(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 1));
	  return n ? (d.w = +n[0], i + n[0].length) : -1;
	}

	function parseWeekdayNumberMonday(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 1));
	  return n ? (d.u = +n[0], i + n[0].length) : -1;
	}

	function parseWeekNumberSunday(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.U = +n[0], i + n[0].length) : -1;
	}

	function parseWeekNumberISO(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.V = +n[0], i + n[0].length) : -1;
	}

	function parseWeekNumberMonday(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.W = +n[0], i + n[0].length) : -1;
	}

	function parseFullYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 4));
	  return n ? (d.y = +n[0], i + n[0].length) : -1;
	}

	function parseYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
	}

	function parseZone(d, string, i) {
	  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
	  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
	}

	function parseMonthNumber(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
	}

	function parseDayOfMonth(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.d = +n[0], i + n[0].length) : -1;
	}

	function parseDayOfYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 3));
	  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
	}

	function parseHour24(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.H = +n[0], i + n[0].length) : -1;
	}

	function parseMinutes(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.M = +n[0], i + n[0].length) : -1;
	}

	function parseSeconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.S = +n[0], i + n[0].length) : -1;
	}

	function parseMilliseconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 3));
	  return n ? (d.L = +n[0], i + n[0].length) : -1;
	}

	function parseMicroseconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 6));
	  return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
	}

	function parseLiteralPercent(d, string, i) {
	  var n = percentRe.exec(string.slice(i, i + 1));
	  return n ? i + n[0].length : -1;
	}

	function parseUnixTimestamp(d, string, i) {
	  var n = numberRe.exec(string.slice(i));
	  return n ? (d.Q = +n[0], i + n[0].length) : -1;
	}

	function parseUnixTimestampSeconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i));
	  return n ? (d.Q = (+n[0]) * 1000, i + n[0].length) : -1;
	}

	function formatDayOfMonth(d, p) {
	  return pad(d.getDate(), p, 2);
	}

	function formatHour24(d, p) {
	  return pad(d.getHours(), p, 2);
	}

	function formatHour12(d, p) {
	  return pad(d.getHours() % 12 || 12, p, 2);
	}

	function formatDayOfYear(d, p) {
	  return pad(1 + d3Time.timeDay.count(d3Time.timeYear(d), d), p, 3);
	}

	function formatMilliseconds(d, p) {
	  return pad(d.getMilliseconds(), p, 3);
	}

	function formatMicroseconds(d, p) {
	  return formatMilliseconds(d, p) + "000";
	}

	function formatMonthNumber(d, p) {
	  return pad(d.getMonth() + 1, p, 2);
	}

	function formatMinutes(d, p) {
	  return pad(d.getMinutes(), p, 2);
	}

	function formatSeconds(d, p) {
	  return pad(d.getSeconds(), p, 2);
	}

	function formatWeekdayNumberMonday(d) {
	  var day = d.getDay();
	  return day === 0 ? 7 : day;
	}

	function formatWeekNumberSunday(d, p) {
	  return pad(d3Time.timeSunday.count(d3Time.timeYear(d), d), p, 2);
	}

	function formatWeekNumberISO(d, p) {
	  var day = d.getDay();
	  d = (day >= 4 || day === 0) ? d3Time.timeThursday(d) : d3Time.timeThursday.ceil(d);
	  return pad(d3Time.timeThursday.count(d3Time.timeYear(d), d) + (d3Time.timeYear(d).getDay() === 4), p, 2);
	}

	function formatWeekdayNumberSunday(d) {
	  return d.getDay();
	}

	function formatWeekNumberMonday(d, p) {
	  return pad(d3Time.timeMonday.count(d3Time.timeYear(d), d), p, 2);
	}

	function formatYear(d, p) {
	  return pad(d.getFullYear() % 100, p, 2);
	}

	function formatFullYear(d, p) {
	  return pad(d.getFullYear() % 10000, p, 4);
	}

	function formatZone(d) {
	  var z = d.getTimezoneOffset();
	  return (z > 0 ? "-" : (z *= -1, "+"))
	      + pad(z / 60 | 0, "0", 2)
	      + pad(z % 60, "0", 2);
	}

	function formatUTCDayOfMonth(d, p) {
	  return pad(d.getUTCDate(), p, 2);
	}

	function formatUTCHour24(d, p) {
	  return pad(d.getUTCHours(), p, 2);
	}

	function formatUTCHour12(d, p) {
	  return pad(d.getUTCHours() % 12 || 12, p, 2);
	}

	function formatUTCDayOfYear(d, p) {
	  return pad(1 + d3Time.utcDay.count(d3Time.utcYear(d), d), p, 3);
	}

	function formatUTCMilliseconds(d, p) {
	  return pad(d.getUTCMilliseconds(), p, 3);
	}

	function formatUTCMicroseconds(d, p) {
	  return formatUTCMilliseconds(d, p) + "000";
	}

	function formatUTCMonthNumber(d, p) {
	  return pad(d.getUTCMonth() + 1, p, 2);
	}

	function formatUTCMinutes(d, p) {
	  return pad(d.getUTCMinutes(), p, 2);
	}

	function formatUTCSeconds(d, p) {
	  return pad(d.getUTCSeconds(), p, 2);
	}

	function formatUTCWeekdayNumberMonday(d) {
	  var dow = d.getUTCDay();
	  return dow === 0 ? 7 : dow;
	}

	function formatUTCWeekNumberSunday(d, p) {
	  return pad(d3Time.utcSunday.count(d3Time.utcYear(d), d), p, 2);
	}

	function formatUTCWeekNumberISO(d, p) {
	  var day = d.getUTCDay();
	  d = (day >= 4 || day === 0) ? d3Time.utcThursday(d) : d3Time.utcThursday.ceil(d);
	  return pad(d3Time.utcThursday.count(d3Time.utcYear(d), d) + (d3Time.utcYear(d).getUTCDay() === 4), p, 2);
	}

	function formatUTCWeekdayNumberSunday(d) {
	  return d.getUTCDay();
	}

	function formatUTCWeekNumberMonday(d, p) {
	  return pad(d3Time.utcMonday.count(d3Time.utcYear(d), d), p, 2);
	}

	function formatUTCYear(d, p) {
	  return pad(d.getUTCFullYear() % 100, p, 2);
	}

	function formatUTCFullYear(d, p) {
	  return pad(d.getUTCFullYear() % 10000, p, 4);
	}

	function formatUTCZone() {
	  return "+0000";
	}

	function formatLiteralPercent() {
	  return "%";
	}

	function formatUnixTimestamp(d) {
	  return +d;
	}

	function formatUnixTimestampSeconds(d) {
	  return Math.floor(+d / 1000);
	}

	var locale;

	defaultLocale({
	  dateTime: "%x, %X",
	  date: "%-m/%-d/%Y",
	  time: "%-I:%M:%S %p",
	  periods: ["AM", "PM"],
	  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	});

	function defaultLocale(definition) {
	  locale = formatLocale(definition);
	  exports.timeFormat = locale.format;
	  exports.timeParse = locale.parse;
	  exports.utcFormat = locale.utcFormat;
	  exports.utcParse = locale.utcParse;
	  return locale;
	}

	var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

	function formatIsoNative(date) {
	  return date.toISOString();
	}

	var formatIso = Date.prototype.toISOString
	    ? formatIsoNative
	    : exports.utcFormat(isoSpecifier);

	function parseIsoNative(string) {
	  var date = new Date(string);
	  return isNaN(date) ? null : date;
	}

	var parseIso = +new Date("2000-01-01T00:00:00.000Z")
	    ? parseIsoNative
	    : exports.utcParse(isoSpecifier);

	exports.timeFormatDefaultLocale = defaultLocale;
	exports.timeFormatLocale = formatLocale;
	exports.isoFormat = formatIso;
	exports.isoParse = parseIso;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

	// https://d3js.org/d3-scale-chromatic/ v1.3.3 Copyright 2018 Mike Bostock
	(function (global, factory) {
	 true ? factory(exports, __webpack_require__(62), __webpack_require__(63)) :
	typeof define === 'function' && define.amd ? define(['exports', 'd3-interpolate', 'd3-color'], factory) :
	(factory((global.d3 = global.d3 || {}),global.d3,global.d3));
	}(this, (function (exports,d3Interpolate,d3Color) { 'use strict';

	function colors(specifier) {
	  var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
	  while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
	  return colors;
	}

	var category10 = colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf");

	var Accent = colors("7fc97fbeaed4fdc086ffff99386cb0f0027fbf5b17666666");

	var Dark2 = colors("1b9e77d95f027570b3e7298a66a61ee6ab02a6761d666666");

	var Paired = colors("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928");

	var Pastel1 = colors("fbb4aeb3cde3ccebc5decbe4fed9a6ffffcce5d8bdfddaecf2f2f2");

	var Pastel2 = colors("b3e2cdfdcdaccbd5e8f4cae4e6f5c9fff2aef1e2cccccccc");

	var Set1 = colors("e41a1c377eb84daf4a984ea3ff7f00ffff33a65628f781bf999999");

	var Set2 = colors("66c2a5fc8d628da0cbe78ac3a6d854ffd92fe5c494b3b3b3");

	var Set3 = colors("8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f");

	function ramp(scheme) {
	  return d3Interpolate.interpolateRgbBasis(scheme[scheme.length - 1]);
	}

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

	var scheme$a = new Array(3).concat(
	  "e0ecf49ebcda8856a7",
	  "edf8fbb3cde38c96c688419d",
	  "edf8fbb3cde38c96c68856a7810f7c",
	  "edf8fbbfd3e69ebcda8c96c68856a7810f7c",
	  "edf8fbbfd3e69ebcda8c96c68c6bb188419d6e016b",
	  "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d6e016b",
	  "f7fcfde0ecf4bfd3e69ebcda8c96c68c6bb188419d810f7c4d004b"
	).map(colors);

	var BuPu = ramp(scheme$a);

	var scheme$b = new Array(3).concat(
	  "e0f3dba8ddb543a2ca",
	  "f0f9e8bae4bc7bccc42b8cbe",
	  "f0f9e8bae4bc7bccc443a2ca0868ac",
	  "f0f9e8ccebc5a8ddb57bccc443a2ca0868ac",
	  "f0f9e8ccebc5a8ddb57bccc44eb3d32b8cbe08589e",
	  "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe08589e",
	  "f7fcf0e0f3dbccebc5a8ddb57bccc44eb3d32b8cbe0868ac084081"
	).map(colors);

	var GnBu = ramp(scheme$b);

	var scheme$c = new Array(3).concat(
	  "fee8c8fdbb84e34a33",
	  "fef0d9fdcc8afc8d59d7301f",
	  "fef0d9fdcc8afc8d59e34a33b30000",
	  "fef0d9fdd49efdbb84fc8d59e34a33b30000",
	  "fef0d9fdd49efdbb84fc8d59ef6548d7301f990000",
	  "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301f990000",
	  "fff7ecfee8c8fdd49efdbb84fc8d59ef6548d7301fb300007f0000"
	).map(colors);

	var OrRd = ramp(scheme$c);

	var scheme$d = new Array(3).concat(
	  "ece2f0a6bddb1c9099",
	  "f6eff7bdc9e167a9cf02818a",
	  "f6eff7bdc9e167a9cf1c9099016c59",
	  "f6eff7d0d1e6a6bddb67a9cf1c9099016c59",
	  "f6eff7d0d1e6a6bddb67a9cf3690c002818a016450",
	  "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016450",
	  "fff7fbece2f0d0d1e6a6bddb67a9cf3690c002818a016c59014636"
	).map(colors);

	var PuBuGn = ramp(scheme$d);

	var scheme$e = new Array(3).concat(
	  "ece7f2a6bddb2b8cbe",
	  "f1eef6bdc9e174a9cf0570b0",
	  "f1eef6bdc9e174a9cf2b8cbe045a8d",
	  "f1eef6d0d1e6a6bddb74a9cf2b8cbe045a8d",
	  "f1eef6d0d1e6a6bddb74a9cf3690c00570b0034e7b",
	  "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0034e7b",
	  "fff7fbece7f2d0d1e6a6bddb74a9cf3690c00570b0045a8d023858"
	).map(colors);

	var PuBu = ramp(scheme$e);

	var scheme$f = new Array(3).concat(
	  "e7e1efc994c7dd1c77",
	  "f1eef6d7b5d8df65b0ce1256",
	  "f1eef6d7b5d8df65b0dd1c77980043",
	  "f1eef6d4b9dac994c7df65b0dd1c77980043",
	  "f1eef6d4b9dac994c7df65b0e7298ace125691003f",
	  "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125691003f",
	  "f7f4f9e7e1efd4b9dac994c7df65b0e7298ace125698004367001f"
	).map(colors);

	var PuRd = ramp(scheme$f);

	var scheme$g = new Array(3).concat(
	  "fde0ddfa9fb5c51b8a",
	  "feebe2fbb4b9f768a1ae017e",
	  "feebe2fbb4b9f768a1c51b8a7a0177",
	  "feebe2fcc5c0fa9fb5f768a1c51b8a7a0177",
	  "feebe2fcc5c0fa9fb5f768a1dd3497ae017e7a0177",
	  "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a0177",
	  "fff7f3fde0ddfcc5c0fa9fb5f768a1dd3497ae017e7a017749006a"
	).map(colors);

	var RdPu = ramp(scheme$g);

	var scheme$h = new Array(3).concat(
	  "edf8b17fcdbb2c7fb8",
	  "ffffcca1dab441b6c4225ea8",
	  "ffffcca1dab441b6c42c7fb8253494",
	  "ffffccc7e9b47fcdbb41b6c42c7fb8253494",
	  "ffffccc7e9b47fcdbb41b6c41d91c0225ea80c2c84",
	  "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea80c2c84",
	  "ffffd9edf8b1c7e9b47fcdbb41b6c41d91c0225ea8253494081d58"
	).map(colors);

	var YlGnBu = ramp(scheme$h);

	var scheme$i = new Array(3).concat(
	  "f7fcb9addd8e31a354",
	  "ffffccc2e69978c679238443",
	  "ffffccc2e69978c67931a354006837",
	  "ffffccd9f0a3addd8e78c67931a354006837",
	  "ffffccd9f0a3addd8e78c67941ab5d238443005a32",
	  "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443005a32",
	  "ffffe5f7fcb9d9f0a3addd8e78c67941ab5d238443006837004529"
	).map(colors);

	var YlGn = ramp(scheme$i);

	var scheme$j = new Array(3).concat(
	  "fff7bcfec44fd95f0e",
	  "ffffd4fed98efe9929cc4c02",
	  "ffffd4fed98efe9929d95f0e993404",
	  "ffffd4fee391fec44ffe9929d95f0e993404",
	  "ffffd4fee391fec44ffe9929ec7014cc4c028c2d04",
	  "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c028c2d04",
	  "ffffe5fff7bcfee391fec44ffe9929ec7014cc4c02993404662506"
	).map(colors);

	var YlOrBr = ramp(scheme$j);

	var scheme$k = new Array(3).concat(
	  "ffeda0feb24cf03b20",
	  "ffffb2fecc5cfd8d3ce31a1c",
	  "ffffb2fecc5cfd8d3cf03b20bd0026",
	  "ffffb2fed976feb24cfd8d3cf03b20bd0026",
	  "ffffb2fed976feb24cfd8d3cfc4e2ae31a1cb10026",
	  "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cb10026",
	  "ffffccffeda0fed976feb24cfd8d3cfc4e2ae31a1cbd0026800026"
	).map(colors);

	var YlOrRd = ramp(scheme$k);

	var scheme$l = new Array(3).concat(
	  "deebf79ecae13182bd",
	  "eff3ffbdd7e76baed62171b5",
	  "eff3ffbdd7e76baed63182bd08519c",
	  "eff3ffc6dbef9ecae16baed63182bd08519c",
	  "eff3ffc6dbef9ecae16baed64292c62171b5084594",
	  "f7fbffdeebf7c6dbef9ecae16baed64292c62171b5084594",
	  "f7fbffdeebf7c6dbef9ecae16baed64292c62171b508519c08306b"
	).map(colors);

	var Blues = ramp(scheme$l);

	var scheme$m = new Array(3).concat(
	  "e5f5e0a1d99b31a354",
	  "edf8e9bae4b374c476238b45",
	  "edf8e9bae4b374c47631a354006d2c",
	  "edf8e9c7e9c0a1d99b74c47631a354006d2c",
	  "edf8e9c7e9c0a1d99b74c47641ab5d238b45005a32",
	  "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45005a32",
	  "f7fcf5e5f5e0c7e9c0a1d99b74c47641ab5d238b45006d2c00441b"
	).map(colors);

	var Greens = ramp(scheme$m);

	var scheme$n = new Array(3).concat(
	  "f0f0f0bdbdbd636363",
	  "f7f7f7cccccc969696525252",
	  "f7f7f7cccccc969696636363252525",
	  "f7f7f7d9d9d9bdbdbd969696636363252525",
	  "f7f7f7d9d9d9bdbdbd969696737373525252252525",
	  "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525",
	  "fffffff0f0f0d9d9d9bdbdbd969696737373525252252525000000"
	).map(colors);

	var Greys = ramp(scheme$n);

	var scheme$o = new Array(3).concat(
	  "efedf5bcbddc756bb1",
	  "f2f0f7cbc9e29e9ac86a51a3",
	  "f2f0f7cbc9e29e9ac8756bb154278f",
	  "f2f0f7dadaebbcbddc9e9ac8756bb154278f",
	  "f2f0f7dadaebbcbddc9e9ac8807dba6a51a34a1486",
	  "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a34a1486",
	  "fcfbfdefedf5dadaebbcbddc9e9ac8807dba6a51a354278f3f007d"
	).map(colors);

	var Purples = ramp(scheme$o);

	var scheme$p = new Array(3).concat(
	  "fee0d2fc9272de2d26",
	  "fee5d9fcae91fb6a4acb181d",
	  "fee5d9fcae91fb6a4ade2d26a50f15",
	  "fee5d9fcbba1fc9272fb6a4ade2d26a50f15",
	  "fee5d9fcbba1fc9272fb6a4aef3b2ccb181d99000d",
	  "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181d99000d",
	  "fff5f0fee0d2fcbba1fc9272fb6a4aef3b2ccb181da50f1567000d"
	).map(colors);

	var Reds = ramp(scheme$p);

	var scheme$q = new Array(3).concat(
	  "fee6cefdae6be6550d",
	  "feeddefdbe85fd8d3cd94701",
	  "feeddefdbe85fd8d3ce6550da63603",
	  "feeddefdd0a2fdae6bfd8d3ce6550da63603",
	  "feeddefdd0a2fdae6bfd8d3cf16913d948018c2d04",
	  "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d948018c2d04",
	  "fff5ebfee6cefdd0a2fdae6bfd8d3cf16913d94801a636037f2704"
	).map(colors);

	var Oranges = ramp(scheme$q);

	var cubehelix = d3Interpolate.interpolateCubehelixLong(d3Color.cubehelix(300, 0.5, 0.0), d3Color.cubehelix(-240, 0.5, 1.0));

	var warm = d3Interpolate.interpolateCubehelixLong(d3Color.cubehelix(-100, 0.75, 0.35), d3Color.cubehelix(80, 1.50, 0.8));

	var cool = d3Interpolate.interpolateCubehelixLong(d3Color.cubehelix(260, 0.75, 0.35), d3Color.cubehelix(80, 1.50, 0.8));

	var c = d3Color.cubehelix();

	function rainbow(t) {
	  if (t < 0 || t > 1) t -= Math.floor(t);
	  var ts = Math.abs(t - 0.5);
	  c.h = 360 * t - 100;
	  c.s = 1.5 - 1.5 * ts;
	  c.l = 0.8 - 0.9 * ts;
	  return c + "";
	}

	var c$1 = d3Color.rgb(),
	    pi_1_3 = Math.PI / 3,
	    pi_2_3 = Math.PI * 2 / 3;

	function sinebow(t) {
	  var x;
	  t = (0.5 - t) * Math.PI;
	  c$1.r = 255 * (x = Math.sin(t)) * x;
	  c$1.g = 255 * (x = Math.sin(t + pi_1_3)) * x;
	  c$1.b = 255 * (x = Math.sin(t + pi_2_3)) * x;
	  return c$1 + "";
	}

	function ramp$1(range) {
	  var n = range.length;
	  return function(t) {
	    return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
	  };
	}

	var viridis = ramp$1(colors("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));

	var magma = ramp$1(colors("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));

	var inferno = ramp$1(colors("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));

	var plasma = ramp$1(colors("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));

	exports.schemeCategory10 = category10;
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
	exports.schemeBuPu = scheme$a;
	exports.interpolateGnBu = GnBu;
	exports.schemeGnBu = scheme$b;
	exports.interpolateOrRd = OrRd;
	exports.schemeOrRd = scheme$c;
	exports.interpolatePuBuGn = PuBuGn;
	exports.schemePuBuGn = scheme$d;
	exports.interpolatePuBu = PuBu;
	exports.schemePuBu = scheme$e;
	exports.interpolatePuRd = PuRd;
	exports.schemePuRd = scheme$f;
	exports.interpolateRdPu = RdPu;
	exports.schemeRdPu = scheme$g;
	exports.interpolateYlGnBu = YlGnBu;
	exports.schemeYlGnBu = scheme$h;
	exports.interpolateYlGn = YlGn;
	exports.schemeYlGn = scheme$i;
	exports.interpolateYlOrBr = YlOrBr;
	exports.schemeYlOrBr = scheme$j;
	exports.interpolateYlOrRd = YlOrRd;
	exports.schemeYlOrRd = scheme$k;
	exports.interpolateBlues = Blues;
	exports.schemeBlues = scheme$l;
	exports.interpolateGreens = Greens;
	exports.schemeGreens = scheme$m;
	exports.interpolateGreys = Greys;
	exports.schemeGreys = scheme$n;
	exports.interpolatePurples = Purples;
	exports.schemePurples = scheme$o;
	exports.interpolateReds = Reds;
	exports.schemeReds = scheme$p;
	exports.interpolateOranges = Oranges;
	exports.schemeOranges = scheme$q;
	exports.interpolateCubehelixDefault = cubehelix;
	exports.interpolateRainbow = rainbow;
	exports.interpolateWarm = warm;
	exports.interpolateCool = cool;
	exports.interpolateSinebow = sinebow;
	exports.interpolateViridis = viridis;
	exports.interpolateMagma = magma;
	exports.interpolateInferno = inferno;
	exports.interpolatePlasma = plasma;

	Object.defineProperty(exports, '__esModule', { value: true });

	})));


/***/ }),
/* 68 */
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