/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

// Extend d3 with force-3d functionality
var d3 = require('lodash').assign(require('d3'), require('d3-force-3d'));

// Include line-component
require('aframe-line-component');

/**
 * 3D Force-Directed Graph component for A-Frame.
 */
AFRAME.registerComponent('forcegraph', {
  schema: {
    jsonUrl: {type: 'string'},
    nodeRelSize: {type: 'number', default: 4}, // volume per val unit
    lineOpacity: {type: 'number', default: 0.2},
    autoColorBy: {type: 'string', default: ''}, // color nodes with the same field equally
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
    // Setup tooltip (attached to camera)
    this.data.tooltipEl = d3.select('a-entity[camera], a-camera').append('a-text')
        .attr('position', '0 -0.7 -1') // Aligned to canvas bottom
        .attr('width', 2)
        .attr('align', 'center')
        .attr('color', 'lavender')
        .attr('value', '');

    // Add force-directed layout
    this.data.forceLayout = d3.forceSimulation()
        .numDimensions(3)
        .force('link', d3.forceLink())
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter())
        .stop();

    this.data.nodes = [];
    this.data.links = [];
  },

  remove: function () {
    // Clean-up tooltip elem
    this.data.tooltipEl.remove();
  },

  update: function (oldData) {
    var comp = this,
        elData = this.data,
        diff = AFRAME.utils.diff(elData, oldData);

    if ('jsonUrl' in diff || 'colorField' in diff || 'autoColorBy' in diff || 'linkSourceField' in diff || 'linkTargetField' in diff) {
      // (Re-)load data
      d3.json(elData.jsonUrl, function(json) {

        // auto add color
        if (elData.autoColorBy) {
            // Color brewer paired set
            var colors = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'];

            var nodeGroups = {};
            json.nodes
                .filter(function(node) { return !node[elData.colorField]})
                .map(function(node) { return node[elData.autoColorBy] })
                .forEach(function(group) { nodeGroups[group] = null });
            Object.keys(nodeGroups).forEach(function(group, idx) { nodeGroups[group] = idx });

            json.nodes
              .filter(function(node) { return !node[elData.colorField] })
              .forEach(function(node) {
                node[elData.colorField] = parseInt(colors[nodeGroups[node[elData.autoColorBy]] % colors.length].slice(1), 16);
              });
        }

        // parse links
        json.links.forEach(function(link) {
          link.source = link[elData.linkSourceField];
          link.target = link[elData.linkTargetField];
          link.id = [link.source, link.target].join(' > ');
        });

        elData.nodes = json.nodes;
        elData.links = json.links;

        comp.update(elData);  // Force re-update
      });
    }

    // Add children entities
    var el3d = this.el.object3D;
    el3d.children.forEach(el3d.remove); // Clear the place

    elData.nodes.forEach(function(node) {
      var nodeMaterial = new THREE.MeshBasicMaterial({ color: node[elData.colorField] || 0xffffaa, transparent: true });
      nodeMaterial.opacity = 0.75;

      var sphere = new THREE.Mesh(
          new THREE.SphereGeometry(Math.cbrt(node[elData.valField] || 1) * elData.nodeRelSize, 8, 8),
          nodeMaterial
      );

      // Cross-link data object
      sphere.__data = node;
      node.__sphere = sphere;

      el3d.add(sphere);
    });

    var lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf0f0f0, transparent: true });
    lineMaterial.opacity = elData.lineOpacity;

    elData.links.forEach(function(link) {
      var line = new THREE.Line(new THREE.Geometry(), lineMaterial);
      line.geometry.vertices=[new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)];

      // Cross-link data object
      line.__data = link;
      link.__line = line;

      el3d.add(line);
    });

    // Feed data to force-directed layout
    elData.forceLayout
        .stop()
        .alpha(1)// re-heat the simulation
        .nodes(elData.nodes)
        .force('link')
            .id(function(d) { return d[elData.idField] })
            .links(elData.links);

    for (var i=0; i<elData.warmupTicks; i++) { elData.forceLayout.tick(); } // Initial ticks before starting to render

    var cntTicks = 0;
    var startTickTime = new Date();
    elData.forceLayout.on('tick', layoutTick).restart();

    //

    function layoutTick() {
      if (cntTicks++ > elData.cooldownTicks || (new Date()) - startTickTime > elData.cooldownTime) {
        elData.forceLayout.stop(); // Stop ticking graph
      }

      // Update nodes position
      elData.nodes.forEach(function(node) {
        var sphere = node.__sphere;
        sphere.position.x = node.x;
        sphere.position.y = node.y || 0;
        sphere.position.z = node.z || 0;
      });

      //Update links position
      elData.links.forEach(function(link) {
        var line = link.__line;

        line.geometry.vertices = [
          new THREE.Vector3(link.source.x, link.source.y || 0, link.source.z || 0),
          new THREE.Vector3(link.target.x, link.target.y || 0, link.target.z || 0)
        ];

        line.geometry.verticesNeedUpdate = true;
        line.geometry.computeBoundingSphere();
      });
    }
  }
});
