/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

// Extend d3 with force-3d functionality
const d3 = require('lodash').assign(require('d3'), require('d3-force-3d'));
require('aframe-line-component');

/**
 * 3D Force-Directed Graph component for A-Frame.
 */
AFRAME.registerComponent('forcegraph', {
  schema: {
    jsonUrl: {type: 'string'},
    nodeRelSize: {type: 'number', default: 4}, // volume per val unit
    lineOpacity: {type: 'number', default: 0.2},
    autoColorBy: {type: 'string', default: 'name'}, // color nodes with the same field equally
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
    const comp = this,
        elData = this.data,
        diff = AFRAME.utils.diff(elData, oldData);

    if ('jsonUrl' in diff) {
      // (Re-)load data
      d3.json(elData.jsonUrl, json => {
        // Color brewer paired set
        const colors = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'];

        // add color
        json.nodes.filter(node => !node[elData.colorField]).forEach(node => {
          node[elData.colorField] = parseInt(colors[node[elData.autoColorBy] % colors.length].slice(1), 16);
        });

        // add links id
        json.links.forEach(link => {
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
    const d3El = d3.select(this.el);
    let d3Nodes = d3El.selectAll('a-sphere.node')
        .data(elData.nodes, d => d[elData.idField]);

    d3Nodes.exit().remove();

    d3Nodes = d3Nodes.merge(
        d3Nodes.enter()
            .append('a-sphere')
            .classed('node', true)
            .attr('segments-width', 8)	// Lower geometry resolution to improve perf
            .attr('segments-height', 8)
            .attr('radius', d => Math.cbrt(d[elData.valField] || 1) * elData.nodeRelSize)
            .attr('color', d => '#' + (d[elData.colorField] || 0xffffaa).toString(16))
            .attr('opacity', 0.75)
            .on('mouseenter', d => {
              elData.tooltipEl.attr('value', d[elData.nameField] || '');
            })
            .on('mouseleave', () => {
              elData.tooltipEl.attr('value', '');
            })
    );

    let d3Links = d3El.selectAll('a-entity.link')
        .data(elData.links, d => d.id);

    d3Links.exit().remove();

    d3Links = d3Links.merge(
        d3Links.enter()
            .append('a-entity')
            .classed('link', true)
            .attr('line', `color: #f0f0f0; opacity: ${elData.lineOpacity}`)
    );

    // Feed data to force-directed layout
    elData.forceLayout
        .stop()
        .alpha(1)// re-heat the simulation
        .nodes(elData.nodes)
        .force('link')
            .id(d => d[elData.idField])
            .links(elData.links);

    for (let i=0; i<elData.warmupTicks; i++) { elData.forceLayout.tick(); } // Initial ticks before starting to render

    let cntTicks = 0;
    const startTickTime = new Date();
    elData.forceLayout.on('tick', layoutTick).restart();

    //

    function layoutTick() {
      if (cntTicks++ > elData.cooldownTicks || (new Date()) - startTickTime > elData.cooldownTime) {
        elData.forceLayout.stop(); // Stop ticking graph
      }

      // Update nodes position
      d3Nodes.attr('position', d => `${d.x} ${d.y || 0} ${d.z || 0}`);

      //Update links position
      d3Links.attr('line', d => `start: ${d.source.x} ${d.source.y || 0} ${d.source.z || 0};  end: ${d.target.x} ${d.target.y || 0} ${d.target.z || 0}`);
    }
  }
});
