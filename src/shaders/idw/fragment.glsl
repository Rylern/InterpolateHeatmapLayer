precision highp float;

uniform float ui;
uniform vec2 xi;
uniform float p;
uniform vec2 framebufferSize;
uniform mat4 mvpMatrixInverse;
uniform float pointRadius;
uniform vec2 xiImageSpace;
uniform bool fasterPointRadius;

void main() {
    vec2 x = vec2(2. * gl_FragCoord.x/framebufferSize.x - 1., 2. * gl_FragCoord.y/framebufferSize.y - 1.);
    float wi = 1.0/pow(distance(x, xiImageSpace), p);

    float outsideRange = 1.;
    if (fasterPointRadius) {
        vec4 xWorldSpace = mvpMatrixInverse * vec4(x, 1, 1);
        xWorldSpace /= xWorldSpace.w;
        
        if (distance(vec2(xWorldSpace), xi) > pointRadius) {
            outsideRange = 0.;
        }
    }

    gl_FragColor = vec4(ui*wi, wi, outsideRange, 0.0);
}