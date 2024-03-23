import { Matrix } from '../matrix.js';
import { isWebGL2, createVertexShader, createFragmentShader, createProgram } from '../webgl-utils.js';
import earcut from 'earcut';


export class ROI {
    constructor(gl, framebufferWidth, framebufferHeight, points, pointsDistance, average, options) {
        this.gl = gl;
        this.framebufferWidth = framebufferWidth;
        this.framebufferHeight = framebufferHeight;
        this.points = points;
        this.pointsDistance = pointsDistance;
        this.average = average;
        this.options = options;

        this.#createProgram();
        this.#createAttributes();
        this.#createBuffers();
        this.#createTexture();
        this.#createFramebuffer();
    }

    setFrameBufferSize(framebufferWidth, framebufferHeight) {
        this.framebufferWidth = framebufferWidth;
        this.framebufferHeight = framebufferHeight;

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            isWebGL2(this.gl) ? this.gl.RGBA32F : this.gl.RGBA,
            this.framebufferWidth,
            this.framebufferHeight,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            null
        );
    }

    delete() {
        this.gl.deleteTexture(this.texture);
        this.gl.deleteBuffer(this.verticesBuffer);
        this.gl.deleteBuffer(this.indicesBuffer);
        this.gl.deleteFramebuffer(this.framebuffer);
    }

    draw(mvpMatrix, idwTexture, canvas) {
        const fullTextureSize = this.options.roi.length > 0 && this.options.pointRadius == 0;
        const renderWidth = fullTextureSize ? canvas.width : this.framebufferWidth;
        const renderHeight = fullTextureSize ? canvas.height : this.framebufferHeight;

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            isWebGL2(this.gl) ? this.gl.RGBA32F : this.gl.RGBA,
            renderWidth,
            renderHeight,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            null
        );

        this.gl.disable(this.gl.BLEND);
        this.gl.disable(this.gl.DEPTH_TEST);

        this.gl.useProgram(this.program);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.viewport(0, 0, renderWidth, renderHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.uniformMatrix4fv(this.uMvpMatrix, false, mvpMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
        this.gl.enableVertexAttribArray(this.aPosition);
        this.gl.vertexAttribPointer(this.aPosition, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, idwTexture);
        this.gl.uniform1i(this.uIDWTexture, 0);
        this.gl.uniform2f(this.uFramebufferSize, renderWidth, renderHeight);
        this.gl.uniform1f(this.uOpacity, this.options.opacity);
        this.gl.uniform1f(this.uAverageThreshold, this.options.averageThreshold);
        this.gl.uniform1f(this.uAverage, this.average);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);

        if (this.options.pointRadius > 0 && !this.options.fasterPointRadius) {
            this.points.forEach((point, index) => {
                const modelMatrix = new Matrix();
                modelMatrix.translate(point[0], point[1], 0);
                modelMatrix.scale(this.pointsDistance[index], this.pointsDistance[index], 0);
                this.gl.uniformMatrix4fv(this.modelMatrix, false, modelMatrix.elements);
    
                this.gl.drawElements(this.gl.TRIANGLES, this.indicesNumber, this.gl.UNSIGNED_BYTE, 0);
            });
        } else {
            const modelMatrix = new Matrix();
            this.gl.uniformMatrix4fv(this.modelMatrix, false, modelMatrix.elements);
            this.gl.drawElements(this.gl.TRIANGLES, this.indicesNumber, this.gl.UNSIGNED_BYTE, 0);
        }
    }

    updatePointsAndDistances(points, pointsDistance) {
        this.points = points;
        this.pointsDistance = pointsDistance;
    }

    #createProgram() {
        const vertexSource = require('../shaders/roi/vertex.glsl');
        const fragmentSource = require('../shaders/roi/fragment.glsl')
            .replace('VALUE_TO_COLOR', this.options.valueToColor)
            .replace('VALUE_TO_COLOR_4', this.options.valueToColor4);
        const vertexShader =  createVertexShader(this.gl, vertexSource);
        const fragmentShader = createFragmentShader(this.gl, fragmentSource);

        this.program = createProgram(this.gl, vertexShader, fragmentShader);
    }

    #createAttributes() {
        this.aPosition = this.gl.getAttribLocation(this.program, 'a_Position');
        this.uMvpMatrix = this.gl.getUniformLocation(this.program, 'u_MvpMatrix');
        this.uIDWTexture = this.gl.getUniformLocation(this.program, 'u_IDWTexture');
        this.uFramebufferSize = this.gl.getUniformLocation(this.program, 'u_FramebufferSize');
        this.uOpacity = this.gl.getUniformLocation(this.program, 'u_Opacity');
        this.uAverageThreshold = this.gl.getUniformLocation(this.program, 'u_AverageThreshold');
        this.uAverage = this.gl.getUniformLocation(this.program, 'u_Average');
        this.modelMatrix = this.gl.getUniformLocation(this.program, 'modelMatrix');
    }

    #createBuffers() {
        const vertices = [];
        let indices = [];

        if (this.options.pointRadius > 0 && !this.options.fasterPointRadius) {
            const numberOfTriangles = 50;
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
        } else {
            if (this.options.roi.length == 0) {
                vertices.push(-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0);
            } else {
                this.options.roi.forEach(roi => {
                    const coordinates = mapboxgl.MercatorCoordinate.fromLngLat(roi);
                    vertices.push(coordinates.x, coordinates.y);
                });
            }
            indices = earcut(vertices);
        }
        
        this.verticesBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        this.indicesBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), this.gl.STATIC_DRAW);

        this.indicesNumber = indices.length;
    }

    #createTexture() {
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            isWebGL2(this.gl) ? this.gl.RGBA32F : this.gl.RGBA,
            this.framebufferWidth,
            this.framebufferHeight,
            0,
            this.gl.RGBA,
            this.gl.FLOAT,
            null
        );
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    #createFramebuffer() {
        this.framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
}
