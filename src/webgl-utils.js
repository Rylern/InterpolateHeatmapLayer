export function isWebGL2(gl) {
    return gl.getParameter(gl.VERSION).includes('2.0');
}

export function createVertexShader(gl, source) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    return compileShader(gl, vertexShader, source);
}

export function createFragmentShader(gl, source) {
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    return compileShader(gl, fragmentShader, source);
}

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

function compileShader(gl, shader, source) {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw(gl.getShaderInfoLog(shader));
    }
    return shader;
}