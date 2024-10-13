import { createVertexShader, createFragmentShader, createProgram, createBuffer } from '../webgl-utils.js';

/**
 * A program that renders the heatmap layer on pixels determined by a mask and based on values
 * determined by a IDW texture.
 * 
 * The heatmap layer can be drawn on top of the Mapbox map. If that's the case, then pixels of the
 * layer are blended with pixels of the map. The resulting color of a pixel is given by:
 * 
 * color = (layerColor * layerBlendingFactor) + (mapColor * mapBlendingFactor)
 * 
 * where layerBlendingFactor and mapBlendingFactor can be specified (see the constructor). A list
 * of possible values can be found in https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc#constants.
 */
export class DrawingProgram {

    #gl;
    #areCirclesDrawn;
    #opacity;
    #valueToColor;
    #valueToColor4;
    #average;
    #averageThreshold;
    #layerBlendingFactor;
    #mapBlendingFactor;
    #program;
    #position;
    #mvpMatrix;
    #maskTexture;
    #idwTexture;
    #screenSize;
    #circlesDrawn;
    #uOpacity;
    #uAverage;
    #uAverageThreshold;
    #verticesBuffer;
    #numberOfVertices;

    /**
     * Create and initialize the program.
     * 
     * @param {WebGLRenderingContext | WebGL2RenderingContext} gl the WebGL context to use
     * @param {boolean} areCirclesDrawn whether circles were drawn on the mask
     * @param {number} opacity the opacity of the layer (between 0 and 1)
     * @param {string} valueToColor a GLSL function (passed as a string) that maps a value to the
     * layer color. The function must be named valueToColor with a float parameter (which will take
     * values between 0 and 1), and must return a vec3 (with each component between 0 and 1).
     * @param {string} valueToColor4 Same as valueToColor, but with alpha channel support. The
     * function name and signature must be defined as: vec4 valueToColor4(float value, float defaultOpacity).
     * @param {number} average the average value of the known data points scaled between 0 and 1
     * @param {number} averageThreshold number defining a threshold. If the distance between a point's value and
     * the average value of all points is below this threshold, the heatmap won't appear at this point
     * @param {GLenum} layerBlendingFactor the blending factor to apply to the heatmap layer
     * @param {GLenum} mapBlendingFactor the blending factor to apply to the map
     */
    constructor(gl, areCirclesDrawn, opacity, valueToColor, valueToColor4, average, averageThreshold, layerBlendingFactor, mapBlendingFactor) {
        this.#gl = gl;
        this.#areCirclesDrawn = areCirclesDrawn;
        this.#opacity = opacity;
        this.#valueToColor = valueToColor;
        this.#valueToColor4 = valueToColor4;
        this.#average = average;
        this.#averageThreshold = averageThreshold;
        this.#layerBlendingFactor = layerBlendingFactor;
        this.#mapBlendingFactor = mapBlendingFactor;

        this.#createProgram();
        this.#createAttributes();
        this.#createBuffers();
    }

    /**
     * Free memory used by this program.
     */
    delete() {
        this.#gl.deleteBuffer(this.#verticesBuffer);
    }

    /**
     * Draw the mask on the texture returned by {@link getTexture}.
     * 
     * @param {Float32Array} mvpMatrix the model view projection matrix of the map (one-dimensional with colunm-major
     * order)
     * @param {WebGLTexture} maskTexture a texture that indicates where the heatmap should be displayed (as described by
     * {@link MaskProgram})
     * @param {WebGLTexture} idwTexture a texture that contains the results of the IDW algorithm (as described by
     * {@link IDWProgram})
     * @param {number} width the width of the rexture to draw to
     * @param {number} height the canvas to draw to
     */
    draw(mvpMatrix, maskTexture, idwTexture, width, height) {
        this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
        this.#gl.viewport(0, 0, width, height);

        this.#gl.enable(this.#gl.DEPTH_TEST);
        this.#gl.enable(this.#gl.BLEND);
        this.#gl.blendFunc(this.#layerBlendingFactor, this.#mapBlendingFactor);

        this.#gl.useProgram(this.#program);

        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#verticesBuffer);
        this.#gl.enableVertexAttribArray(this.#position);
        this.#gl.vertexAttribPointer(this.#position, 2, this.#gl.FLOAT, false, 0, 0);
        this.#gl.uniformMatrix4fv(this.#mvpMatrix, false, mvpMatrix);

        this.#gl.activeTexture(this.#gl.TEXTURE0);
        this.#gl.bindTexture(this.#gl.TEXTURE_2D, maskTexture);
        this.#gl.uniform1i(this.#maskTexture, 0);

        this.#gl.activeTexture(this.#gl.TEXTURE1);
        this.#gl.bindTexture(this.#gl.TEXTURE_2D, idwTexture);
        this.#gl.uniform1i(this.#idwTexture, 1);

        this.#gl.uniform2f(this.#screenSize, width, height);
        this.#gl.uniform1i(this.#circlesDrawn, this.#areCirclesDrawn);
        this.#gl.uniform1f(this.#uOpacity, this.#opacity);
        this.#gl.uniform1f(this.#uAverageThreshold, this.#averageThreshold);
        this.#gl.uniform1f(this.#uAverage, this.#average);

        this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, this.#numberOfVertices);
    }

    #createProgram() {
        this.#program = createProgram(
            this.#gl,
            createVertexShader(this.#gl, require('../shaders/drawing/vertex.glsl')),
            createFragmentShader(
                this.#gl,
                require('../shaders/drawing/fragment.glsl')
                    .replace('VALUE_TO_COLOR', this.#valueToColor)
                    .replace('VALUE_TO_COLOR_4', this.#valueToColor4)
            )
        );
    }

    #createAttributes() {
        this.#position = this.#gl.getAttribLocation(this.#program, 'position');
        this.#mvpMatrix = this.#gl.getUniformLocation(this.#program, 'mvpMatrix');

        this.#maskTexture = this.#gl.getUniformLocation(this.#program, 'maskTexture');
        this.#idwTexture = this.#gl.getUniformLocation(this.#program, 'idwTexture');
        this.#screenSize = this.#gl.getUniformLocation(this.#program, 'screenSize');
        this.#circlesDrawn = this.#gl.getUniformLocation(this.#program, 'circlesDrawn');
        this.#uOpacity = this.#gl.getUniformLocation(this.#program, 'opacity');
        this.#uAverage = this.#gl.getUniformLocation(this.#program, 'average');
        this.#uAverageThreshold = this.#gl.getUniformLocation(this.#program, 'averageThreshold');
    }

    #createBuffers() {
        this.#verticesBuffer = createBuffer(
            this.#gl,
            this.#gl.ARRAY_BUFFER,
            new Float32Array([1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0])
        );
        this.#numberOfVertices = 4;
    }
}