/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

// Extend d3 with force-3d functionality
var d3 = require('lodash').assign(require('d3'), require('d3-force-3d'));

// Include sprite and line-components
require('aframe-sprite-component');
require('aframe-line-component');

/**
 * 3D Force-Directed Graph component for A-Frame.
 */
AFRAME.registerComponent('forcegraph', {
  schema: {
	// Basic data
    jsonUrl: {type: 'asset'},
	width: 			{ type: 'number', default: 1 },
	height:			{ type: 'number', default: null }, // Auto-set to the same as width, if user does not specify otherwise
	depth:			{ type: 'number', default: null },
	
	// Network structure
    idField: {type: 'string', default: 'id'},
    valField: {type: 'string', default: 'val'},
    nameField: {type: 'string', default: 'name'},
    linkSourceField: {type: 'string', default: 'source'},
    linkTargetField: {type: 'string', default: 'target'},
	
	// Node rendering
    nodeRelSize: {type: 'number', default: 4}, // volume per val unit
	nodeMinSize: 	{ type: 'number', default: 0.1 },
	nodeMaxSize: 	{ type: 'number', default: 1 },
    autoColorBy: {type: 'string', default: ''}, // color nodes with the same field equally
    colorField: {type: 'string', default: 'color'},
	nodeColor: { type:'color', default: '#ffffaa' },
	nodeOpacity: { type:'number', default: 0.75 },
	nodeSpriteSrc: { type:'asset', default: null },
	nodeSpriteResize: { type:'vec3', default: {x:1, y:1, z:1} },
	
	showLabels: { type: 'boolean', default: false },
	labelColor: { type:'color', default: '#ffffaa' },
	labelScaleFactor: { type:'number', default: 0.5 },
	
	// Link rendering
    lineOpacity: {type: 'number', default: null}, // Default is actually 0.2 (see below where the links are actually drawn) but we set to null here so we can detect if the user has specified a value
	varyLineOpacity: {type: 'boolean',default:false},
	lineColor: {type: 'color', default:'#f0f0f0'},
	
	// Force layout control
    warmupTicks: {type: 'int', default: 5}, // how many times to tick the force engine at init before starting to render. 5 ticks as default lets the stats.scaleX/Y/Z functions work more accurately.
    cooldownTicks: {type: 'int', default: Infinity},
    cooldownTime: {type: 'int', default: (AFRAME.utils.device.isMobile() ?  2500 : 15000)} // ms
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

	this.data.height = this.data.height || this.data.width;
	this.data.depth = this.data.depth || this.data.width;
	
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
    } // Parsed the JSON 


    // Feed data to force-directed layout
	// We need to do this early so we can get initial x/y/z coords for the nodes
    elData.forceLayout
        .stop()
        .alpha(1)// re-heat the simulation
        .nodes(elData.nodes)
        .force('link')
            .id(function(d) { return d[elData.idField] })
            .links(elData.links);
			
	// Calc min/max stats and prepare scaling functions to scale graph coordinates into AFrame world
	var stats = calcStats(elData);

	
    // Add children entities
    var d3El = d3.select(this.el);
	
	var useSprite = elData.nodeSpriteSrc;
	
    var d3Nodes = d3El.selectAll(useSprite ?'a-sprite.node' : 'a-sphere.node')
        .data(elData.nodes, function(d) { return d[elData.idField] });
    d3Nodes.exit().remove();

	if (useSprite) {
		d3Nodes = d3Nodes.merge(
			d3Nodes.enter()
				.append('a-entity')
				.classed('node', true)
				.attr('sprite', function(d){ return 'src: ' + elData.nodeSpriteSrc + '; resize: ' + 
				AFRAME.utils.coordinates.stringify({x: elData.nodeSpriteResize.x * stats.scaleNodeValue(d[elData.valField]),
				y: elData.nodeSpriteResize.x * stats.scaleNodeValue(d[elData.valField]),
				z: elData.nodeSpriteResize.x})})
				
		);
		
	} else { // Use sphere 
		d3Nodes = d3Nodes.merge(
			d3Nodes.enter()
				.append('a-sphere')
				.classed('node', true)
				.attr('segments-width', AFRAME.utils.device.isMobile () ? 3 : 8)	// Lower geometry resolution to improve perf
				.attr('segments-height', AFRAME.utils.device.isMobile () ? 3 : 8)
				.attr('radius', function(d) {return stats.scaleNodeValue(d[elData.valField])})
				.attr('color', function(d) {return d[elData.colorField] ? ('#' + d[elData.colorField]).toString(16) : elData.nodeColor })
				.attr('opacity', elData.nodeOpacity)
				.on('mouseenter', function(d) {
				  elData.tooltipEl.attr('value', d[elData.nameField] || '');
				})
				.on('mouseleave', function() {
				  elData.tooltipEl.attr('value', '');
				})
		);
	} // render nodes as sprite or sphere
	
	// Shall we construct node labels?
	var d3Nodelabels = null;
	if (elData.showLabels) {
		d3Nodelabels = d3El.selectAll('a-entity.nodelabel').data(elData.nodes, function(d) {return "label_" +d[elData.idField]});
		d3Nodelabels.exit().remove();
		d3Nodelabels = d3Nodelabels.merge(
			d3Nodelabels.enter()
				.append('a-entity')
				.classed('nodelabel', true)

		);
	}

    var d3Links = d3El.selectAll('a-entity.link')
        .data(elData.links, function(d) { return d.id });

    d3Links.exit().remove();

    d3Links = d3Links.merge(
        d3Links.enter()
            .append('a-entity')
            .classed('link', true)

    );


	// Initial ticks before starting to render
    for (var i=0; i<elData.warmupTicks; i++) { elData.forceLayout.tick(); } 
	
	// Refresh min/max values after the warmup ticks. Now the nodes are closer to their final resting position, so it is good to recalculate scaling here.
	stats = calcStats(elData);

	
    var cntTicks = 0;
    var startTickTime = new Date();
	
	// Run the simulation
    elData.forceLayout.on('tick', layoutTick).restart();


    function layoutTick() {
		
		if (cntTicks++ > elData.cooldownTicks || (new Date()) - startTickTime > elData.cooldownTime) {
		elData.forceLayout.stop(); // Stop ticking graph
		}

		// Update nodes position
		d3Nodes.attr('position', function(d) { return [stats.scaleX(d.x), stats.scaleY(d.y) || 0, stats.scaleZ(d.z) || 0].join(' ') });
		
		// Update node label positions
		if (d3Nodelabels) {
			var yOffsetFactor = useSprite? 0.8 : 1.45; 
			d3Nodelabels.attr('text', function(d) { return "value:" + (d[elData.nameField] || d[elData.idField])  + "; side:double; color:" + elData.labelColor +" ; align:center"})
					// Move the label down 150% of the radius away from the center of the sphere
					.attr('position', function(d) { return [stats.scaleX(d.x), (stats.scaleY(d.y)-yOffsetFactor*stats.scaleNodeValue(d[elData.valField]) ) || 0, stats.scaleZ(d.z) || 0].join(" ")}) 
					.attr('scale', function (d) {  return [elData.width * elData.labelScaleFactor + (3*(stats.scaleNodeV01(d[elData.valField]))) , elData.height * elData.labelScaleFactor +(3*(stats.scaleNodeV01(d[elData.valField]))) , 1].join(" ")})
		}	  
		
		//Update links position
		d3Links.attr('line', function(d) { 
			var opa = (elData.varyLineOpacity ? 
							(elData.lineOpacity  || (((AFRAME.utils.device.isMobile()?0.05:0.05) + stats.scaleLinkValue(d[elData.valField])) || 0.2))
							:
							(elData.lineOpacity || 0.2)) ;
			var st = [stats.scaleX(d.source.x), stats.scaleY(d.source.y || 0), stats.scaleZ(d.source.z || 0)].join(' ');
			var en = [stats.scaleX(d.target.x), stats.scaleY(d.target.y || 0), stats.scaleZ(d.target.z || 0)].join(' ');
			return 'opacity:' + opa + '; color:' + elData.lineColor + '; start:' + st + '; end:' + en;
		});
    }
  }
});



function calcStats(data){
	// Find min and max values for all axes
	var stats = {};

	// It seems this function is called once, somehow, one time while data.links.length==0. Then gets called again a moment later when data.links.length>0
	if (!data || !data.links || !data.nodes || data.links.length==0 || data.nodes.length==0){
		//console.warn("No links/nodes defined?!");
		return null;
	}
	
	stats.minX = d3.min(data.nodes, function (d) { return d.x });
	stats.minY = d3.min(data.nodes, function (d) { return d.y });
	stats.minZ = d3.min(data.nodes, function (d) { return d.z });
	stats.maxX = d3.max(data.nodes, function (d) { return d.x });
	stats.maxY = d3.max(data.nodes, function (d) { return d.y });
	stats.maxZ = d3.max(data.nodes, function (d) { return d.z });
	
	
	if (data.links[0][data.valField]) {
		stats.linkMinVal  = d3.min(data.links, function(d){ return d[data.valField]});
		stats.linkMaxVal  = d3.max(data.links, function(d){ return d[data.valField]});
		stats.scaleLinkValue = d3.scaleLinear().domain([stats.linkMinVal, stats.linkMaxVal]).range([0.05, 1]);
		
	} else {
		stats.linkMinVal  = 0
		stats.linkMaxVal  = 1;
		stats.scaleLinkValue = function() {return null};
	}
	
	if (data.nodes[0][data.valField]) {
		stats.minV = d3.min(data.nodes, function(d){ return d[data.valField]});
		stats.maxV = d3.max(data.nodes, function(d){ return d[data.valField]});
		
		var maxSize = data.nodeMaxSize || stats.maxX * data.nodeRelSize;
		var minSize = Math.min(maxSize, data.nodeMinSize || (stats.minX * data.nodeRelSize));
		
		stats.scaleNodeValueD3 = d3.scaleLinear().domain([stats.minV, stats.maxV]).range([minSize, maxSize]);
		stats.scaleNodeValue = function(v){ return  isFinite(v) ? stats.scaleNodeValueD3(v) : minSize; };
		stats.scaleNodeV01D3 = d3.scaleLinear().domain([stats.minV, stats.maxV]).range([0,1])
		stats.scaleNodeV01 = function(v){ return  isFinite(v) ? stats.scaleNodeV01D3(v) : 1; };
	} else {
	
		stats.scaleNodeValueD3 = function() { return data.width / 2 / 20 * data.nodeRelSize }; // Default = 0.25
		stats.scaleNodeValue = function() { return data.width / 2 / 20 * data.nodeRelSize}; // Default = 0.25
		stats.scaleNodeV01 = function() { return 1 };
	}
	
	// Functions to re-scale d3 chart coordinates into the AFrame object bounding box, centered at the entity position
	stats.scaleX = d3.scaleLinear().domain([stats.minX, stats.maxX]).range([-data.width/2, data.width/2])
	stats.scaleY = d3.scaleLinear().domain([stats.minY, stats.maxY]).range([-data.height/2, data.height/2])
	stats.scaleZ = d3.scaleLinear().domain([stats.minZ, stats.maxZ]).range([-data.depth/2, data.depth/2])

	return stats;
} // end calcStats()



/*
 This just let users write a a nice <a-forcegraph src="mydata.json"></a-forcegraph>" AFrame component. They can also use the classic <a-entity forcegraph="src:mydata.json"></a-entity>" style.
 */
AFRAME.registerPrimitive('a-forcegraph', {
	defaultComponents: {
		forcegraph: {}
	},
	mappings: {
		// Basic data
		jsonurl: 		'forcegraph.jsonUrl',
		width: 			'forcegraph.width',
		height: 		'forcegraph.height',
		depth: 			'forcegraph.depth',
		
		// Link rendering
		lineopacity:	'forcegraph.lineOpacity',
		varylineopacity:'forcegraph.varyLineOpacity',
		linecolor:		'forcegraph.lineColor',
		
		// Network structure
		idfield:	 	'forcegraph.idField',
		valfield:	 	'forcegraph.valField',
		namefield: 		'forcegraph.nameField',
		linksourcefield: 	'forcegraph.linkSourceField',
		linktargetfield: 	'forcegraph.linkTargetField',
		
		// Node rendering
		noderelsize:	'forcegraph.nodeRelSize',
		nodeminsize:	'forcegraph.nodeMinSize',
		nodemaxsize:	'forcegraph.nodeMaxSize',
		nodespritesrc:	'forcegraph.nodeSpriteSrc',
		nodespriteresize:'forcegraph.nodeSpriteResize',
		colorfield: 	'forcegraph.colorField',
		autocolorby: 	'forcegraph.autoColorBy',
		nodecolor:      'forcegraph.nodeColor',
		nodeopacity:      'forcegraph.nodeOpacity',

		showlabels:     'forcegraph.showLabels',
		labelcolor:		'forcegraph.labelColor',
		labelscalefactor:'forcegraph.labelScaleFactor',
		
		// Force layout control
		warmupticks: 	'forcegraph.warmUpTicks',
		cooldownticks:	'forcegraph.cooldownTicks',
		cooldowntime: 	'forcegraph.cooldownTime'
		
		
	}
})

