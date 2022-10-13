import { createVertexShader, createFragmentShader, createProgram } from '../webgl-utils.js';


export class Draw {
    constructor(gl) {
        this.gl = gl;

        this.#createProgram();
        this.#createAttributes();
        this.#createBuffers();
    }

    delete() {
        this.gl.deleteBuffer(this.verticesBuffer);
    }

    draw(mvpMatrix, canvas, roiTexture) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, canvas.width, canvas.height);

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
        this.gl.enableVertexAttribArray(this.aPosition);
        this.gl.vertexAttribPointer(this.aPosition, 2, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, roiTexture);
        this.gl.uniform1i(this.uROITexture, 0);
        this.gl.uniform2f(this.uScreenSize, canvas.width, canvas.height);
        this.gl.uniformMatrix4fv(this.uMvpMatrix, false, mvpMatrix);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.verticesNumber);
    }

    #createProgram() {
        const vertexSource = require('../shaders/draw/vertex.glsl');
        const fragmentSource = require('../shaders/draw/fragment.glsl');
        const vertexShader = createVertexShader(this.gl, vertexSource);
        const fragmentShader = createFragmentShader(this.gl, fragmentSource);

        this.program = createProgram(this.gl, vertexShader, fragmentShader);
    }

    #createAttributes() {
        this.aPosition = this.gl.getAttribLocation(this.program, 'a_Position');
        this.uMvpMatrix = this.gl.getUniformLocation(this.program, 'u_MvpMatrix');
        this.uROITexture = this.gl.getUniformLocation(this.program, 'u_ROITexture');
        this.uScreenSize = this.gl.getUniformLocation(this.program, 'u_ScreenSize');
    }

    #createBuffers() {
        const vertices = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

        this.verticesBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.verticesBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

        this.verticesNumber = 4;
    }
}