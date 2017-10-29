/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

var qwest = require('qwest'),
    accessorFn = require('accessor-fn'),
    tinyColor = require('tinycolor2'),
    d3Chromatic = require('d3-scale-chromatic'),
    d3 = require('d3-force-3d'),
    ngraph = {
      graph: require('ngraph.graph'),
      forcelayout: require('ngraph.forcelayout'),
      forcelayout3d: require('ngraph.forcelayout3d')
    };

var parseAccessor = function(prop) {
  try { prop = eval('(' + prop + ')'); }
  catch (e) {} // Not a function
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
    nodeResolution: {type: 'number', default: 8}, // how many slice segments in the sphere's circumference
    lineOpacity: {type: 'number', default: 0.2},
    autoColorBy: {parse: parseAccessor, default: ''}, // color nodes with the same field equally
    idField: {type: 'string', default: 'id'},
    valField: {parse: parseAccessor, default: 'val'},
    nameField: {parse: parseAccessor, default: 'name'},
    colorField: {parse: parseAccessor, default: 'color'},
    linkSourceField: {type: 'string', default: 'source'},
    linkTargetField: {type: 'string', default: 'target'},
    linkColorField: {parse: parseAccessor, default: 'color'},
    forceEngine: {type: 'string', default: 'd3'}, // 'd3' or 'ngraph'
    warmupTicks: {type: 'int', default: 0}, // how many times to tick the force engine at init before starting to render
    cooldownTicks: {type: 'int', default: 1e18}, // Simulate infinity (int parser doesn't accept Infinity object)
    cooldownTime: {type: 'int', default: 15000} // ms
  },

  init: function () {
    this.state = {}; // Internal state

    // Get camera dom element
    var cameraEl = document.querySelector('a-entity[camera], a-camera');

    // Add info msg
    cameraEl.appendChild(this.state.infoEl = document.createElement('a-text'));
    this.state.infoEl.setAttribute('position', '0 -0.1 -1'); // Canvas center
    this.state.infoEl.setAttribute('width', 1);
    this.state.infoEl.setAttribute('align', 'center');
    this.state.infoEl.setAttribute('color', 'lavender');

    // Setup tooltip (attached to camera)
    cameraEl.appendChild(this.state.tooltipEl = document.createElement('a-text'));
    this.state.tooltipEl.setAttribute('position', '0 -0.5 -1'); // Aligned to canvas bottom
    this.state.tooltipEl.setAttribute('width', 2);
    this.state.tooltipEl.setAttribute('align', 'center');
    this.state.tooltipEl.setAttribute('color', 'lavender');
    this.state.tooltipEl.setAttribute('value', '');

    // Keep reference to Three camera object
    this.cameraObj = cameraEl.object3D.children
        .filter(function(child) { return child.type === 'PerspectiveCamera' })[0];

    // Add D3 force-directed layout
    this.state.d3ForceLayout = d3.forceSimulation()
        .force('link', d3.forceLink())
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter())
        .stop();
  },

  remove: function () {
    // Clean-up elems
    this.state.infoEl.remove();
    this.state.tooltipEl.remove();
  },

  update: function (oldData) {
    var comp = this,
        elData = this.data,
        diff = AFRAME.utils.diff(elData, oldData);

    comp.state.onFrame = null; // Pause simulation
    comp.state.infoEl.setAttribute('value', 'Loading...'); // Add loading msg

    if ('jsonUrl' in diff && elData.jsonUrl) {
      // (Re-)load data
      qwest.get(elData.jsonUrl).then(function(_, json) {
        elData.nodes = json.nodes;
        elData.links = json.links;

        comp.update(elData);  // Force re-update
      });
    }

    if (elData.autoColorBy) {
      // Auto add color to uncolored nodes
      autoColorNodes(elData.nodes, accessorFn(elData.autoColorBy), elData.colorField);
    }

    // parse links
    elData.links.forEach(function(link) {
      link.source = link[elData.linkSourceField];
      link.target = link[elData.linkTargetField];
    });

    // Add children entities
    var el3d = this.el.object3D;
    while(el3d.children.length){ el3d.remove(el3d.children[0]) } // Clear the place

    var nameAccessor = accessorFn(elData.nameField);
    var valAccessor = accessorFn(elData.valField);
    var colorAccessor = accessorFn(elData.colorField);
    var sphereGeometries = {}; // indexed by node value
    var sphereMaterials = {}; // indexed by color
    elData.nodes.forEach(function(node) {
      var val = valAccessor(node) || 1;
      if (!sphereGeometries.hasOwnProperty(val)) {
        sphereGeometries[val] = new THREE.SphereGeometry(Math.cbrt(val) * elData.nodeRelSize, elData.nodeResolution, elData.nodeResolution);
      }

      var color = colorAccessor(node);
      if (!sphereMaterials.hasOwnProperty(color)) {
        sphereMaterials[color] = new THREE.MeshLambertMaterial({
          color: colorStr2Hex(color || '#ffffaa'),
          transparent: true,
          opacity: 0.75
        });
      }

      var sphere = new THREE.Mesh(sphereGeometries[val], sphereMaterials[color]);

      sphere.name = nameAccessor(node); // Add label

      el3d.add(node.__sphere = sphere);
    });

    var linkColorAccessor = accessorFn(elData.linkColorField);
    var lineMaterials = {}; // indexed by color
    elData.links.forEach(function(link) {
      var color = linkColorAccessor(link);
      if (!lineMaterials.hasOwnProperty(color)) {
        lineMaterials[color] = new THREE.LineBasicMaterial({
          color: colorStr2Hex(color || '#f0f0f0'),
          transparent: true,
          opacity: elData.lineOpacity
        });
      }

      var geometry = new THREE.BufferGeometry();
      geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
      var lineMaterial = lineMaterials[color];
      var line = new THREE.Line(geometry, lineMaterial);

      el3d.add(link.__line = line);
    });

    // Feed data to force-directed layout
    var isD3Sim = elData.forceEngine !== 'ngraph',
      layout;
    if (isD3Sim) {
      // D3-force
      (layout = comp.state.d3ForceLayout)
          .stop()
          .alpha(1)// re-heat the simulation
          .numDimensions(elData.numDimensions)
          .nodes(elData.nodes)
          .force('link')
            .id(function (d) {
              return d[elData.idField]
            })
            .links(elData.links);
    } else {
      // ngraph
      var graph = ngraph.graph();
      elData.nodes.forEach(function (node) {
        graph.addNode(node[elData.idField]);
      });
      elData.links.forEach(function (link) {
        graph.addLink(link.source, link.target);
      });
      layout = ngraph['forcelayout' + (elData.numDimensions === 2 ? '' : '3d')](graph);
      layout.graph = graph; // Attach graph reference to layout
    }

    for (var i=0; i<elData.warmupTicks; i++) { layout[isD3Sim?'tick':'step'](); } // Initial ticks before starting to render

    var cntTicks = 0;
    var startTickTime = new Date();
    comp.state.onFrame = layoutTick;
    comp.state.infoEl.setAttribute('value', '');

    //

    function layoutTick() {
      if (cntTicks++ > elData.cooldownTicks || (new Date()) - startTickTime > elData.cooldownTime) {
        comp.state.onFrame = null; // Stop ticking graph
      }

      layout[isD3Sim?'tick':'step'](); // Tick it

      // Update nodes position
      elData.nodes.forEach(function(node) {
        var sphere = node.__sphere,
            pos = isD3Sim
              ? node
              : layout.getNodePosition(node[elData.idField]);

        sphere.position.x = pos.x;
        sphere.position.y = pos.y || 0;
        sphere.position.z = pos.z || 0;
      });

      //Update links position
      elData.links.forEach(function(link) {
        var line = link.__line,
            pos = isD3Sim
                ? link
                : layout.getLinkPosition(layout.graph.getLink(link.source, link.target).id),
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

    //

    function autoColorNodes(nodes, colorByAccessor, colorField) {
      if (!colorByAccessor || typeof colorField !== 'string') return;

      var colors = d3Chromatic.schemePaired; // Paired color set from color brewer

      var uncoloredNodes = nodes.filter(function(node) { return !node[colorField] });
      var nodeGroups = {};

      uncoloredNodes.forEach(function(node) { nodeGroups[colorByAccessor(node)] = null });
      Object.keys(nodeGroups).forEach(function(group, idx) { nodeGroups[group] = idx });

      uncoloredNodes.forEach(function(node) {
        node[colorField] = colors[nodeGroups[colorByAccessor(node)] % colors.length];
      });
    }

    function colorStr2Hex(str) {
      return isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;
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
