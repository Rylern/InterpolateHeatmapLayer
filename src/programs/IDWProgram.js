import { Matrix } from '../matrix.js';
import { isWebGL2, createVertexShader, createFragmentShader, createProgram, createBuffer } from '../webgl-utils.js';


/**
 * A program that can draw the results of the Inverse Distance Weighting algorithm
 * on a texture.
 * 
 * Take a look at the {@link https://en.wikipedia.org/wiki/Inverse_distance_weighting|Wikipedia page}
 * of the algorithm to see the formula of the IDW. Basically, the value of a pixel at a position x is given by:
 * 
 * u(x) = sum(wi * ui, 0<i<N+1) / sum(wi, 0<i<N+1), with wi = 1 / distance(x, xi)^p
 * 
 * where N is the number of known data points, ui is the value of the ith point, xi is the position of the ith point, and p
 * is a parameter that can be set (see the constructor).
 * 
 * When drawing, this program performs N renders on a texture. Each render stores wi * ui in its pixels' red component and
 * wi in its pixels' green component. Each render is added to the previous one, so, at the end, the texture contains
 * sum(wi * ui, 0<i<N+1) in its pixels' red component and sum(wi, 0<i<N+1) in its pixels' green component.
 * 
 * If fasterPointRadius is true (see constructor), the blue component of the pixels of the rendered texture will store a number equal to 0
 * if the pixel is located away from all points (by a user-defined value). Otherwise, the blue component will be greater
 * than 0.
 */
export class IDWProgram {

    #gl;
    #framebufferWidth;
    #framebufferHeight;
    #points;
    #pointsDistance;
    #p;
    #fasterPointRadius;
    #program;
    #position;
    #ui;
    #xi;
    #uP;
    #framebufferSize;
    #mvpMatrixInverse;
    #pointRadius;
    #xiImageSpace;
    #uFasterPointRadius;
    #verticesBuffer;
    #verticesNumber;
    #texture;
    #framebuffer;

    /**
     * Create and initialize the program.
     * 
     * @param {WebGLRenderingContext | WebGL2RenderingContext} gl the WebGL context to use
     * @param {number} textureWidth the width the resulting texture should have
     * @param {number} textureHeight the height the resulting texture should have
     * @param {number[][]} points the known data points. Each point is an array of numbers of size 3 containing the
     *                            x mercator coordinate, the y mercator coordinate, and the value of the point scaled
     *                            between 0 and 1
     * @param {number[]} pointsDistance a distance (in meters) for each known data point. If options.fasterPointRadius is
     * true, pixels that are located away by this distance from every known data point will have a blue component value of 0
     * @param {number} p the p parameter of the IDW formula (see above)
     * @param {boolean} fasterPointRadius whether to indicate pixels located away from all points
     */
    constructor(gl, textureWidth, textureHeight, points, pointsDistance, p, fasterPointRadius) {
        this.#gl = gl;
        this.#framebufferWidth = textureWidth;
        this.#framebufferHeight = textureHeight;
        this.#points = points;
        this.#pointsDistance = pointsDistance;
        this.#p = p;
        this.#fasterPointRadius = fasterPointRadius;

        this.#createProgram();
        this.#createAttributes();
        this.#createBuffers();
        this.#createTexture();
        this.#createFramebuffer();
    }

    /**
     * Set the size of the resulting texture.
     * 
     * @param {number} textureWidth the new width of the resulting texture
     * @param {number} textureHeight the new height of the resulting texture
     */
    setTextureSize(textureWidth, textureHeight) {
        this.#framebufferWidth = textureWidth;
        this.#framebufferHeight = textureHeight;

        this.#setTextureSize();
    }

    /**
     * Free memory used by this program.
     */
    delete() {
        this.#gl.deleteTexture(this.#texture);
        this.#gl.deleteBuffer(this.#verticesBuffer);
        this.#gl.deleteFramebuffer(this.#framebuffer);
    }

    /**
     * Draw the IDW on the texture returned by {@link getTexture}.
     * 
     * @param {Float32Array} mvpMatrix the model view projection matrix of the map (one-dimensional with colunm-major
     * order)
     */
    draw(mvpMatrix) {
        this.#gl.disable(this.#gl.DEPTH_TEST);
        this.#gl.enable(this.#gl.BLEND);
        this.#gl.blendFunc(this.#gl.ONE, this.#gl.ONE);

        this.#gl.useProgram(this.#program);
        this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, this.#framebuffer);
        this.#gl.viewport(0, 0, this.#framebufferWidth, this.#framebufferHeight);
        this.#gl.clear(this.#gl.COLOR_BUFFER_BIT);

        this.#gl.uniform1f(this.#uP, this.#p);
        this.#gl.uniform2f(this.#framebufferSize, this.#framebufferWidth, this.#framebufferHeight);
        if (this.#fasterPointRadius) {
            this.#gl.uniform1i(this.#uFasterPointRadius, 1);
            this.#gl.uniformMatrix4fv(this.#mvpMatrixInverse, false, Matrix.inverse(mvpMatrix));
        }

        for (let i=0; i<this.#points.length; i++) {
            const point = this.#points[i];

            const xiImageSpace = Matrix.dot(mvpMatrix, new Float32Array([point[0], point[1], 0, 1]));
            this.#gl.uniform2f(this.#xiImageSpace, xiImageSpace[0] / xiImageSpace[3], xiImageSpace[1] / xiImageSpace[3]);
            this.#gl.uniform1f(this.#ui, point[2]);
            this.#gl.uniform2f(this.#xi, point[0], point[1]);
            this.#gl.uniform1f(this.#pointRadius, this.#pointsDistance[i]);

            this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#verticesBuffer);
            this.#gl.enableVertexAttribArray(this.#position);
            this.#gl.vertexAttribPointer(this.#position, 2, this.#gl.FLOAT, false, 0, 0);

            this.#gl.drawArrays(this.#gl.TRIANGLE_STRIP, 0, this.#verticesNumber);
        }
    }

    /**
     * @returns {WebGLTexture} the texture which was drawn by {@link draw}
     */
    getTexture() {
        return this.#texture;
    }

    /**
     * Update the known data points and their distances.
     * 
     * @param {number[][]} points see the constructor of the class
     * @param {number[]} pointsDistance see the constructor of the class
     */
    updatePointsAndDistances(points, pointsDistance) {
        this.#points = points;
        this.#pointsDistance = pointsDistance;
    }

    #createProgram() {
        this.#program = createProgram(
            this.#gl,
            createVertexShader(this.#gl, require('../shaders/idw/vertex.glsl')),
            createFragmentShader(this.#gl, require('../shaders/idw/fragment.glsl'))
        );
    }

    #createAttributes() {
        this.#position = this.#gl.getAttribLocation(this.#program, 'position');

        this.#ui = this.#gl.getUniformLocation(this.#program, "ui");
        this.#xi = this.#gl.getUniformLocation(this.#program, "xi");
        this.#uP = this.#gl.getUniformLocation(this.#program, "p");
        this.#framebufferSize = this.#gl.getUniformLocation(this.#program, "framebufferSize");
        this.#mvpMatrixInverse = this.#gl.getUniformLocation(this.#program, "mvpMatrixInverse");
        this.#pointRadius = this.#gl.getUniformLocation(this.#program, "pointRadius");
        this.#xiImageSpace = this.#gl.getUniformLocation(this.#program, "xiImageSpace");
        this.#uFasterPointRadius = this.#gl.getUniformLocation(this.#program, "fasterPointRadius");
    }

    #createBuffers() {
        this.#verticesBuffer = createBuffer(
            this.#gl,
            this.#gl.ARRAY_BUFFER,
            new Float32Array([1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0])
        );
        this.#verticesNumber = 4;
    }

    #createTexture() {
        this.#texture = this.#gl.createTexture();
        this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#texture);

        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_S, this.#gl.CLAMP_TO_EDGE);
        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_T, this.#gl.CLAMP_TO_EDGE);
        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MAG_FILTER, this.#gl.NEAREST);
        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MIN_FILTER, this.#gl.NEAREST);
        this.#setTextureSize();

        this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    }

    #createFramebuffer() {
        this.#framebuffer = this.#gl.createFramebuffer();
        this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, this.#framebuffer);
        this.#gl.framebufferTexture2D(this.#gl.FRAMEBUFFER, this.#gl.COLOR_ATTACHMENT0, this.#gl.TEXTURE_2D, this.#texture, 0);
        this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    }

    #setTextureSize() {
        this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#texture);
        this.#gl.texImage2D(
            this.#gl.TEXTURE_2D,
            0,
            isWebGL2(this.#gl) ? this.#gl.RGBA32F : this.#gl.RGBA,
            this.#framebufferWidth,
            this.#framebufferHeight,
            0,
            this.#gl.RGBA,
            this.#gl.FLOAT,
            null
        );
    }
}