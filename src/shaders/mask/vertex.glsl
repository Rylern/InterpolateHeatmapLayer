attribute vec2 position;
uniform mat4 mvpMatrix;
uniform mat4 modelMatrix;

void main() {
    gl_Position = mvpMatrix * modelMatrix * vec4(position, 0.0, 1.0);
}