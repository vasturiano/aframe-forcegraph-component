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

	var ngraph = {
	      graph: __webpack_require__(1),
	      forcelayout: __webpack_require__(3),
	      forcelayout3d: __webpack_require__(20)
	    },
	    qwest = __webpack_require__(48);

	/**
	 * 3D Force-Directed Graph component for A-Frame.
	 */
	AFRAME.registerComponent('forcegraph', {
	  schema: {
	    jsonUrl: {type: 'string'},
	    nodes: {parse: JSON.parse, default: '[]'},
	    links: {parse: JSON.parse, default: '[]'},
	    numDimensions: {type: 'number', default: 3},
	    nodeRelSize: {type: 'number', default: 4}, // volume per val unit
	    lineOpacity: {type: 'number', default: 0.2},
	    autoColorBy: {type: 'string'}, // color nodes with the same field equally
	    idField: {type: 'string', default: 'id'},
	    valField: {type: 'string', default: 'val'},
	    nameField: {type: 'string', default: 'name'},
	    colorField: {type: 'string', default: 'color'},
	    linkSourceField: {type: 'string', default: 'source'},
	    linkTargetField: {type: 'string', default: 'target'},
	    warmupTicks: {type: 'int', default: 0}, // how many times to tick the force engine at init before starting to render
	    cooldownTicks: {type: 'int', default: Infinity},
	    cooldownTime: {type: 'int', default: 15000} // ms
	  },

	  init: function () {
	    this.state = {}; // Internal state

	    // Setup tooltip (attached to camera)
	    this.state.tooltipEl = document.createElement('a-text');
	    document.querySelector('a-entity[camera], a-camera').appendChild(this.state.tooltipEl);
	    this.state.tooltipEl.setAttribute('position', '0 -0.5 -1'); // Aligned to canvas bottom
	    this.state.tooltipEl.setAttribute('width', 2);
	    this.state.tooltipEl.setAttribute('align', 'center');
	    this.state.tooltipEl.setAttribute('color', 'lavender');
	    this.state.tooltipEl.setAttribute('value', '');

	    // Keep reference to Three camera object
	    this.cameraObj = document.querySelector('[camera], a-camera').object3D.children
	        .filter(function(child) { return child.type === 'PerspectiveCamera' })[0];
	  },

	  remove: function () {
	    // Clean-up tooltip elem
	    this.state.tooltipEl.remove();
	  },

	  update: function (oldData) {
	    var comp = this,
	        elData = this.data,
	        diff = AFRAME.utils.diff(elData, oldData);

	    this.state.onFrame = null; // Pause simulation

	    if ('jsonUrl' in diff && elData.jsonUrl) {
	      // (Re-)load data
	      qwest.get(elData.jsonUrl).then(function(_, json) {
	        elData.nodes = json.nodes;
	        elData.links = json.links;

	        comp.update(elData);  // Force re-update
	      });
	    }

	    // Auto add color to uncolored nodes
	    autoColorNodes(elData.nodes, elData.autoColorBy, elData.colorField);

	    // parse links
	    elData.links.forEach(function(link) {
	      link.source = link[elData.linkSourceField];
	      link.target = link[elData.linkTargetField];
	      link.id = [link.source, link.target].join(' > ');
	    });

	    // Add children entities
	    var el3d = this.el.object3D;
	    while(el3d.children.length){ el3d.remove(el3d.children[0]) } // Clear the place

	    elData.nodes.forEach(function(node) {
	      var nodeMaterial = new THREE.MeshLambertMaterial({ color: node[elData.colorField] || 0xffffaa, transparent: true });
	      nodeMaterial.opacity = 0.75;

	      var sphere = new THREE.Mesh(
	          new THREE.SphereGeometry(Math.cbrt(node[elData.valField] || 1) * elData.nodeRelSize, 8, 8),
	          nodeMaterial
	      );

	      sphere.name = node[elData.nameField]; // Add label

	      el3d.add(node.__sphere = sphere);
	    });

	    var lineMaterial = new THREE.LineBasicMaterial({ color: 0xf0f0f0, transparent: true });
	    lineMaterial.opacity = elData.lineOpacity;

	    elData.links.forEach(function(link) {
	      var line = new THREE.Line(new THREE.Geometry(), lineMaterial);
	      line.geometry.vertices=[new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)];

	      el3d.add(link.__line = line);
	    });

	    // Add force-directed layout
	    var graph = ngraph.graph();
	    elData.nodes.forEach(function(node) { graph.addNode(node[elData.idField]); });
	    elData.links.forEach(function(link) { graph.addLink(link.source, link.target); });
	    var layout = ngraph['forcelayout' + (elData.numDimensions === 2 ? '' : '3d')](graph);

	    for (var i=0; i<elData.warmupTicks; i++) { layout.step(); } // Initial ticks before starting to render

	    var cntTicks = 0;
	    var startTickTime = new Date();
	    this.state.onFrame = layoutTick;

	    //

	    function layoutTick() {
	      if (cntTicks++ > elData.cooldownTicks || (new Date()) - startTickTime > elData.cooldownTime) {
	        this.state.onFrame = null; // Stop ticking graph
	      }

	      layout.step(); // Tick it

	      // Update nodes position
	      elData.nodes.forEach(function(node) {
	        var sphere = node.__sphere,
	            pos = layout.getNodePosition(node[elData.idField]);
	        sphere.position.x = pos.x;
	        sphere.position.y = pos.y || 0;
	        sphere.position.z = pos.z || 0;
	      });

	      //Update links position
	      elData.links.forEach(function(link) {
	        var line = link.__line,
	          pos = layout.getLinkPosition(graph.getLink(link.source, link.target).id);

	        line.geometry.vertices = [
	          new THREE.Vector3(pos.from.x, pos.from.y || 0, pos.from.z || 0),
	          new THREE.Vector3(pos.to.x, pos.to.y || 0, pos.to.z || 0)
	        ];

	        line.geometry.verticesNeedUpdate = true;
	        line.geometry.computeBoundingSphere();
	      });
	    }

	    //

	    function autoColorNodes(nodes, colorBy, colorField) {
	      if (!colorBy) return;

	      // Color brewer paired set
	      var colors = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'];

	      var uncoloredNodes = nodes.filter(function(node) { return !node[colorField]}),
	          nodeGroups = {};

	      uncoloredNodes.forEach(function(node) { nodeGroups[node[colorBy]] = null });
	      Object.keys(nodeGroups).forEach(function(group, idx) { nodeGroups[group] = idx });

	      uncoloredNodes.forEach(function(node) {
	        node[colorField] = parseInt(colors[nodeGroups[node[colorBy]] % colors.length].slice(1), 16);
	      });
	    }
	  },


	  tick: function(t, td) {
	    // Update tooltip
	    var centerRaycaster = new THREE.Raycaster();
	    centerRaycaster.setFromCamera(
	        new THREE.Vector2(0, 0), // Canvas center
	        this.cameraObj
	    );

	    var intersects = centerRaycaster.intersectObjects(this.el.object3D.children)
	        .filter(function(o) { return o.object.name }); // Check only objects with labels

	    this.state.tooltipEl.setAttribute('value', intersects.length ? intersects[0].object.name : '' );

	    // Run onFrame ticker
	    if (this.state.onFrame) this.state.onFrame();
	  }
	});


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * @fileOverview Contains definition of the core graph object.
	 */

	/**
	 * @example
	 *  var graph = require('ngraph.graph')();
	 *  graph.addNode(1);     // graph has one node.
	 *  graph.addLink(2, 3);  // now graph contains three nodes and one link.
	 *
	 */
	module.exports = createGraph;

	var eventify = __webpack_require__(2);

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
	  if (options.uniqueLinkId === undefined) {
	    // Request each link id to be unique between same nodes. This negatively
	    // impacts `addLink()` performance (O(n), where n - number of edges of each
	    // vertex), but makes operations with multigraphs more accessible.
	    options.uniqueLinkId = true;
	  }

	  var nodes = typeof Object.create === 'function' ? Object.create(null) : {},
	    links = [],
	    // Hash of multi-edges. Used to track ids of edges between same nodes
	    multiEdges = {},
	    nodesCount = 0,
	    suspendEvents = 0,

	    forEachNode = createNodeIterator(),
	    createLink = options.uniqueLinkId ? createUniqueLink : createSingleLink,

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
	    getNodesCount: function() {
	      return nodesCount;
	    },

	    /**
	     * Gets total number of links in the graph.
	     */
	    getLinksCount: function() {
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
	      node = new Node(nodeId);
	      nodesCount++;
	      recordNodeChange(node, 'add');
	    } else {
	      recordNodeChange(node, 'update');
	    }

	    node.data = data;

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

	    if (node.links) {
	      while (node.links.length) {
	        var link = node.links[0];
	        removeLink(link);
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
	function Node(id) {
	  this.id = id;
	  this.links = null;
	  this.data = null;
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
	  return hashCode(fromId.toString() + '👉 ' + toId.toString());
	}


/***/ }),
/* 2 */
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
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(4);

	var eventify = __webpack_require__(8);

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

	  var createSimulator = __webpack_require__(4);
	  var physicsSimulator = createSimulator(physicsSettings);

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
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(5);
	  var expose = __webpack_require__(6);
	  var merge = __webpack_require__(7);
	  var eventify = __webpack_require__(8);

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
	  var createQuadTree = settings.createQuadTree || __webpack_require__(9);
	  var createBounds = settings.createBounds || __webpack_require__(14);
	  var createDragForce = settings.createDragForce || __webpack_require__(15);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(16);
	  var integrate = settings.integrator || __webpack_require__(17);
	  var createBody = settings.createBody || __webpack_require__(18);

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
/* 5 */
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
/* 6 */
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
/* 7 */
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
/* 8 */
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
/* 9 */
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
	  var random = __webpack_require__(10).random(1984),
	    Node = __webpack_require__(11),
	    InsertStack = __webpack_require__(12),
	    isSamePosition = __webpack_require__(13);

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
/* 10 */
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
/* 11 */
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
/* 12 */
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
/* 13 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);

	    return (dx < 1e-8 && dy < 1e-8);
	};


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(10).random(42);
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
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(7),
	      expose = __webpack_require__(6);

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
/* 16 */
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
	  var merge = __webpack_require__(7);
	  var random = __webpack_require__(10).random(42);
	  var expose = __webpack_require__(6);

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
/* 17 */
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
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(19);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 19 */
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
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * This module provides all required forces to regular ngraph.physics.simulator
	 * to make it 3D simulator. Ideally ngraph.physics.simulator should operate
	 * with vectors, but on practices that showed performance decrease... Maybe
	 * I was doing it wrong, will see if I can refactor/throw away this module.
	 */
	module.exports = createLayout;
	createLayout.get2dLayout = __webpack_require__(21);

	function createLayout(graph, physicsSettings) {
	  var merge = __webpack_require__(25);
	  physicsSettings = merge(physicsSettings, {
	        createQuadTree: __webpack_require__(38),
	        createBounds: __webpack_require__(42),
	        createDragForce: __webpack_require__(43),
	        createSpringForce: __webpack_require__(44),
	        integrator: getIntegrator(physicsSettings),
	        createBody: __webpack_require__(45)
	      });

	  return createLayout.get2dLayout(graph, physicsSettings);
	}

	function getIntegrator(physicsSettings) {
	  if (physicsSettings && physicsSettings.integrator === 'verlet') {
	    return __webpack_require__(46);
	  }

	  return __webpack_require__(47)
	}


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = createLayout;
	module.exports.simulator = __webpack_require__(22);

	var eventify = __webpack_require__(26);

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

	  var createSimulator = __webpack_require__(22);
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
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Manages a simulation of physical forces acting on bodies and springs.
	 */
	module.exports = physicsSimulator;

	function physicsSimulator(settings) {
	  var Spring = __webpack_require__(23);
	  var expose = __webpack_require__(24);
	  var merge = __webpack_require__(25);
	  var eventify = __webpack_require__(26);

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
	  var createQuadTree = settings.createQuadTree || __webpack_require__(27);
	  var createBounds = settings.createBounds || __webpack_require__(32);
	  var createDragForce = settings.createDragForce || __webpack_require__(33);
	  var createSpringForce = settings.createSpringForce || __webpack_require__(34);
	  var integrate = settings.integrator || __webpack_require__(35);
	  var createBody = settings.createBody || __webpack_require__(36);

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
/* 23 */
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
/* 24 */
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
/* 25 */
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
/* 26 */
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
/* 27 */
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
	  var random = __webpack_require__(28).random(1984),
	    Node = __webpack_require__(29),
	    InsertStack = __webpack_require__(30),
	    isSamePosition = __webpack_require__(31);

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
/* 28 */
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
/* 29 */
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
/* 30 */
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
/* 31 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);

	    return (dx < 1e-8 && dy < 1e-8);
	};


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(28).random(42);
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
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(25),
	      expose = __webpack_require__(24);

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
/* 34 */
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
	  var merge = __webpack_require__(25);
	  var random = __webpack_require__(28).random(42);
	  var expose = __webpack_require__(24);

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
/* 35 */
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
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(37);

	module.exports = function(pos) {
	  return new physics.Body(pos);
	}


/***/ }),
/* 37 */
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
/* 38 */
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
	  var random = __webpack_require__(28).random(1984),
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
/* 39 */
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
/* 40 */
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
/* 41 */
/***/ (function(module, exports) {

	module.exports = function isSamePosition(point1, point2) {
	    var dx = Math.abs(point1.x - point2.x);
	    var dy = Math.abs(point1.y - point2.y);
	    var dz = Math.abs(point1.z - point2.z);

	    return (dx < 1e-8 && dy < 1e-8 && dz < 1e-8);
	};


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = function (bodies, settings) {
	  var random = __webpack_require__(28).random(42);
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
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * Represents 3d drag force, which reduces force value on each step by given
	 * coefficient.
	 *
	 * @param {Object} options for the drag force
	 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
	 */
	module.exports = function (options) {
	  var merge = __webpack_require__(25),
	      expose = __webpack_require__(24);

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
/* 44 */
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
	  var merge = __webpack_require__(25);
	  var random = __webpack_require__(28).random(42);
	  var expose = __webpack_require__(24);

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
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

	var physics = __webpack_require__(37);

	module.exports = function(pos) {
	  return new physics.Body3d(pos);
	}


/***/ }),
/* 46 */
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
/* 47 */
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
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

	/*! qwest 4.4.5 (https://github.com/pyrsmk/qwest) */

	module.exports = function() {

		var global = typeof window != 'undefined' ? window : self,
			pinkyswear = __webpack_require__(49),
			jparam = __webpack_require__(54),
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
			data = data || null;
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
			if(method == 'GET' && data && typeof data == 'string') {
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
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module, setImmediate, process) {/*
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
	(function(target) {
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

		target[0][target[1]] = function pinkySwear(extend) {
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
	})( false ? [window, 'pinkySwear'] : [module, 'exports']);


	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(50)(module), __webpack_require__(51).setImmediate, __webpack_require__(53)))

/***/ }),
/* 50 */
/***/ (function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ }),
/* 51 */
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
	__webpack_require__(52);
	exports.setImmediate = setImmediate;
	exports.clearImmediate = clearImmediate;


/***/ }),
/* 52 */
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

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(53)))

/***/ }),
/* 53 */
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
/* 54 */
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


/***/ })
/******/ ]);