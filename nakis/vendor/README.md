# Vendored tools

These local ES modules make the studio independent of CDNs and runtime package installation.

| Tool | Pinned source | Source blob SHA | License | Use |
| --- | --- | --- | --- | --- |
| bezier-easing | gre/bezier-easing v2.1.0, src/index.js | a25b94fb16d115a0e10e2c20e213cb8dc89d728b | MIT | Keyframe timing curves |
| simplify-js | mourner/simplify-js v1.2.4, simplify.js | 339c84f53d0dd81348774d4f8f691e36c7ca86b6 | BSD-2-Clause | Optional reduction of open SVG strokes |
| earcut | mapbox/earcut v3.0.2, src/earcut.js | 6c2ed21f5f4cd623ad2cb457ac2acc4c57210cfd | ISC | Triangle construction and shared-edge folding meshes |

Upstream algorithm bodies are retained. A local CommonJS `module` shim and `export default module.exports` adapt bezier-easing and simplify-js for browser ESM. Earcut is already ESM and is retained unchanged. License texts are next to the modules. No other external animation framework is required.

Evaluated alternatives: Theatre.js (a separate editor and project model), Motion (web UI animation), Tween.js (stateful tween playback). This studio retains time-based `renderAt(t)` so seeking, out-of-order rendering and offline frames all use the same geometry. Cubic Bézier interpolation fits that architecture directly.
