const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const { terser } = require('rollup-plugin-terser');

module.exports = [
  {
    // CommonJS config
    input: 'src/index.js',
    output: {
      file: 'cjs/zesty.js',
      format: 'cjs',
      indent: false
    },
    plugins: [resolve(), commonjs(), babel()]
  },
  {
    // ESModule config
    input: 'src/index.js',
    output: {
      file: 'es/zesty.js',
      format: 'es',
      indent: false
    },
    plugins: [resolve(), commonjs(), babel()]
  },
  {
    // ESModule for browser config
    input: 'src/index.js',
    output: {
      file: 'es/zesty.mjs',
      format: 'es',
      indent: false
    },
    plugins: [
      resolve(),
      commonjs(),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ]
  },
  {
    // UMD dev config
    input: 'src/index.js',
    output: {
      file: 'umd/zesty.js',
      format: 'umd',
      indent: false,
      name: 'Zesty'
    },
    plugins: [resolve(), babel({ exclude: 'node_modules/**' }), commonjs()]
  },
  {
    // UMD config
    input: 'src/index.js',
    output: {
      file: 'umd/zesty.min.js',
      format: 'umd',
      indent: false,
      name: 'Zesty'
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({ exclude: 'node_modules/**' }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ]
  }
];
