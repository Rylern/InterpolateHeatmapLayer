precision mediump float;

VALUE_TO_COLOR
VALUE_TO_COLOR_4

uniform sampler2D maskTexture;
uniform sampler2D idwTexture;
uniform vec2 screenSize;
uniform bool circlesDrawn;
uniform float opacity;
uniform float averageThreshold;
uniform float average;

void main(void) {
    vec4 mask = texture2D(maskTexture, vec2(gl_FragCoord.x/screenSize.x, gl_FragCoord.y/screenSize.y));
    vec4 idw = texture2D(idwTexture, vec2(gl_FragCoord.x/screenSize.x, gl_FragCoord.y/screenSize.y));

    if (mask.x > 0. && (!circlesDrawn || mask.y > 0.) && idw.z > 0.) {
        float u = idw.x/idw.y;
        if (abs(u - average) >= averageThreshold) {
            gl_FragColor = valueToColor4(u, opacity);
        } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}