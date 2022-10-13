precision highp float;

uniform float ui;
uniform vec2 xi;
uniform float p;
uniform vec2 u_FramebufferSize;
uniform mat4 u_MvpMatrixInverse;
uniform float u_PointRadius;
uniform vec2 u_XiImageSpace;
uniform int u_FasterPointRadius;

void main() {
    vec2 x = vec2(2. * gl_FragCoord.x/u_FramebufferSize.x - 1., 2. * gl_FragCoord.y/u_FramebufferSize.y - 1.);
    float wi = 1.0/pow(distance(x, u_XiImageSpace), p);

    float outsideRange = 1.;
    if (u_FasterPointRadius > 0) {
        vec4 xWorldSpace = u_MvpMatrixInverse * vec4(x, 1, 1);
        xWorldSpace /= xWorldSpace.w;
        
        if (distance(vec2(xWorldSpace), xi) > u_PointRadius) {
            outsideRange = 0.;
        }
    }

    gl_FragColor = vec4(ui*wi, wi, outsideRange, 1.0);
}