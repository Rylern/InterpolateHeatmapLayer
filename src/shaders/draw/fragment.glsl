precision highp float;

uniform sampler2D u_ROITexture;
uniform vec2 u_ScreenSize;

void main(void) {
    gl_FragColor = texture2D(u_ROITexture, vec2(gl_FragCoord.x/u_ScreenSize.x, gl_FragCoord.y/u_ScreenSize.y));
}