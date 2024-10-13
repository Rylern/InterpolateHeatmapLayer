attribute vec4 position;
uniform mat4 mvpMatrix;

void main() {
    gl_Position = mvpMatrix * position;
}