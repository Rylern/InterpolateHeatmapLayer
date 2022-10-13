attribute vec2 a_Position;
uniform mat4 u_MvpMatrix;

void main() {
    gl_Position = u_MvpMatrix * vec4(a_Position, 0.0, 1.0);
}