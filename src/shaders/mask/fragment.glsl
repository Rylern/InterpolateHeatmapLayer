precision mediump float;

uniform bool drawingCircles;

void main() {
    if (drawingCircles) {
        gl_FragColor = vec4(0., 1., 0., 0.);
    } else {
        gl_FragColor = vec4(1., 0., 0., 0.);
    }
}