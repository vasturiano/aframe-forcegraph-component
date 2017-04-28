## aframe-forcegraph-component

[![Version](http://img.shields.io/npm/v/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)
[![License](http://img.shields.io/npm/l/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)

A 3D Force-Directed Graph component for [A-Frame](https://aframe.io).

<p align="center">
     <img width="80%" src="http://gist.github.com/vasturiano/972ca4f3e8e074dacf14d7071aad8ef9/raw/preview.png"></a>
</p>

An A-Frame entity component to represent a graph data structure in a VR environment using a force-directed iterative layout.
Uses [d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the layout physics engine.

See also the [standalone VR component version](https://github.com/vasturiano/3d-force-graph-vr).

### API

| Property           | Description                                                                                                                | Default Value |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| json-url           | URL of JSON file containing graph data. Should contain an object with two list properties: *nodes* and *links*             |        	// Basic data
| width              | Width (X-dimension) of object in AFrame units                                                                              | 3             |
| height             | Height (Y-dimension) of object in AFrame units                                                                             | width         |
| depth              | Width (Z-dimension) of object in AFrame units                                                                              | width         |
| node-rel-size      | Node sphere volume per val unit, relative to 1/20th of [width]                                                             | 1             |
| node-min-size      | Node sphere miniumum value. If node-max-size is specified, this value defaults to 10% of node-max-size                     | 0             |
| node-max-size      | Node sphere maximum volume. If specified, node-rel-size is ignored and nodes are linearly scaled in [nodeMin, nodeMax]     | Infinity      |
| node-color         | Node sphere color. Ignored if auto-color-by is specified                                                                   | #ffffaa       |
| node-opacity       | Node sphere opacity                                                                                                        | 0.75          |
| node-sprite-src    | Render nodes using this image sprite, instead of as a sphere                                                               | none          |
| node-sprite-resize | Resize scaling for the node sprite                                                                                         | "0.1 0.1 0.1" |
| color-field        | Node object field name referring to node value (affects sphere color)                                                      | color         |
| line-opacity       | Opacity of links                                                                                                           | 0.2           |
| line-color         | Color of links                                                                                                             | #f0f0f0       |
| vary-line-opacity  | If true and links in the JSON have a val-field, line opacity will be linearly scaled according to val-field                | false         |
| auto-color-by      | Node field to automatically group colors by (if the node doesn't already have a color property set)                        |               |
| id-field           | Node object field name referring to unique node id (used in link objects source/target)                                    | id            |
| val-field          | Node object field name referring to node value (affects sphere volume)                                                     | val           |
| name-field         | Node object field name referring to node name (shown in label)                                                             | name          |
| label-color        | Label color                                                                                                                | #ffffaa       |
| label-scale-factor | Label scaling factor                                                                                                       | 0.5           |
| link-source-field  | Link object field name referring to id of source node                                                                      | source        |
| link-target-field  | Link object field name referring to id of target node                                                                      | target        |
| warmup-ticks       | How many times to tick the force simulation engine at ignition before starting to render                                   | 0             |
| cooldown-ticks     | How many times to tick the force simulation engine after rendering begins before stopping and freezing the engine          | Infinity      |
| cooldown-time      | Max time (ms) to run force simulation. Default=3000 on mobile, 15000 otherwise                                             | 15000         |



A note about the size of the object in AFrame space. Because the bounding box of the graph changes we do not know at the outset how to scale the node coordinates such that they will fit into a width x heigth x depth cube after the force layout is complete. You may have to play with the width and depth a bit to get the correct sizing. Or set warmup-ticks to 5 or 10 or so, so that the scaling is set up closer to the final resting layout.

Uses tizzle's [aframe-sprite-component](https://github.com/tizzle/aframe-sprite-component).

Text is rendered using "a-text". This gives high quality text, but creates lots of polygons. A future improvement could be to investigate text-as-texture intead (ie. render text to canvas)


### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/0.5.0/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-forcegraph-component/dist/aframe-forcegraph-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity forcegraph="json-url: myGraphData.json"></a-entity>

	<!-- Alternatively, you can use it as a primititve. In this case, ignore the hyphens from the API property -->
    <a-forcegraph jsonUrl="myGraphData.json"></a-forcegraph>
	
  </a-scene>
</body>
```

<!-- If component is accepted to the Registry, uncomment this. -->
<!--
Or with [angle](https://npmjs.com/package/angle/), you can install the proper
version of the component straight into your HTML file, respective to your
version of A-Frame:

```sh
angle install aframe-forcegraph-component
```
-->

#### npm

Install via npm:

```bash
npm install aframe-forcegraph-component
```

Then require and use.

```js
require('aframe');
require('aframe-forcegraph-component');
```
