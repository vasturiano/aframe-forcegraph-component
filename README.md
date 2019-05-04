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
| dag-mode             | Apply layout constraints based on the graph directionality. Only works for [DAG](https://en.wikipedia.org/wiki/Directed_acyclic_graph) graph structures (without cycles). Choice between `td` (top-down), `bu` (bottom-up), `lr` (left-to-right), `rl` (right-to-left), `zout` (near-to-far), `zin` (far-to-near), `radialout` (outwards-radially) or `radialin` (inwards-radially). | |
| dag-level-distance   | If `dag-mode` is engaged, this specifies the distance between the different graph depths.                                  | *auto-derived from the number of nodes* |
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
| link-visibility      | Link object accessor function, attribute or a boolean constant for whether to display the link line. A value of `false` maintains the link force without rendering it. | true          |
| link-label           | Link object accessor function or attribute for name (shown in label).                                                      | name          |
| link-desc            | Link object accessor function or attribute for description (shown under label).                                            | desc          |
| link-hover-precision | Whether to display the link label when gazing the link closely (low value) or from far away (high value).                  | 2             |
| link-color           | Link object accessor function or attribute for line color.                                                                 | color         |
| link-auto-color-by   | Link object accessor function (`fn(link)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects links without a color attribute. |               |
| link-opacity         | Line opacity of links, between [0,1].                                                                                      | 0.2           |
| link-width           | Link object accessor function, attribute or a numeric constant for the link line width. A value of zero will render a [ThreeJS Line](https://threejs.org/docs/#api/objects/Line) whose width is constant (`1px`) regardless of distance. Values are rounded to the nearest decimal for indexing purposes. | 0 |
| link-resolution      | Geometric resolution of each link, expressed in how many radial segments to divide the cylinder. Higher values yield smoother cylinders. Applicable only to links with positive width. | 6 |
| link-curvature       | Link object accessor function, attribute or a numeric constant for the curvature radius of the link line. Only applicable to links using [ThreeJS Line](https://threejs.org/docs/#api/objects/Line) (`0` width). Curved lines are represented as 3D bezier curves, and any numeric value is accepted. A value of `0` renders a straight line. `1` indicates a radius equal to half of the line length, causing the curve to approximate a semi-circle. For self-referencing links (`source` equal to `target`) the curve is represented as a loop around the node, with length proportional to the curvature value. Lines are curved clockwise for positive values, and counter-clockwise for negative values. Note that rendering curved lines is purely a visual effect and does not affect the behavior of the underlying forces. | 0 |
| link-curve-rotation  | Link object accessor function, attribute or a numeric constant for the rotation along the line axis to apply to the curve. Has no effect on straight lines. At `0` rotation, the curve is oriented in the direction of the intersection with the `XY` plane. The rotation angle (in radians) will rotate the curved line clockwise around the "start-to-end" axis from this reference orientation. | 0 |
| link-material        | Link object accessor function or attribute for specifying a custom material to style the graph links with. Should return an instance of [ThreeJS Material](https://threejs.org/docs/#api/materials/Material). If a <i>falsy</i> value is returned, the default material will be used instead for that link. | *default link material is [MeshLambertMaterial](https://threejs.org/docs/#api/materials/MeshLambertMaterial) styled according to `color` and `opacity`.* |
| link-three-object    | Link object accessor function or attribute for generating a custom 3d object to render as graph links. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). If a <i>falsy</i> value is returned, the default 3d object type will be used instead for that link.  | *default link object is a line or cylinder, sized according to `width` and styled according to `material`.* |
| link-position-update | Getter/setter for the custom function to call for updating the position of links at every render iteration. It receives the respective link `ThreeJS Object3d`, the `start` and `end` coordinates of the link (`{x,y,z}` each), and the link's `data`. If the function returns a truthy value, the regular position update function will not run for that link. | |
| link-directional-arrow-length     | Link object accessor function, attribute or a numeric constant for the length of the arrow head indicating the link directionality. The arrow is displayed directly over the link line, and points in the direction of `source` > `target`. A value of `0` hides the arrow. | 0 |
| link-directional-arrow-color      | Link object accessor function or attribute for the color of the arrow head. | color |
| link-directional-arrow-rel-pos    | Link object accessor function, attribute or a numeric constant for the longitudinal position of the arrow head along the link line, expressed as a ratio between `0` and `1`, where `0` indicates immediately next to the `source` node, `1` next to the `target` node, and `0.5` right in the middle. | 0.5 |
| link-directional-arrow-resolution | Getter/setter for the geometric resolution of the arrow head, expressed in how many slice segments to divide the cone base circumference. Higher values yield smoother arrows. | 8 |
| link-directional-particles           | Link object accessor function, attribute or a numeric constant for the number of particles (small spheres) to display over the link line. The particles are distributed equi-spaced along the line, travel in the direction `source` > `target`, and can be used to indicate link directionality. | 0 |
| link-directional-particle-speed      | Link object accessor function, attribute or a numeric constant for the directional particles speed, expressed as the ratio of the link length to travel per frame. Values above `0.5` are discouraged. | 0.01 |
| link-directional-particle-width      | Link object accessor function, attribute or a numeric constant for the directional particles width. Values are rounded to the nearest decimal for indexing purposes. | 0.5 |
| link-directional-particle-color      | Link object accessor function or attribute for the directional particles color.                            | color |
| link-directional-particle-resolution | Geometric resolution of each directional particle, expressed in how many slice segments to divide the circumference. Higher values yield smoother particles. | 4 |
| on-node-center-hover | Callback function for node hover events at the center of the viewport. The node object (or `null` if there's no node under the central line of sight) is included as the first argument, and the previous node object (or null) as second argument. ||
| on-link-center-hover | Callback function for link hover events at the center of the viewport. The link object (or `null` if there's no link under the central line of sight) is included as the first argument, and the previous link object (or null) as second argument. ||
| force-engine         | Which force-simulation engine to use ([*d3*](https://github.com/vasturiano/d3-force-3d) or [*ngraph*](https://github.com/anvaka/ngraph.forcelayout)).  | d3             |
| d3-alpha-decay       | [Simulation intensity decay](https://github.com/vasturiano/d3-force-3d#simulation_alphaDecay) parameter, only applicable if using the d3 simulation engine. | 0.0228 |
| d3-velocity-decay    | Nodes' [velocity decay](https://github.com/vasturiano/d3-force-3d#simulation_velocityDecay) that simulates the medium resistance, only applicable if using the d3 simulation engine. | 0.4 |
| warmup-ticks         | How many times to tick the force simulation engine at ignition before starting to render.                                  | 0             |
| cooldown-ticks       | How many times to tick the force simulation engine after rendering begins before stopping and freezing the engine.         | Infinity      |
| cooldown-time        | How long (ms) to tick the force simulation engine for after rendering begins before stopping and freezing the engine.      | 15000         |
| on-engine-tick       | Callback function invoked at every tick of the simulation engine. ||
| on-engine-stop       | Callback function invoked when the simulation engine stops and the layout is frozen. ||

There are also internal methods that can be invoked via the [components object](https://aframe.io/docs/0.8.0/core/component.html#accessing-a-component%E2%80%99s-members-and-methods):

| Method | Arguments | Description |
| --- | --- | --- |
| d3Force | id: <i>string</i>, [force: <i>function</i>] | Getter/setter for the internal forces that control the d3 simulation engine. Follows the same interface as `d3-force-3d`'s [simulation.force](https://github.com/vasturiano/d3-force-3d#simulation_force). Three forces are included by default: `'link'` (based on [forceLink](https://github.com/vasturiano/d3-force-3d#forceLink)), `'charge'` (based on [forceManyBody](https://github.com/vasturiano/d3-force-3d#forceManyBody)) and `'center'` (based on [forceCenter](https://github.com/vasturiano/d3-force-3d#forceCenter)). Each of these forces can be reconfigured, or new forces can be added to the system. This method is only applicable if using the d3 simulation engine. |
| refresh | - | Redraws all the nodes/links and reheats the force simulation engine. |

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/0.8.2/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-forcegraph-component/dist/aframe-forcegraph-component.min.js"></script>
</head>

<body>
  <a-scene>
    <a-camera></a-camera>
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

## Giving Back

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url) If this project has helped you and you'd like to contribute back, you can always [buy me a ☕](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url)!
