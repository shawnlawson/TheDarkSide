var audioConstraint = { audio: true }
var mSound = {}
mSound.low = mSound.mid = mSound.upper = mSound.high = 0.0
var bandsOn = false
var aCanvas

/// /////////////////////////////////
//  WebAudio Contexts
/// /////////////////////////////////
var contextAvailable = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext

if (contextAvailable) {
  mAudioContext = new contextAvailable()
  mSound.mAnalyser = mAudioContext.createAnalyser()
  mSound.mAnalyser.smoothingTimeConstant = 0.5
  mSound.mAnalyser.fftSize = 1024
  mSound.mFreqData = new Uint8Array(mSound.mAnalyser.frequencyBinCount)
  mSound.mWaveData = new Uint8Array(512)
  mSound.javascriptNode = mAudioContext.createScriptProcessor(1024, 2, 2)
  mSound.mAnalyser.connect(mSound.javascriptNode)
  mSound.javascriptNode.connect(mAudioContext.destination)
  mSound.javascriptNode.onaudioprocess = function () {
    updateFourBands()
  }

  bandsOn = false
} else {
  alert("This browser doesn't support Audio Contexts. Audio input will not be available.")
}

function webAudioCleanup () {
  if (mSound.mStream) { // clean up any user media stream
    mSound.mStream.stop()
    mSound.mStream = null
  }
}

/// /////////////////////////////////
//  Browser GetUserMedia
/// /////////////////////////////////
if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {}
}

if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = function (constraints) {
    var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)

    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
    }

    return new Promise(function (resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject)
    })
  }
}

function createAudioElement (urls, exts, name) {
  var audioElement = document.createElement('audio')

  audioElement.id = name
  audioElement.autoplay = false
  audioElement.loop = false
  audioElement.controls = true

  for (var i = 0; i < urls.length; ++i) {
    var typeStr = 'audio/' + exts[i] // "audio/" + urls[i].split(".").pop();

    if (audioElement.canPlayType === undefined ||
            audioElement.canPlayType(typeStr).replace(/no/, '')) {
      var sourceElement = document.createElement('source')
      sourceElement.type = typeStr
      sourceElement.src = urls[i]
      audioElement.appendChild(sourceElement)
    }
  }

  return audioElement
}

var canv = document.getElementById('fourBands')
aCanvas = canv.getContext('2d')
aCanvas.width = 100
aCanvas.height = 32

function updateFourBands () {
    // todo: speed this up
    // var ctx = $('#fourBands')[0].getContext('2d');
  aCanvas.clearRect(0, 0, 100, 32)

  if (!bandsOn) return
  if (!mSound) return
  if (mAudioContext === null) return

  mSound.mAnalyser.getByteFrequencyData(mSound.mFreqData)

  var k = 0
  var f = 0.0
  var a = 5,
    b = 11,
    c = 24,
    d = mSound.mAnalyser.frequencyBinCount,
    i = 0
  for (; i < a; i++) {
    f += mSound.mFreqData[i]
  }

  f *= 0.2 // 1/(a-0)
  f *= 0.003921569 // 1/255
  drawBandsRect(0, aCanvas, f)
  mSound.low = f

  f = 0.0
  for (; i < b; i++) {
    f += mSound.mFreqData[i]
  }

  f *= 0.166666667 // 1/(b-a)
  f *= 0.003921569 // 1/255
  drawBandsRect(1, aCanvas, f)
  mSound.mid = f

  f = 0.0
  for (; i < c; i++) {
    f += mSound.mFreqData[i]
  }

  f *= 0.076923077 // 1/(c-b)
  f *= 0.003921569 // 1/255
  drawBandsRect(2, aCanvas, f)
  mSound.upper = f

  f = 0.0
  for (; i < d; i++) {
    f += mSound.mFreqData[i]
  }

  f *= 0.00204918 // 1/(d-c)
  f *= 0.003921569 // 1/255
  drawBandsRect(3, aCanvas, f)
  mSound.high = f
}

function drawBandsRect (which, ctx, value) {
  var rr = parseInt(255 * value)
  ctx.fillStyle = 'rgba(' + rr + ',' + rr + ',' + rr + ',' + '0.5)'
  var a = Math.max(0, value * 32.0)
  ctx.fillRect(which * 15, 28 - a, 15, a)
}
