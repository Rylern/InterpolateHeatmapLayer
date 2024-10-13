import { Matrix } from '../matrix.js';
import { isWebGL2, createVertexShader, createFragmentShader, createProgram, createBuffer } from '../webgl-utils.js';
import earcut from 'earcut';


/**
 * A program that draws a mask on a texture indicating on pixels the heatmap should appear.
 * 
 * A red component of the resulting texture's pixels equal to 0 indicates that the heatmap
 * should not be displayed on that pixel.
 * 
 * If a distance for each know data point is supplied (see the constructor), a blue component of
 * the resulting texture's pixels equal to 0 indicates that the heatmap should not be displayed
 * on that pixel.
 */
export class MaskProgram {

    static #NUMBER_OF_TRIANGLES_IN_CIRCLE = 50;
    #gl;
    #framebufferWidth;
    #framebufferHeight;
    #circleModelMatrices;
    #roi;
    #program;
    #position;
    #mvpMatrix;
    #modelMatrix;
    #drawingCircles;
    #circlesBuffers;
    #roiBuffers;
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
     * @param {number[]} pointsDistance a distance (in meters) for each known data point. It indicates that the heatmap should
     * only appear on circles centered on the provided points and with radiuses these provided distances. Can be empty to not have
     * this behaviour
     * @param {number[][]} roi a list of points (each point being an array of numbers of size 2 containing the x mercator coordinate
     * and the y mercator coordinate) that defines a polygon on which the heatmap should be displayed. Can be empty to display the
     * heatmap on the entire map
     */
    constructor(gl, textureWidth, textureHeight, points, pointsDistance, roi) {
        this.#gl = gl;
        this.#framebufferWidth = textureWidth;
        this.#framebufferHeight = textureHeight;
        this.#roi = roi;

        this.#setCircleModelMatrices(points, pointsDistance);
        this.#createProgram();
        this.#createAttributes();
        this.#createRoiBuffer();
        this.#createCirclesBuffer();
        this.#createTexture();
        this.#createFramebuffer();
    }

    /**
     * Free memory used by this program.
     */
    delete() {
        this.#gl.deleteTexture(this.#texture);

        if (this.#circlesBuffers) {
            this.#gl.deleteBuffer(this.#circlesBuffers.vertexBuffer);
            this.#gl.deleteBuffer(this.#circlesBuffers.indexBuffer);
        }
        this.#gl.deleteBuffer(this.#roiBuffers.vertexBuffer);
        this.#gl.deleteBuffer(this.#roiBuffers.indexBuffer);

        this.#gl.deleteFramebuffer(this.#framebuffer);
    }

    /**
     * Draw the mask on the texture returned by {@link getTexture}.
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

        this.#gl.uniformMatrix4fv(this.#mvpMatrix, false, mvpMatrix);

        if (this.#circlesBuffers) {
            this.#drawCircles();
        }

        this.#drawRoi();
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
        this.#setCircleModelMatrices(points, pointsDistance);
        this.#createCirclesBuffer();
    }

    #setCircleModelMatrices(points, pointsDistance) {
        this.#circleModelMatrices = [];

        if (points.length == pointsDistance.length) {
            for (let i=0; i<points.length; i++) {
                const point = points[i];
                const pointDistance = pointsDistance[i];
    
                const modelMatrix = new Matrix();
                modelMatrix.translate(point[0], point[1], 0);
                modelMatrix.scale(pointDistance, pointDistance, 0);
    
                this.#circleModelMatrices.push(modelMatrix);
            }
        }
    }

    #createProgram() {
        this.#program = createProgram(
            this.#gl,
            createVertexShader(this.#gl, require('../shaders/mask/vertex.glsl')),
            createFragmentShader(this.#gl, require('../shaders/mask/fragment.glsl'))
        );
    }

    #createAttributes() {
        this.#position = this.#gl.getAttribLocation(this.#program, 'position');
        this.#mvpMatrix = this.#gl.getUniformLocation(this.#program, 'mvpMatrix');
        this.#modelMatrix = this.#gl.getUniformLocation(this.#program, 'modelMatrix');

        this.#drawingCircles = this.#gl.getUniformLocation(this.#program, 'drawingCircles');
    }

    #createCirclesBuffer() {
        if (this.#circlesBuffers) {
            this.#gl.deleteBuffer(this.#circlesBuffers.vertexBuffer);
            this.#gl.deleteBuffer(this.#circlesBuffers.indexBuffer);
        }
        this.#circlesBuffers = undefined;

        if (this.#circleModelMatrices.length > 0) {
            const vertices = [];
            const indices = [];

            const numberOfTriangles = MaskProgram.#NUMBER_OF_TRIANGLES_IN_CIRCLE;
            const angleStep = 2 * Math.PI / numberOfTriangles;
            vertices.push(0, 0);
            for (let i=0; i<numberOfTriangles+1; i++) {
                const angle = i * angleStep;
                const x = Math.cos(angle);
                const y = Math.sin(angle);

                vertices.push(x, y);
                if (i < numberOfTriangles) {
                    indices.push(0, i+1, i+2);
                }
            }

            this.#circlesBuffers = {
                vertexBuffer: createBuffer(this.#gl, this.#gl.ARRAY_BUFFER, new Float32Array(vertices)),
                indexBuffer: createBuffer(this.#gl, this.#gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices)),
                numberOfIndices: indices.length
            };
        }
    }

    #createRoiBuffer() {
        const vertices = [];
        if (this.#roi.length == 0) {
            vertices.push(1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0);
        } else {
            for (let roiCoordinate of this.#roi) {
                vertices.push(roiCoordinate[0], roiCoordinate[1]);
            }
        }
        const indices = earcut(vertices);
        
        this.#roiBuffers = {
            vertexBuffer: createBuffer(this.#gl, this.#gl.ARRAY_BUFFER, new Float32Array(vertices)),
            indexBuffer: createBuffer(this.#gl, this.#gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices)),
            numberOfIndices: indices.length
        };
    }

    #createTexture() {
        this.#texture = this.#gl.createTexture();
        this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#texture);

        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_S, this.#gl.CLAMP_TO_EDGE);
        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_T, this.#gl.CLAMP_TO_EDGE);
        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MAG_FILTER, this.#gl.NEAREST);
        this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MIN_FILTER, this.#gl.NEAREST);
        this.#gl.texImage2D(
            this.#gl.TEXTURE_2D,
            0,
            this.#gl.RGB,
            this.#framebufferWidth,
            this.#framebufferHeight,
            0,
            this.#gl.RGB,
            this.#gl.UNSIGNED_SHORT_5_6_5,
            null
        );

        this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    }

    #createFramebuffer() {
        this.#framebuffer = this.#gl.createFramebuffer();

        this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, this.#framebuffer);
        this.#gl.framebufferTexture2D(this.#gl.FRAMEBUFFER, this.#gl.COLOR_ATTACHMENT0, this.#gl.TEXTURE_2D, this.#texture, 0);
        this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    }

    #drawCircles() {
        this.#gl.uniform1i(this.#drawingCircles, 1);

        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#circlesBuffers.vertexBuffer);
        this.#gl.enableVertexAttribArray(this.#position);
        this.#gl.vertexAttribPointer(this.#position, 2, this.#gl.FLOAT, false, 0, 0);
        this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, this.#circlesBuffers.indexBuffer);

        for (let i=0; i<this.#circleModelMatrices.length; i++) {
            this.#gl.uniformMatrix4fv(this.#modelMatrix, false, this.#circleModelMatrices[i].getElements());

            this.#gl.drawElements(this.#gl.TRIANGLES, this.#circlesBuffers.numberOfIndices, this.#gl.UNSIGNED_BYTE, 0);
        }
    }

    #drawRoi() {
        this.#gl.uniform1i(this.#drawingCircles, 0);

        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#roiBuffers.vertexBuffer);
        this.#gl.enableVertexAttribArray(this.#position);
        this.#gl.vertexAttribPointer(this.#position, 2, this.#gl.FLOAT, false, 0, 0);
        this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, this.#roiBuffers.indexBuffer);

        this.#gl.uniformMatrix4fv(this.#modelMatrix, false, new Matrix().getElements());

        this.#gl.drawElements(this.#gl.TRIANGLES, this.#roiBuffers.numberOfIndices, this.#gl.UNSIGNED_BYTE, 0);
    }
}
