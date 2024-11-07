import { MaskProgram } from './programs/MaskProgram.js';
import { DrawingProgram } from './programs/DrawingProgram.js';
import { isWebGL2 } from './webgl-utils.js';
import { MercatorCoordinate  } from './mercator-coordinate.js';
import { IDWProgram } from './programs/IDWProgram.js';


/**
 * A class to render interpolate heatmaps on the provided WebGL context
 */
export class InterpolateLayer {

    #options;
    #canvas;
    #points;
    #pointsDistance;
    #roi;
    #average;
    #maskProgram;
    #idwProgram;
    #drawingProgram;

    /**
     * Create the layer. This will not initialize the layer yet (see {@link init})
     * 
     * @param {InterpolateHeatmapLayerOptions} options the options to customize the appearance of the layer
     */
    constructor(options) {
        this.#options = options;
    }

    /**
     * Initialize the layer. This will load extensions, pre-process points,
     * and initialize the underlying programs.
     * 
     * @param {WebGLRenderingContext | WebGL2RenderingContext} gl the WebGL context to use
     * @param {HTMLCanvasElement} canvas the canvas to draw to
     */
    init(gl, canvas) {
        this.#canvas = canvas;

        this.#loadExtensions(gl);
        this.#createPointsDistanceAverageAndRoi();

        this.#maskProgram = new MaskProgram(
            gl,
            this.#canvas.width,
            this.#canvas.height,
            this.#points,
            this.#pointsDistance,
            this.#roi
        );
        this.#idwProgram = new IDWProgram(
            gl,
            Math.ceil(this.#canvas.width * this.#options.framebufferFactor),
            Math.ceil(this.#canvas.height * this.#options.framebufferFactor),
            this.#points,
            this.#pointsDistance,
            this.#options.p,
            this.#options.pointRadius > 0 && this.#options.fasterPointRadius
        );
        this.#drawingProgram = new DrawingProgram(
            gl,
            !this.#options.fasterPointRadius && this.#points.length == this.#pointsDistance.length,
            this.#options.opacity,
            this.#options.valueToColor,
            this.#options.valueToColor4,
            this.#average,
            this.#options.averageThreshold,
            this.#options.layerBlendingFactor,
            this.#options.mapBlendingFactor
        );
    }

    /**
     * Resize the underlying framebuffers. This is needed each time the canvas is resized.
     */
    resizeFramebuffer() {
        this.#idwProgram.setTextureSize(
            Math.ceil(this.#canvas.width * this.#options.framebufferFactor),
            Math.ceil(this.#canvas.height * this.#options.framebufferFactor)
        );
    }

    /**
     * Free memory used by the layer.
     */
    delete() {
        this.#maskProgram.delete();
        this.#idwProgram.delete();
        this.#drawingProgram.delete();
    }

    /**
     * Render textures needed to draw the layer.
     * 
     * @param {Float32Array} mvpMatrix the model view projection matrix of the map (one-dimensional with colunm-major
     * order)
     */
    preRender(mvpMatrix) {
        this.#maskProgram.draw(mvpMatrix);
        this.#idwProgram.draw(mvpMatrix);
    }

    /**
     * Draw the layer.
     * 
     * @param {Float32Array} mvpMatrix the model view projection matrix of the map (one-dimensional with colunm-major
     * order)
     */
    render(mvpMatrix) {
        this.#drawingProgram.draw(
            mvpMatrix,
            this.#maskProgram.getTexture(),
            this.#idwProgram.getTexture(),
            this.#canvas.width,
            this.#canvas.height
        );
    }

    /**
     * Update points displayed by the layer.
     * 
     * @param {HeatmapPoint} points the new points to visualize
     */
    updatePoints(points) {
        this.#options.points = points;
        this.#createPointsDistanceAverageAndRoi();
        this.#maskProgram.updatePointsAndDistances(this.#points, this.#pointsDistance);
        this.#idwProgram.updatePointsAndDistances(this.#points, this.#pointsDistance);
    }

    #loadExtensions(gl) {
        const extensions = [];

        if (isWebGL2(gl)) {
            extensions.push('EXT_color_buffer_float', 'EXT_float_blend');
        } else {
            extensions.push('OES_texture_float', 'WEBGL_color_buffer_float', 'EXT_float_blend');
        }

        for (let extension of extensions) {
            if (!gl.getExtension(extension)) {
                console.error("WebGL extension " + extension + " not supported by this browser. The interpolate heatmap layer might not work properly.");
            }
        }
    }

    #createPointsDistanceAverageAndRoi() {
        this.#points = [];
        this.#pointsDistance = [];
        this.#average = 0;

        let minValue = Infinity;
        let maxValue = -Infinity;

        for (let point of this.#options.points) {
            const mercatorCoordinates = new MercatorCoordinate(point.lat, point.lon);

            this.#points.push([mercatorCoordinates.getX(), mercatorCoordinates.getY(), point.val]);
            if (this.#options.pointRadius > 0) {
                this.#pointsDistance.push(mercatorCoordinates.meterInMercatorCoordinateUnits() * this.#options.pointRadius);
            }

            if (point.val < minValue) {
                minValue = point.val;
            }
            if (point.val > maxValue) {
                maxValue = point.val;
            }
        }

        minValue = minValue < this.#options.minValue ? minValue : this.#options.minValue;
        maxValue = maxValue > this.#options.maxValue ? maxValue : this.#options.maxValue;

        for (let point of this.#points) {
            point[2] = (point[2] - minValue) / (maxValue - minValue);
            this.#average += point[2];
        }
        this.#average /= this.#points.length;

        this.#roi = this.#options.roi
            .map(roiCoordinate => {
                const mercator = new MercatorCoordinate(roiCoordinate.lat, roiCoordinate.lon);
                return [mercator.getX(), mercator.getY()];
            });
    }
}