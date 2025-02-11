import resolve from '@rollup/plugin-node-resolve';
import commonJs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from "@rollup/plugin-terser";
import pkg from './package.json' with { type: 'json' };

const umdConf = {
  format: 'umd',
  globals: { aframe: 'AFRAME', three: 'THREE' }, // a-frame exposes three as global
  banner: `// Version ${pkg.version} ${pkg.name} - ${pkg.homepage}`
};

export default [
  {
    external: ['three', 'aframe'],
    input: 'src/index.js',
    output: [
      {
        ...umdConf,
        file: `dist/${pkg.name}.js`,
        sourcemap: true,
      },
      { // minify
        ...umdConf,
        file: `dist/${pkg.name}.min.js`,
        plugins: [terser({
          output: { comments: '/Version/' }
        })]
      }
    ],
    plugins: [
      resolve(),
      commonJs(),
      babel({ exclude: 'node_modules/**' })
    ]
  },
  { // ES module
    input: 'src/index.js',
    output: [
      {
        format: 'es',
        file: `dist/${pkg.name}.mjs`
      }
    ],
    external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)],
    plugins: [
      babel()
    ]
  }
];