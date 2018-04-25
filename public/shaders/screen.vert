varying vec2 vUv;

uniform vec2 translation;
uniform vec2 scale;
uniform float degrees;

void main()
{
	vec2 scaledPosition = position.xy * scale;
	float angleInRadians = degrees * 3.14159 / 180.0;
	vec2 rotation = vec2(sin(angleInRadians), 
						 cos(angleInRadians));

	vec2 rotatedPosition = vec2(
		scaledPosition.x * rotation.y + scaledPosition.y * rotation.x,
		scaledPosition.y * rotation.y - scaledPosition.x * rotation.x);

    vec4 mvPosition = modelViewMatrix * vec4( rotatedPosition + translation, position.z, 1.0 ); 
    // vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 ); 
    gl_Position = projectionMatrix * mvPosition;

    vUv = uv;
}