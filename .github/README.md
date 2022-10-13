# InterpolateHeatmapLayer

InterpolateHeatmapLayer is a JavaScript library for rendering temperature maps (or interpolate heatmaps) with [Mapbox GJ JS](https://docs.mapbox.com/mapbox-gl-js/guides/). This library was inspired by the [temperature-map-gl](https://github.com/ham-systems/temperature-map-gl) library and depends on [Earcut](https://github.com/mapbox/earcut).

Currently, Mapbox provides a heatmap layer that represent the **density** of points in an area, like on this picture:

![Density heatmap](images/densityHeatmap.png)

This library aims at providing a heatmap that can define a color to any location by making an **average** of the values of the surroundings points, like on this picture:

![Average heatmap](images/averageHeatmap.png)

Except a JavaScript pre-processing step, all computation is made with WebGL shaders.

## Examples

A live demo showing the global temperature is available [here](https://rylern.github.io/TemperatureMap/), described [here](https://github.com/Rylern/TemperatureMap).

## Install

* Browser:

  * Copy the [interpolateHeatmapLayer.js](https://github.com/Rylern/InterpolateHeatmapLayer/blob/main/dist/interpolateHeatmapLayer.js) file to your project.

  * Import the library before the script using it:

    ```html
    <body>
        <div id="map"></div>
        <script src="interpolateHeatmapLayer.js"></script>
        <script src="map.js"></script>
    </body>
    ```

  * Create the Mapbox map and add the layer created by `interpolateHeatmapLayer.create()`:

  ```javascript
  // map.js
  
  const map = (window.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10'
  }));
      
  map.on('load', () => {
      const layer = interpolateHeatmapLayer.create({
          // parameters here
      });
      map.addLayer(layer);
  });
  ```


* NPM:

  ```bash
  npm install interpolateheatmaplayer
  ```

  ```javascript
  const interpolateHeatmapLayer = require('interpolateheatmaplayer');
  
  const map = (window.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10'
  }));
      
  map.on('load', () => {
      const layer = interpolateHeatmapLayer.create({
          // parameters here
      });
      map.addLayer(layer);
  });
  ```

## Usage

The `interpolateHeatmapLayer.create()` function has one object parameter containing the following properties:

* `points`: An list of points, each point being an object containing a latitude `lat`, a longitude `lon`, and a value `val`. Example:

  ```javascript
  points = [{
    lat: 62.470663,
    lon: 6.176846,
    val: 16
  },
  {
    lat: 48.094903,
    lon: -1.371596,
    val: 20
  }];
  ```

  Since Mapbox uses the Web Mercator projection that projects the poles at infinity, remember to define the latitude within -85° and 85°. Default value: `[]`.

* `layerID`: string defining the unique [Mapbox layer](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#id) name. Default value: `''`.

* `opacity`: number between 0 and 1 describing the transparency of the layer. Default value: `0.5`.

* `minValue`: number defining the value corresponding to the blue color. When it's not defined, the lowest value of `points` is represented by the blue color. If some value of `points` is lower than `minValue`, `minValue` takes this value. Default value: `Infinity`.

* `maxValue` same, but for the red color. Default value: `-Infinity`.

* `p`: number affecting the computation of the color. A high value makes the color uniform around each point. Take a look at the form of the IDW in the technical explanation part if you want to know more. Default value: `3`.

* `pointRadius`: number defining a radius (in meters). The color will only appear within circles of radius `pointRadius` centered at the points defined in `points`. If `pointsRadius <= 0`, this parameter is not taken into account. Default value: `0`.

* `fasterPointRadius`: boolean indicating if a faster algorithm should be used when defining a `pointRadius > 0`. Due to precision issues, this parameter creates bad visualizations if `pointRadius < 500`. Default value: `false`.

* `roi`: list of coordinates with the same format as `points` (without the `val` attribute). It defines the region of interest, meaning the layer will only be displayed inside that area. If the list is empty, the entire map is the region of interest. This parameter is not taken into account if `pointRadius > 0`. Default value: `[]`.

* `averageThreshold`: number defining a threshold. For each point of the map, if the distance between the point's value and the average value of all points is below this threshold, the associated color will be transparent. The values and the average are scaled between 0 and 1 when computing their distance, so `averageThreshold` is a value between 0 and 1. For example, if you have `points` with values [0, 5, 10], and you create the layer with these parameters:

  ```javascript
  const layer = interpolateHeatmapLayer.create({
      points: points
      averageThreshold: 0.1
  });
  ```

  Then all points with values between 4 and 6 will be transparent.

* `framebufferFactor`: number between 0 and 1. In short, if the framebuffer factor is around 0, the computation will be faster but with a lower resolution. Take a look at the technical explanation part if you want to know exactly what this parameter is. Default value: `0.3`.

* `valueToColor`: [GLSL](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language) function (passed as a string) that maps a value to the layer color. By default, a low value is colored blue, a medium green and a high red. This parameter allows you to change this behavior. The function must be named `valueToColor` with a `float` parameter (which will take values between 0 and 1), and must return a ` vec3` (with each component between 0 and 1). Default value:

  ```glsl
  vec3 valueToColor(float value) {
    return vec3(max((value-0.5)*2.0, 0.0), 1.0 - 2.0*abs(value - 0.5), max((0.5-value)*2.0, 0.0));
  }
  ```

* `valueToColor4`: Same as `valueToColor`, but with alpha channel support. The function name and signature must be defined as: `vec4 valueToColor4(float value, float defaultOpacity)`. Default value:

  ```glsl
  vec4 valueToColor4(float value, float defaultOpacity) {
      return vec4(valueToColor(value), defaultOpacity);
  }
  ```

The `layer` returned by the `interpolateHeatmapLayer.create()` function has also one function: `layer.updatePoints(points)`, in which `points` is an array of points as described above (objects with `lat`, `lon`, and `val` attributes). This function allows you to change the points without creating a new layer. Usage example:

```javascript
const layer = interpolateHeatmapLayer.create({
  points: somePoints
});
// some code
layer.updatePoints(newPoints);
```

## Technical explanation

The color is computed using the [Inverse Distance Weighting](https://en.wikipedia.org/wiki/Inverse_distance_weighting) (IDW) algorithm:

Let:

![equation](https://latex.codecogs.com/gif.latex?%5B%28x_1%2C%20u1%29%2C%20...%2C%20%28x_N%2C%20u_N%29%5D)

be *N* known data points. We want to find a continuous and once differentiable function:

![equation](https://latex.codecogs.com/gif.latex?u%28x%29%3A%20x%20%5Crightarrow%20R)

such as:

![equation](https://latex.codecogs.com/gif.latex?%5Cforall%20i%20%5Cin%20%5B1%2C%20N%5D%2C%20u%28x_i%29%20%3D%20u_i)

The basic form of the IDW is:

![equation](https://latex.codecogs.com/gif.latex?u%28x%29%20%3D%20%5Cleft%5C%7B%20%5Cbegin%7Barray%7D%7Bll%7D%20%5Cfrac%7B%5Csum_%7Bi%3D1%7D%5E%7BN%7D%20%5Comega_i%20u_i%7D%7B%5Csum_%7Bi%3D1%7D%5E%7BN%7D%20%5Comega_i%7D%20%26%20%5Cmbox%7Bif%20%7D%20%5Cforall%20i%20%5Cin%20%5B1%2C%20N%5D%2C%20d%28x%2C%20x_i%29%20%5Cneq%200%20%5C%5C%20u_i%20%26%20%5Cmbox%7Belse.%7D%20%5Cend%7Barray%7D%20%5Cright.)

where

![equation](https://latex.codecogs.com/gif.latex?%5Comega_i%28x%29%20%3D%20%5Cfrac%7B1%7D%7Bd%28x%2C%20x_i%29%5Ep%7D)

In WebGL:

* First, we render *N* textures. Each fragment of each texture contains *wi\*ui* in its red channel and *wi* in its green channel. These textures are blended to create one single texture containing the sum of the *N* textures. We can get u(x) for each fragment by dividing the red channel by the green channel.
* Then, a shader determines which pixels are covered by the layer using the `roi` and `pointRadius` parameters. It also determines the color of each pixel by using the previous texture. This shader is rendered onto a new texture.
* Finally, this last texture is passed to the shader rendering the layer.

The second and third steps cannot be merged into a single one because of blending. Indeed, blending should not be used in step 2, but it is required to use it in step 3 to see the map below the layer.

The size of the computation textures is the size of the rendering texture multiplied by the `framebufferFactor`. This factor can be below 0.5 without any real visual consequences. If the user has defined a region of interest and uses a `framebufferFactor` < 1, visual artifacts appear at the edge of the layer. To prevent this, the rendering texture takes the whole screen size if `framebufferFactor` < 1.