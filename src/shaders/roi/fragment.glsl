precision highp float;

VALUE_TO_COLOR
VALUE_TO_COLOR_4

uniform sampler2D u_IDWTexture;
uniform vec2 u_FramebufferSize;
uniform float u_Opacity;
uniform float u_AverageThreshold;
uniform float u_Average;

void main(void) {
    vec4 data = texture2D(u_IDWTexture, vec2(gl_FragCoord.x/u_FramebufferSize.x, gl_FragCoord.y/u_FramebufferSize.y));
    float u = data.x/data.y;
    bool outsideRange = data.z == 0.;

    float opacity = u_Opacity;
    if (abs(u - u_Average) < u_AverageThreshold || outsideRange) {
        opacity = 0.;
    }

    gl_FragColor = valueToColor4(u, opacity);
}