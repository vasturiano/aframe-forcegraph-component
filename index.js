/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

var ngraph = {
      graph: require('ngraph.graph'),
      forcelayout: require('ngraph.forcelayout'),
      forcelayout3d: require('ngraph.forcelayout3d')
    },
    qwest = require('qwest');

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
