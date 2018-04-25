
// precision lowp float;

varying vec2 vUv;

uniform vec2 resolution;
uniform sampler2D tDiffuse;
uniform vec4 edgeBlend;

uniform vec4 colorCurves;


void main()
{
    vec2 st = gl_FragCoord.xy / resolution;
    vec4 color = texture2D(tDiffuse, vUv);

    float c = smoothstep(edgeBlend.x+edgeBlend.y, edgeBlend.x-edgeBlend.y, st.x) + 
              smoothstep(edgeBlend.z-edgeBlend.w, edgeBlend.z+edgeBlend.w , st.x);

    color.rgb = pow(pow(color.rgb, colorCurves.rgb), colorCurves.aaa); //two pass rgb, then gamma

    gl_FragColor = mix(color, vec4(0,0,0,1), c);
}


// void main() { 
// 	gl_FragColor = texture2D( tDiffuse, vUv ); 
// }