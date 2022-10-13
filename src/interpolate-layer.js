import { IDW } from './programs/idw.js';
import { ROI } from './programs/roi.js';
import { Draw } from './programs/draw.js';

export class InterpolateLayer {
    constructor(options) {
        this.options = options;
    }

    init(gl, canvas) {
        this.canvas = canvas;

        if (!gl.getExtension('OES_texture_float') || !gl.getExtension('WEBGL_color_buffer_float') || !gl.getExtension('EXT_float_blend')) {
            throw("WebGL extension not supported");
        }

        this.#createPointsDistanceAndAverage();
        this.#setFramebufferSize();

        this.idw = new IDW(gl, this.framebufferWidth, this.framebufferHeight, this.points, this.pointsDistance, this.options);
        this.roi = new ROI(gl, this.framebufferWidth, this.framebufferHeight, this.points, this.pointsDistance, this.average, this.options);
        this.draw = new Draw(gl);
    }

    resizeFramebuffer() {
        this.#setFramebufferSize();
        this.idw.setFrameBufferSize(this.framebufferWidth, this.framebufferHeight);
        this.roi.setFrameBufferSize(this.framebufferWidth, this.framebufferHeight);   
    }

    delete() {
        this.idw.delete();
        this.roi.delete();
        this.draw.delete();
    }

    preRender(mvpMatrix) {
        this.idw.draw(mvpMatrix);
        this.roi.draw(mvpMatrix, this.idw.texture, this.canvas);
    }

    render(mvpMatrix) {
        this.draw.draw(mvpMatrix, this.canvas, this.roi.texture);
    }

    updatePoints(points) {
        this.options.points = points;
        this.#createPointsDistanceAndAverage();
        this.idw.updatePointsAndDistances(this.points, this.pointsDistance);
        this.roi.updatePointsAndDistances(this.points, this.pointsDistance);
    }

    #createPointsDistanceAndAverage() {
        this.points = [];
        this.pointsDistance = [];
        let minValue = Infinity;
        let maxValue = -Infinity;

        this.options.points.forEach(rawPoint => {
            const mercatorCoordinates = mapboxgl.MercatorCoordinate.fromLngLat(rawPoint);

            this.points.push([mercatorCoordinates.x, mercatorCoordinates.y, rawPoint.val]);
            this.pointsDistance.push(mercatorCoordinates.meterInMercatorCoordinateUnits() * this.options.pointRadius);

            if (rawPoint.val < minValue) {
                minValue = rawPoint.val;
            }
            if (rawPoint.val > maxValue) {
                maxValue = rawPoint.val;
            }
        });

        minValue = minValue < this.options.minValue ? minValue : this.options.minValue;
        maxValue = maxValue > this.options.maxValue ? maxValue : this.options.maxValue;

        this.average = 0;
        this.points.forEach(point => {
            point[2] = (point[2] - minValue) / (maxValue - minValue);
            this.average += point[2];
        });
        this.average /= this.points.length;
    }

    #setFramebufferSize() {
        this.framebufferWidth = Math.ceil(this.canvas.width * this.options.framebufferFactor);
        this.framebufferHeight = Math.ceil(this.canvas.height * this.options.framebufferFactor);
    }
}