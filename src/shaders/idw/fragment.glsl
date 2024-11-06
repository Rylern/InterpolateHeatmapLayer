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
    // since the distance is computed in the image space,
    // a correction must be applied to have consistent results
    // for different aspect ratios 
    float xFactor = framebufferSize.x / framebufferSize.y;  

    vec2 x = vec2(2. * gl_FragCoord.x/framebufferSize.x - 1., 2. * gl_FragCoord.y/framebufferSize.y - 1.);
    float wi = 1.0/pow(sqrt(pow(xFactor * (xiImageSpace.x - x.x), 2.) + pow(xiImageSpace.y - x.y, 2.)), p);

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