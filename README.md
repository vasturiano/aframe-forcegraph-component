## aframe-forcegraph-component

[![Version](http://img.shields.io/npm/v/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)
[![License](http://img.shields.io/npm/l/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)

A 3D Force-Directed Graph component for [A-Frame](https://aframe.io).

<p align="center">
     <img width="80%" src="https://vasturiano.github.io/aframe-forcegraph-component/examples/large-graph/preview.png"></a>
</p>

An A-Frame entity component to represent a graph data structure in a VR environment using a force-directed iterative layout.
Uses [three-forcegraph](https://github.com/vasturiano/three-forcegraph) as the underlying ThreeJS component to manage the graph object.

See also the [standalone VR component version](https://github.com/vasturiano/3d-force-graph-vr).

### API

| Property             | Description                                                                                                                | Default Value |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| json-url             | URL of JSON file to load graph data directly from. Will override content of the *nodes* and *links* component properties so either use one or the other. JSON should contain an object with two list properties: *nodes* and *links*.  |               |
| nodes                | List of node objects. *Example*: ```[{"id": 1, "name": "first"}, {"id": 2, "name": "second"}]```                           | []            |
| links                | List of link objects. *Example*: ```[{"source": 1, "target": 2}]```                                                        | []            |
| num-dimensions       | Number of dimensions to run the force simulation on (1, 2 or 3).                                                           | 3             |
| node-rel-size        | Node sphere volume per value unit.                                                                                         | 4             |
| node-id              | Node object accessor attribute for unique node id (used in link objects source/target).                                    | id            |
| node-label           | Node object accessor function or attribute for name (shown in label).                                                      | name          |
| node-desc            | Node object accessor function or attribute for description (shown under label).                                            | desc          |
| node-val             | Node object accessor function, attribute or a numeric constant for the node numeric value (affects sphere volume).         | val           |
| node-resolution      | Geometric resolution of each node, expressed in how many slice segments to divide the circumference. Higher values yield smoother spheres. | 8 |
| node-color           | Node object accessor function or attribute for node color (affects sphere color).                                          | color         |
| node-auto-color-by   | Node object accessor function (`fn(node)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects nodes without a color attribute. |               |
| node-opacity         | Nodes sphere opacity, between [0,1].                                                                                       | 0.75          |
| node-three-object    | Node object accessor function or attribute for generating a custom 3d object to render as graph nodes. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). If a <i>falsy</i> value is returned, the default 3d object type will be used instead for that node.  | *default node object is a sphere, sized according to `val` and styled according to `color`.* |
| link-source          | Link object accessor attribute referring to id of source node.                                                             | source        |
| link-target          | Link object accessor attribute referring to id of target node.                                                             | target        |
| link-label           | Link object accessor function or attribute for name (shown in label).                                                      | name          |
| link-desc            | Link object accessor function or attribute for description (shown under label).                                            | desc          |
| link-hover-precision | Whether to display the link label when gazing the link closely (low value) or from far away (high value).                  | 2             |
| link-color           | Link object accessor function or attribute for line color.                                                                 | color         |
| link-auto-color-by   | Link object accessor function (`fn(link)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects links without a color attribute. |               |
| link-opacity         | Line opacity of links, between [0,1].                                                                                      | 0.2           |
| force-engine         | Which force-simulation engine to use ([*d3*](https://github.com/vasturiano/d3-force-3d) or [*ngraph*](https://github.com/anvaka/ngraph.forcelayout)).  | d3             |
| d3-alpha-decay       | [Simulation intensity decay](https://github.com/vasturiano/d3-force-3d#simulation_alphaDecay) parameter, only applicable if using the d3 simulation engine. | 0.0228 |
| d3-velocity-decay    | Nodes' [velocity decay](https://github.com/vasturiano/d3-force-3d#simulation_velocityDecay) that simulates the medium resistance, only applicable if using the d3 simulation engine. | 0.4 |
| warmup-ticks         | How many times to tick the force simulation engine at ignition before starting to render.                                  | 0             |
| cooldown-ticks       | How many times to tick the force simulation engine after rendering begins before stopping and freezing the engine.         | Infinity      |
| cooldown-time        | How long (ms) to tick the force simulation engine for after rendering begins before stopping and freezing the engine.      | 15000         |

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/0.7.1/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-forcegraph-component/dist/aframe-forcegraph-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity forcegraph="json-url: myGraphData.json"></a-entity>
  </a-scene>
</body>
```

Or with [angle](https://npmjs.com/package/angle/), you can install the proper
version of the component straight into your HTML file, respective to your
version of A-Frame:

```sh
angle install aframe-forcegraph-component
```

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
