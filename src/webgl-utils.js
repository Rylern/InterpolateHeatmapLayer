/**
 * Indicate if the provided context uses WebGL1 or WebGL2. 
 * 
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl a WebGL context
 * @returns {boolean} whether the provided context uses WebGL2
 */
export function isWebGL2(gl) {
    return gl.getParameter(gl.VERSION).includes('2.0');
}

/**
 * Create and compile a vertex shader.
 * 
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl the WebGL context to use
 * @param {string} source the source code of the shader to compile
 * @returns {WebGLShader} the created shader
 * @throws an error if the shader didn't compile
 */
export function createVertexShader(gl, source) {
    return compileShader(
        gl,
        gl.createShader(gl.VERTEX_SHADER),
        source
    );
}

/**
 * Create and compile a fragment shader.
 * 
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl the WebGL context to use
 * @param {string} source the source code of the shader to compile
 * @returns {WebGLShader} the created shader
 * @throws an error if the shader didn't compile
 */
export function createFragmentShader(gl, source) {
    return compileShader(
        gl,
        gl.createShader(gl.FRAGMENT_SHADER),
        source
    );
}

/**
 * Create a WebGL program that links a vertex and a fragment shader.
 * 
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl the WebGL context to use
 * @param {WebGLShader} vertexShader the vertex shader to link
 * @param {WebGLShader} fragmentShader the fragment shader to link
 * @returns {WebGLProgram} the created program
 * @throws an error if the provided shaders could not be linked
 */
export function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw(gl.getProgramInfoLog(program));
    }
    
    return program;
}

/**
 * Create and populate a buffer.
 * 
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl the WebGL context to  use
 * @param {GLenum} bufferType the type of buffer ({@link WebGLRenderingContext.ARRAY_BUFFER} or {@link WebGLRenderingContext.ELEMENT_ARRAY_BUFFER}) 
 * @param {Float32Array | Uint8Array} data the data the buffer should contain
 * @returns {WebGLBuffer} the created buffer
 * @throws an error if bufferType is not one of the two possible values
 */
export function createBuffer(gl, bufferType, data) {
    if (bufferType != gl.ARRAY_BUFFER && bufferType != gl.ELEMENT_ARRAY_BUFFER) {
        throw new Error(`The provided buffer type ${bufferType} has an invalid value.`);
    }

    const buffer = gl.createBuffer();

    gl.bindBuffer(bufferType, buffer);
    gl.bufferData(bufferType, data, gl.STATIC_DRAW);

    return buffer;
}

function compileShader(gl, shader, source) {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw(gl.getShaderInfoLog(shader));
    }
    
    return shader;
}