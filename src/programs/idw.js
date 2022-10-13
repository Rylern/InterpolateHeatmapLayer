import { Matrix } from '../matrix.js';
import { createVertexShader, createFragmentShader, createProgram } from '../webgl-utils.js';


export class IDW {
    constructor(gl, framebufferWidth, framebufferHeight, points, pointsDistance, options) {
        this.gl = gl;
        this.framebufferWidth = framebufferWidth;
        this.framebufferHeight = framebufferHeight;
        this.points = points;
        this.pointsDistance = pointsDistance;
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
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.framebufferWidth, this.framebufferHeight, 0, this.gl.RGBA, this.gl.FLOAT, null);
    }

    delete() {
        this.gl.deleteTexture(this.texture);
        this.gl.deleteBuffer(this.verticesBuffer);
        this.gl.deleteFramebuffer(this.framebuffer);
    }

    draw(mvpMatrix) {
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);

        this.gl.useProgram(this.program);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.viewport(0, 0, this.framebufferWidth, this.framebufferHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.uniformMatrix4fv(this.uMvpMatrix, false, mvpMatrix);
        this.gl.uniform1f(this.uP, this.options.p);
        this.gl.uniform2f(this.uFramebufferSize, this.framebufferWidth, this.framebufferHeight);
        if (this.options.pointRadius > 0 && this.options.fasterPointRadius) {
            this.gl.uniform1i(this.u_FasterPointRadius, 1);
            this.gl.uniformMatrix4fv(this.uMvpMatrixInverse, false, Matrix.inverse(mvpMatrix));
        }

        for (let i=0; i<this.points.length; i++) {
            const point = this.points[i];

            const xiImageSpace = Matrix.dot(mvpMatrix, [point[0], point[1], 0, 1]);
            this.gl.uniform2f(this.uXiImageSpace, xiImageSpace[0] / xiImageSpace[3], xiImageSpace[1] / xiImageSpace[3]);
            this.gl.uniform1f(this.uUi, point[2]);
            this.gl.uniform2f(this.uXi, point[0], point[1]);
            this.gl.uniform1f(this.uPointRadius, this.pointsDistance[i]);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
            this.gl.enableVertexAttribArray(this.aPosition);
            this.gl.vertexAttribPointer(this.aPosition, 2, this.gl.FLOAT, false, 0, 0);

            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.verticesNumber);
        }
    }

    updatePointsAndDistances(points, pointsDistance) {
        this.points = points;
        this.pointsDistance = pointsDistance;
    }

    #createProgram() {
        const vertexSource = require('../shaders/idw/vertex.glsl');
        const fragmentSource = require('../shaders/idw/fragment.glsl');
        const vertexShader =  createVertexShader(this.gl, vertexSource);
        const fragmentShader = createFragmentShader(this.gl, fragmentSource);

        this.program = createProgram(this.gl, vertexShader, fragmentShader);
    }

    #createAttributes() {
        this.aPosition = this.gl.getAttribLocation(this.program, 'a_Position');
        this.uMvpMatrix = this.gl.getUniformLocation(this.program, 'u_MvpMatrix');
        this.uUi = this.gl.getUniformLocation(this.program, "ui");
        this.uXi = this.gl.getUniformLocation(this.program, "xi");
        this.uP = this.gl.getUniformLocation(this.program, "p");
        this.uFramebufferSize = this.gl.getUniformLocation(this.program, "u_FramebufferSize");
        this.uMvpMatrixInverse = this.gl.getUniformLocation(this.program, "u_MvpMatrixInverse");
        this.uPointRadius = this.gl.getUniformLocation(this.program, "u_PointRadius");
        this.uXiImageSpace = this.gl.getUniformLocation(this.program, "u_XiImageSpace");
        this.u_FasterPointRadius = this.gl.getUniformLocation(this.program, "u_FasterPointRadius");
    }

    #createBuffers() {
        const vertices = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

        this.verticesBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        this.verticesNumber = 4;
    }

    #createTexture() {
        this.texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.framebufferWidth, this.framebufferHeight, 0, this.gl.RGBA, this.gl.FLOAT, null);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    #createFramebuffer() {
        this.framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
}