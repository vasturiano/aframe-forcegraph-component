## aframe-forcegraph-component

[![Version](http://img.shields.io/npm/v/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)
[![License](http://img.shields.io/npm/l/aframe-forcegraph-component.svg?style=flat-square)](https://npmjs.org/package/aframe-forcegraph-component)

A 3D Force-Directed Graph component for [A-Frame](https://aframe.io).

<p align="center">
  <a href="https://vasturiano.github.io/aframe-forcegraph-component/examples/">
   <img width="80%" src="https://vasturiano.github.io/aframe-forcegraph-component/examples/large-graph/preview.png">
  </a>
</p>

An A-Frame entity component to represent a graph data structure in a VR environment using a force-directed iterative layout.
Uses [three-forcegraph](https://github.com/vasturiano/three-forcegraph) as the underlying ThreeJS component to manage the graph object.

See also the [VR](https://github.com/vasturiano/3d-force-graph-vr) and [AR](https://github.com/vasturiano/3d-force-graph-ar) standalone component versions.

### API

| Property             | Description                                                                                                                | Default Value |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| json-url             | URL of JSON file to load graph data directly from. Will override content of the *nodes* and *links* component properties so either use one or the other. JSON should contain an object with two list properties: *nodes* and *links*.  |               |
| nodes                | List of node objects. *Example*: ```[{"id": 1, "name": "first"}, {"id": 2, "name": "second"}]```                           | []            |
| links                | List of link objects. *Example*: ```[{"source": 1, "target": 2}]```                                                        | []            |
| num-dimensions       | Number of dimensions to run the force simulation on (1, 2 or 3).                                                           | 3             |
| dag-mode             | Apply layout constraints based on the graph directionality. Only works for [DAG](https://en.wikipedia.org/wiki/Directed_acyclic_graph) graph structures (without cycles). Choice between `td` (top-down), `bu` (bottom-up), `lr` (left-to-right), `rl` (right-to-left), `zout` (near-to-far), `zin` (far-to-near), `radialout` (outwards-radially) or `radialin` (inwards-radially). | |
| dag-level-distance   | If `dag-mode` is engaged, this specifies the distance between the different graph depths.                                  | *auto-derived from the number of nodes* |
| dag-node-filter      | Specify nodes to ignore during the DAG layout processing. This accessor method receives a node object and should return a `boolean` value indicating whether the node is to be included. | `node => true` |
| on-dag-error         | Callback to invoke if a cycle is encountered while processing the data structure for a DAG layout. The loop segment of the graph is included for information, as an array of node ids. By default an exception will be thrown whenever a loop is encountered. | *throws exception* |
| node-rel-size        | Node sphere volume per value unit.                                                                                         | 4             |
| node-id              | Node object accessor attribute for unique node id (used in link objects source/target).                                    | id            |
| node-val             | Node object accessor function, attribute or a numeric constant for the node numeric value (affects sphere volume).         | val           |
| node-resolution      | Geometric resolution of each node, expressed in how many slice segments to divide the circumference. Higher values yield smoother spheres. | 8 |
| node-visibility      | Node object accessor function, attribute or a boolean constant for whether to display the node. | true          |
| node-color           | Node object accessor function or attribute for node color (affects sphere color).                                          | color         |
| node-auto-color-by   | Node object accessor function (`fn(node)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects nodes without a color attribute. |               |
| node-opacity         | Nodes sphere opacity, between [0,1].                                                                                       | 0.75          |
| node-three-object    | Node object accessor function or attribute for generating a custom 3d object to render as graph nodes. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). If a <i>falsy</i> value is returned, the default 3d object type will be used instead for that node.  | *default node object is a sphere, sized according to `val` and styled according to `color`.* |
| node-three-object-extend  | Node object accessor function, attribute or a boolean value for whether to replace the default node when using a custom `nodeThreeObject` (`false`) or to extend it (`true`). | false |
| link-source          | Link object accessor attribute referring to id of source node.                                                             | source        |
| link-target          | Link object accessor attribute referring to id of target node.                                                             | target        |
| link-visibility      | Link object accessor function, attribute or a boolean constant for whether to display the link line. A value of `false` maintains the link force without rendering it. | true          |                                           | desc          |
| link-color           | Link object accessor function or attribute for line color.                                                                 | color         |
| link-auto-color-by   | Link object accessor function (`fn(link)`) or attribute (e.g. `'type'`) to automatically group colors by. Only affects links without a color attribute. |               |
| link-opacity         | Line opacity of links, between [0,1].                                                                                      | 0.2           |
| link-width           | Link object accessor function, attribute or a numeric constant for the link line width. A value of zero will render a [ThreeJS Line](https://threejs.org/docs/#api/objects/Line) whose width is constant (`1px`) regardless of distance. Values are rounded to the nearest decimal for indexing purposes. | 0 |
| link-resolution      | Geometric resolution of each link, expressed in how many radial segments to divide the cylinder. Higher values yield smoother cylinders. Applicable only to links with positive width. | 6 |
| link-curvature       | Link object accessor function, attribute or a numeric constant for the curvature radius of the link line. Curved lines are represented as 3D bezier curves, and any numeric value is accepted. A value of `0` renders a straight line. `1` indicates a radius equal to half of the line length, causing the curve to approximate a semi-circle. For self-referencing links (`source` equal to `target`) the curve is represented as a loop around the node, with length proportional to the curvature value. Lines are curved clockwise for positive values, and counter-clockwise for negative values. Note that rendering curved lines is purely a visual effect and does not affect the behavior of the underlying forces. | 0 |
| link-curve-rotation  | Link object accessor function, attribute or a numeric constant for the rotation along the line axis to apply to the curve. Has no effect on straight lines. At `0` rotation, the curve is oriented in the direction of the intersection with the `XY` plane. The rotation angle (in radians) will rotate the curved line clockwise around the "start-to-end" axis from this reference orientation. | 0 |
| link-material        | Link object accessor function or attribute for specifying a custom material to style the graph links with. Should return an instance of [ThreeJS Material](https://threejs.org/docs/#api/materials/Material). If a <i>falsy</i> value is returned, the default material will be used instead for that link. | *default link material is [MeshLambertMaterial](https://threejs.org/docs/#api/materials/MeshLambertMaterial) styled according to `color` and `opacity`.* |
| link-three-object    | Link object accessor function or attribute for generating a custom 3d object to render as graph links. Should return an instance of [ThreeJS Object3d](https://threejs.org/docs/index.html#api/core/Object3D). If a <i>falsy</i> value is returned, the default 3d object type will be used instead for that link.  | *default link object is a line or cylinder, sized according to `width` and styled according to `material`.* |
| link-three-object-extend  | Link object accessor function, attribute or a boolean value for whether to replace the default link when using a custom `linkThreeObject` (`false`) or to extend it (`true`). | false |
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
| on-node-hover | Callback function for node hover events, using any [raycaster based](https://aframe.io/docs/1.2.0/components/raycaster.html) controller. The node object (or `null` if there's no node directly on the ray) is included as the first argument, and the previous node object (or `null`) as second argument. ||
| on-link-hover | Callback function for link hover events, using any [raycaster based](https://aframe.io/docs/1.2.0/components/raycaster.html) controller. The link object (or `null` if there's no link directly on the ray) is included as the first argument, and the previous link object (or `null`) as second argument. ||
| on-node-click | Callback function for node click events. The node object is included as sole argument. ||
| on-link-click | Callback function for link click events. The link object is included as sole argument. ||
| force-engine         | Which force-simulation engine to use ([*d3*](https://github.com/vasturiano/d3-force-3d) or [*ngraph*](https://github.com/anvaka/ngraph.forcelayout)).  | d3             |
| d3-alpha-min         | [Simulation alpha min](https://github.com/vasturiano/d3-force-3d#simulation_alphaMin) parameter, only applicable if using the d3 simulation engine. | 0 |
| d3-alpha-decay       | [Simulation intensity decay](https://github.com/vasturiano/d3-force-3d#simulation_alphaDecay) parameter, only applicable if using the d3 simulation engine. | 0.0228 |
| d3-velocity-decay    | Nodes' [velocity decay](https://github.com/vasturiano/d3-force-3d#simulation_velocityDecay) that simulates the medium resistance, only applicable if using the d3 simulation engine. | 0.4 |
| ngraph-physics       | Specify custom physics configuration for ngraph, according to its [configuration object](https://github.com/anvaka/ngraph.forcelayout#configuring-physics) syntax. Only applicable if using the ngraph simulation engine. | *ngraph default* |
| warmup-ticks         | How many times to tick the force simulation engine at ignition before starting to render.                                  | 0             |
| cooldown-ticks       | How many times to tick the force simulation engine after rendering begins before stopping and freezing the engine.         | Infinity      |
| cooldown-time        | How long (ms) to tick the force simulation engine for after rendering begins before stopping and freezing the engine.      | 15000         |
| on-engine-tick       | Callback function invoked at every tick of the simulation engine. ||
| on-engine-stop       | Callback function invoked when the simulation engine stops and the layout is frozen. ||

There are also internal methods that can be invoked via the [components object](https://aframe.io/docs/0.8.0/core/component.html#accessing-a-component%E2%80%99s-members-and-methods):

| Method | Arguments | Description |
| --- | --- | --- |
| d3Force | id: <i>string</i>, [force: <i>function</i>] | Getter/setter for the internal forces that control the d3 simulation engine. Follows the same interface as `d3-force-3d`'s [simulation.force](https://github.com/vasturiano/d3-force-3d#simulation_force). Three forces are included by default: `'link'` (based on [forceLink](https://github.com/vasturiano/d3-force-3d#forceLink)), `'charge'` (based on [forceManyBody](https://github.com/vasturiano/d3-force-3d#forceManyBody)) and `'center'` (based on [forceCenter](https://github.com/vasturiano/d3-force-3d#forceCenter)). Each of these forces can be reconfigured, or new forces can be added to the system. This method is only applicable if using the d3 simulation engine. |
| d3ReheatSimulation | - | Reheats the force simulation engine, by setting the `alpha` value to `1`. Only applicable if using the d3 simulation engine. |
| emitParticle | link: <i>object</i> | An alternative mechanism for generating particles, this method emits a non-cyclical single particle within a specific link. The emitted particle shares the styling (speed, width, color) of the regular particle props. A valid `link` object that is included in `links` should be passed as a single parameter. |
| getGraphBbox | [nodeFilter: <i>function</i>] | Returns the current bounding box of the nodes in the graph, formatted as `{ x: [<num>, <num>], y: [<num>, <num>], z: [<num>, <num>] }`. If no nodes are found, returns `null`. Accepts an optional argument to define a custom node filter: `node => <boolean>`, which should return a truthy value if the node is to be included. This can be useful to calculate the bounding box of a portion of the graph. |
| refresh | - | Redraws all the nodes/links. |

### Installation

```js
import 'aframe';
import 'aframe-forcegraph-component';
```
or using a *script* tag
```html
<script src="//unpkg.com/aframe"></script>
<script src="//unpkg.com/aframe-forcegraph-component"></script>
```
then
```html
<body>
  <a-scene>
    <a-entity forcegraph="json-url: myGraphData.json"></a-entity>
  </a-scene>
</body>
```

## Giving Back

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url) If this project has helped you and you'd like to contribute back, you can always [buy me a ☕](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=L398E7PKP47E8&currency_code=USD&source=url)!
