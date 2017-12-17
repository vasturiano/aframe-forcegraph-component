## aframe-forcegraph-component

[![Version](http://img.shields.io/npm/v/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)
[![License](http://img.shields.io/npm/l/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)

A 3D Force-Directed Graph component for [A-Frame](https://aframe.io).

<p align="center">
     <img width="80%" src="https://vasturiano.github.io/aframe-forcegraph-component/examples/large-graph/preview.png"></a>
</p>

An A-Frame entity component to represent a graph data structure in a VR environment using a force-directed iterative layout.
Uses [d3-force-3d](https://github.com/vasturiano/d3-force-3d) for the layout physics engine.

See also the [standalone VR component version](https://github.com/vasturiano/3d-force-graph-vr).

### API

| Property           | Description                                                                                                                | Default Value |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| json-url           | URL of JSON file to load graph data directly from. Will override content of the *nodes* and *links* component properties so either use one or the other. JSON should contain an object with two list properties: *nodes* and *links*.  |               |
| nodes              | List of node objects. *Example*: ```[{"id": 1, "name": "first"}, {"id": 2, "name": "second"}]```                           | []            |
| links              | List of link objects. *Example*: ```[{"source": 1, "target": 2}]```                                                        | []            |
| num-dimensions     | Number of dimensions to run the force simulation on (1, 2 or 3).                                                           | 3             |
| node-rel-size      | Node sphere volume per val unit.                                                                                           | 4             |
| node-resolution    | Geometric resolution of each node, expressed in how many slice segments to divide the circumference. Higher values yield smoother spheres. | 8 |
| line-opacity       | Opacity of links.                                                                                                          | 0.2           |
| auto-color-by      | Node object accessor function (`fn(node)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects nodes without a color attribute. |               |
| id-field           | Node object attribute name referring to unique node id (used in link objects source/target).                               | id            |
| val-field          | Node object accessor function, attribute or a numeric constant for the node numeric value (affects sphere volume).         | val           |
| name-field         | Node object accessor function or attribute for name (shown in label).                                                      | name          |
| desc-field         | Node object accessor function or attribute for description (shown under label).                                                      | name          |
| color-field        | Node object accessor function or attribute for node color (affects sphere color).                                          | color         |
| link-source-field  | Link object attribute name referring to id of source node.                                                                 | source        |
| link-target-field  | Link object attribute name referring to id of target node.                                                                 | target        |
| link-name-field    | Link object accessor function or attribute for name (shown in label).                                                      | name          |
| link-name-precision | Wether to display the link label when gazing the link closely (low value) or from far away (high value)                                                       | 2          |
| link-color-field   | Link object accessor function or attribute for line color.                                                                 | color         |
| force-engine       | Which force-simulation engine to use ([*d3*](https://github.com/vasturiano/d3-force-3d) or [*ngraph*](https://github.com/anvaka/ngraph.forcelayout)).  | d3             |
| warmup-ticks       | How many times to tick the force simulation engine at ignition before starting to render.                                  | 0             |
| cooldown-ticks     | How many times to tick the force simulation engine after rendering begins before stopping and freezing the engine.         | Infinity      |
| cooldown-time      | How much time (ms) to tick the force simulation engine after rendering begins before stopping and freezing the engine.     | 15000         |

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
