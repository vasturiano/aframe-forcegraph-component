import * as d3Core from 'd3';
import * as d3Force from 'd3-force-3d';
import { default as extend } from 'lodash/assign';
let d3 = {};
extend(d3, d3Core, d3Force);

/* global AFRAME */
if (typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
}

/**
 * 3d Force-Directed graph component for A-Frame.
 */
AFRAME.registerComponent('forcegraph', {
    schema: {
        nodes: {type: 'array', default: []},
        links: {type: 'array', default: []},
        nodeRelSize: {type: 'number', default: 4}, // volume per val unit
        lineOpacity: {type: 'number', default: 0.2},
        valField: {type: 'string', default: 'val'},
        nameField: {type: 'string', default: 'name'},
        colorField: {type: 'string', default: 'color'},
        warmUpTicks: {type: 'int', default: 0}, // how many times to tick the force engine at init before starting to render
        coolDownTicks: {type: 'int', default: Infinity},
        coolDownTime: {type: 'int', default: 15000} // ms
    },

    init() {
        this.forceLayout = d3.forceSimulation()
            .numDimensions(3)
            .force('link', d3.forceLink().id(d => d.id))
            .force('charge', d3.forceManyBody())
            .force('center', d3.forceCenter())
            .stop();
    },

    update() {
        // Build graph with data
        const d3Nodes = this.data.nodes;
        const d3Links = this.data.links.map(link => {
            return { _id: link.join('>'), source: link[0], target: link[1] };
        });

        // Add children entities
        const d3El = d3.select(this.el);
        let nodes = d3El.selectAll('a-sphere.node')
            .data(d3Nodes, d => d.id);

        nodes.exit().remove();

        nodes = nodes.merge(
            nodes.enter()
                .append('a-sphere')
                .classed('node', true)
                .attr('segments-width', 8)	// Lower geometry resolution to improve perf
                .attr('segments-height', 8)
                .attr('radius', d => Math.cbrt(d[this.data.valField] || 1) * this.data.nodeRelSize)
                .attr('color', d => '#' + (d[this.data.colorField] || 0xffffaa).toString(16))
                .attr('opacity', 0.75)
                .on('mouseenter', d => {
                    console.log('in', d);
                    //this.data.tooltipElem.attr('value', this.data.nameAccessor(d) || '');
                })
                .on('mouseleave', () => {
                    console.log('out', d);
                    //this.data.tooltipElem.attr('value', '');
                })
        );

        let links = d3El.selectAll('a-entity.link')
            .data(d3Links, d => d.id);

        links.exit().remove();

        links = links.merge(
            links.enter()
                .append('a-entity')
                .classed('link', true)
                .attr('line', `color: #f0f0f0; opacity: ${this.data.lineOpacity}`)
        );

        // Feed data to force-directed layout
        this.forceLayout
            .stop()
            .alpha(1)// re-heat the simulation
            .nodes(d3Nodes)
            .force('link').links(d3Links);

        for (let i=0; i<this.data.warmUpTicks; i++) { this.forceLayout.tick(); } // Initial ticks before starting to render

        let cntTicks = 0;
        const startTickTime = new Date();
        this.forceLayout.on("tick", layoutTick).restart();

        const that = this;

        //

        function layoutTick() {
            if (cntTicks++ > that.data.coolDownTicks || (new Date()) - startTickTime > that.data.coolDownTime) {
                that.forceLayout.stop(); // Stop ticking graph
            }

            // Update nodes position
            nodes.attr('position', d => `${d.x} ${d.y || 0} ${d.z || 0}`);

            //Update links position
            links.attr('line', d => `start: ${d.source.x} ${d.source.y || 0} ${d.source.z || 0};  end: ${d.target.x} ${d.target.y || 0} ${d.target.z || 0}`);
        }
    }
});
