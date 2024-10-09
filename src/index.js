import { InterpolateLayer } from './interpolate-layer.js';


/**
 * Create the interpolate heatmap layer with the provided options.
 * 
 * @param {InterpolateHeatmapLayerOptions} options the options to customize the appearance of the layer 
 * @returns {CustomLayerInterface} the interpolate heatmap layer
 */
export function create(options) {
    const _options = {
        layerId: '',
        opacity: 0.5,
        minValue: Infinity,
        maxValue: -Infinity,
        p: 3,
        framebufferFactor: 0.3,
        points: [],
        roi: [],
        averageThreshold: 0,
        valueToColor: `
            vec3 valueToColor(float value) {
                return vec3(max((value-0.5)*2.0, 0.0), 1.0 - 2.0*abs(value - 0.5), max((0.5-value)*2.0, 0.0));
            }
        `,
        valueToColor4: `
            vec4 valueToColor4(float value, float defaultOpacity) {
                return vec4(valueToColor(value), defaultOpacity);
            }
        `,
        pointRadius: 0,
        fasterPointRadius: false,
        layerBlendingFactor: WebGLRenderingContext.SRC_ALPHA,
        mapBlendingFactor: WebGLRenderingContext.ONE_MINUS_SRC_ALPHA
    }

    if (typeof options === 'object'){
        for(let option in options) {
            _options[option] = options[option];
        }
    }

    const interpolateLayer = new InterpolateLayer(_options);

    return {
        id: _options.layerId,
        type: 'custom',
        onAdd: function (map, gl) {
            interpolateLayer.init(gl, map._canvas);

            this.resizeFramebuffer = () => {
                interpolateLayer.resizeFramebuffer();
            }
            map.on('resize', this.resizeFramebuffer);
        },
        onRemove: function (map, gl) {
            interpolateLayer.delete();
            map.off('resize', this.resizeFramebuffer);
        },
        prerender: function (gl, matrix) {
            interpolateLayer.preRender(matrix);
        },  
        render: function (gl, matrix) {
            interpolateLayer.render(matrix);
        },
        updatePoints: function (points) {
            interpolateLayer.updatePoints(points);
        }
    };
}