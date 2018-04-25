if (!Detector.webgl) { Detector.addGetWebGLMessage() }

var startTime = Date.now()
var headerShader = null
var isRendering = true
var RToPing = false
var container
var camera, sceneRTT, sceneScreen, renderer
var rtTexture, material, materialScreen, quad, quad2

function init () {
  container = document.getElementById('container')

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  camera.position.z = 1

  sceneRTT = new THREE.Scene()
  sceneScreen = new THREE.Scene()

  RTTPing = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.NearestFilter, // THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    anisotropy: 4,
    format: THREE.RGBAFormat
  })
  RTTPong = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.NearestFilter, // THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    anisotropy: 4,
    format: THREE.RGBAFormat
  })

  $.when($.ajax({ url: 'shaders/draw.vert', dataType: 'text' }),
      $.ajax({ url: 'shaders/screen.vert', dataType: 'text' }),
      $.ajax({ url: 'shaders/screen.frag', dataType: 'text' }),
      $.ajax({ url: 'shaders/header.frag', dataType: 'text' }))
    .done(function (d, v, f, h) {
      headerShader = h[0]
      material = new THREE.ShaderMaterial({
        uniforms: {
          resolution: {
            value: new THREE.Vector2()
          },
          time: {
            value: 0.0
          },
          mouse: {
            value: new THREE.Vector4()
          },
          bands: {
            value: new THREE.Vector4()
          },
          backbuffer: {
            value: RTTPing.texture
          }
        },
        vertexShader: d[0],
        fragmentShader: headerShader + '\n\n void main() { gl_FragColor=vec4( 0.0, 0.0, 0.0, 1.0 ); }'
      })

      materialScreen = new THREE.ShaderMaterial({

        uniforms: {
          resolution: {
            value: new THREE.Vector2()
          },
          tDiffuse: {
            value: RTTPong.texture
          },
          edgeBlend: {
            value: new THREE.Vector4()
          },
          colorCurves: {
            value: new THREE.Vector4()
          },
          translation: {
            value: new THREE.Vector2()
          },
          scale: {
            value: new THREE.Vector2()
          },
          degrees: {
            value: 0.0
          }
        },
        vertexShader: v[0],
        fragmentShader: f[0],
        depthWrite: false

      })

      var plane = new THREE.PlaneGeometry(2, 2)

      quad = new THREE.Mesh(plane, material)
      quad.position.z = 0
      sceneRTT.add(quad)

      quad2 = new THREE.Mesh(plane, materialScreen)
      quad2.position.z = 0
      sceneScreen.add(quad2)

      renderer = new THREE.WebGLRenderer()
      renderer.setPixelRatio(quality)
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.autoClear = false

      container.appendChild(renderer.domElement)

      animate()
    }) // end $.when

  editor.focus()
}

function animate () {
  requestAnimationFrame(animate)

  if (isRendering) { render() }

  if (meter !== null) { meter.tick() }
}

function render () {
  var time = (Date.now() - startTime) * 0.001

  var rSize = renderer.getSize()

  material.uniforms.resolution.value.set(rSize.width, rSize.height)
  material.uniforms.time.value = time
  material.uniforms.mouse.value.set(mouseX, mouseY, mouseClickX, mouseClickY)
  material.uniforms.bands.value.set(mSound.low, mSound.mid, mSound.upper, mSound.high)

  renderer.clear()

  if (RToPing === true) {
    material.uniforms.backbuffer.value = RTTPong.texture
    materialScreen.uniforms.value = RTTPing.texture
    renderer.render(sceneRTT, camera, RTTPing)
  } else {
    material.uniforms.backbuffer.value = RTTPing.texture
    materialScreen.uniforms.value = RTTPong.texture
    renderer.render(sceneRTT, camera, RTTPong)
  }

  RToPing = !RToPing

  materialScreen.uniforms.resolution.value.set(rSize.width, rSize.height)
  materialScreen.uniforms.translation.value.set(0, 0)
  materialScreen.uniforms.scale.value.set(1, 1)
  materialScreen.uniforms.degrees.value = 0.0
  materialScreen.uniforms.edgeBlend.value.set(0.0, 0.0001, 1.0, 0.0001)
  materialScreen.uniforms.colorCurves.value.set(1.0, 1.0, 1.0, 1.0)

  renderer.render(sceneScreen, camera)
}

function createShader (vertShader, fragShader) {
  var gl = renderer.getContext()
  if (gl === null) return

  var tmpProgram = gl.createProgram()

  // var vs = gl.createShader(gl.VERTEX_SHADER);
  var fs = gl.createShader(gl.FRAGMENT_SHADER)

  // gl.shaderSource(vs, vertShader);
  gl.shaderSource(fs, fragShader)

  // gl.compileShader(vs);
  gl.compileShader(fs)

  // if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
  //     var infoLog = gl.getShaderInfoLog(vs);
  //     gl.deleteProgram(tmpProgram);
  //     return {
  //         mSuccess: false,
  //         mInfo: infoLog
  //     };
  // }

  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    var infoLog = gl.getShaderInfoLog(fs)
    gl.deleteProgram(tmpProgram)
    return {
      mSuccess: false,
      mInfo: infoLog
    }
  }

  // gl.attachShader(tmpProgram, vs);
  // gl.attachShader(tmpProgram, fs);

  // gl.deleteShader(vs);
  gl.deleteShader(fs)

  // gl.linkProgram(tmpProgram);

  // if (!gl.getProgramParameter(tmpProgram, gl.LINK_STATUS)) {
  //     var infoLog = gl.getProgramInfoLog(tmpProgram);
  //     gl.deleteProgram(tmpProgram);
  //     return {
  //         mSuccess: false,
  //         mInfo: infoLog
  //     };
  // }

  return {
    mSuccess: true,
    mProgram: tmpProgram
  }
}

init()
