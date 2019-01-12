var mouseX = 0,
    mouseY = 0,
    mouseClickX = 0,
    mouseClickY = 0
var quality = 0.5

var meter = null
var debugging = false

function resizeGL(pixelSize) {
    renderer.setPixelRatio(pixelSize)
    renderer.setSize(window.innerWidth, window.innerHeight)

    RTTPing.setSize(window.innerWidth, window.innerHeight)
    RTTPong.setSize(window.innerWidth, window.innerHeight)

    camera.left = -1
    camera.right = 1
    camera.top = 1
    camera.bottom = -1
    camera.updateProjectionMatrix()
}

$(window)
    .resize(function() {
        if (camera !== null && renderer !== null) {
            resizeGL(quality)
        }
        var h = $('#editor').height()
        $('#feedback').css({
            top: (h + 10) + 'px',
            position: 'absolute'
        })
    })

$(document)
    .ready(function() {
        /// /////////////////////////////////
        //  Footer
        /// /////////////////////////////////
        $('#footer')
            .mouseover(function(event) {
                $('#footerUI').fadeIn('fast')
            })
            .mouseleave(function(event) {
                $('#footerUI').fadeOut('slow')
            })

        meter = new FPSMeter(document.getElementById('myFrameRate'), {
            top: '4px',
            graph: 0,
            theme: 'codenobi'
        })

        $('#selectQuality')
            .selectmenu({
                width: 'auto',
                position: { collision: 'flip' }
            })
            .on('selectmenuchange', function(event, data) {
                quality = data.item.value
                resizeGL(quality)
            })

        $('#selectFontSize')
            .selectmenu({
                width: 'auto',
                position: { collision: 'flip' }
            })
            .on('selectmenuchange', function(event, data) {
                editor.setOptions({
                    fontSize: data.item.value + 'pt'
                })
            })

        $('#audioButton')
            .button()
            .click(function() { // we do this check, because for some reason closing the dialog
                // looses the file and server sound
                if ($('#audioPanel').dialog('isOpen'))
                // $("#audioPanel").parent().show("clip", {}, 250);
                { $('#audioPanel').parent().css('visibility', 'visible') } else { $('#audioPanel').dialog('open') }
            })

        /// /////////////////////////////////
        //  Audio Panel
        /// /////////////////////////////////
        $('#audioPanel')
            .dialog({
                autoOpen: false,
                maxHeight: 400,
                minWidth: 500,
                show: {
                    effect: 'clip',
                    duration: 250
                },
                hide: {
                    effect: 'clip',
                    duration: 250
                },
                beforeClose: function(event, ui) {
                    $(this).parent().css('visibility', 'hidden')
                    event.preventDefault()
                    return false
                }
            })

        $('#audioTabs')
            .tabs()

        $('#soundOffButton')
            .button()
            .click(function(event) {
                event.preventDefault()
                mSound.mSource.disconnect()
                initAudio()
                $('#micTogglePlaythrough').button('disable')
            })

        $('#micToggleButton')
            .button()
            .click(function(event) {
                event.preventDefault()

                webAudioCleanup()

                navigator.mediaDevices.getUserMedia(audioConstraint)
                    .then(function(stream) {
                        mAudioContext = new AudioContext()
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
                        mSound.mStream = stream
                        mSound.mSource = mAudioContext.createMediaStreamSource(stream)
                        mSound.mSource.disconnect()
                        mSound.mSource.connect(mSound.mAnalyser)
                    })

                    .catch(function(err) {
                        console.log(err.name + ': ' + err.message)
                    })

                $('#micTogglePlaythrough').button('enable')
                bandsOn = true

                $(this).blur()
            })

        $('#micTogglePlaythrough')
            .button({ disabled: true })
            .bind('change', function() {
                event.preventDefault()
                if ($(this).is(':checked')) { mSound.mSource.connect(mAudioContext.destination) } else {
                    mSound.mSource.disconnect()
                    mSound.mSource.connect(mSound.mAnalyser)
                }
            })

        $('#myAudioFile')
            .button()
            .change(function(event) {
                initAudio()

                if ($('#soundFile').length) { $('#soundFile').remove() }

                var exts = []
                var urls = []
                for (var i = 0; i < this.files.length; i++) {
                    urls[i] = URL.createObjectURL(this.files[i])
                    exts[i] = this.files[i].name.split('.').pop()
                }

                var audio = createAudioElement(urls, exts, 'soundFile')
                $(this).after(audio)
                // audio.addEventListener("timeupdate",function(){
                //       var hr  = Math.floor(secs / 3600);
                // var min = Math.floor((secs - (hr * 3600))/60);
                // var sec = Math.floor(secs - (hr * 3600) -  (min * 60));

                // if (min < 10){
                //   min = "0" + min;
                // }
                // if (sec < 10){
                //   sec  = "0" + sec;
                // }
                // min + ':' + sec

                // $("#audioClock").html(audio.currentTime);
                // });

                mSound.mSource = mAudioContext.createMediaElementSource(audio)
                mSound.mSource.disconnect()
                mSound.mSource.connect(mSound.mAnalyser)
                mSound.mSource.connect(mAudioContext.destination)

                bandsOn = true
            })

        $('#myAudioFileLoop')
            .button()
            .bind('change', function() {
                if ($(this).attr('checked')) { $('#soundFile').attr('loop', 'true') } else { $('#soundFile').attr('loop', 'false') }
            })

        $('#debug')
            .button()
            .bind('change', function() {
                debugging = !debugging
                setShaderFromEditor()
            })

        $('#network')
            .button()
            .click(function(event) {
                $('#networkPanel').dialog('open')
            })

        // --------------------- FIREBASE AND OSC PANEL ------------
        $('#networkPanel')
            .dialog({
                autoOpen: false,
                maxHeight: 400,
                minWidth: 520,
                show: {
                    effect: 'clip',
                    duration: 250
                },
                hide: {
                    effect: 'clip',
                    duration: 250
                }
            })

        // TODO: fix these buttons
        $('#new_hash')
            .button()
            .click(function(event) {
                createFirepad(true)
            })

        $('#connect_to_firebase')
            .button()
            .click(function(event) {
                createFirepad(false)
            })

        $('#disconnect_to_firebase')
            .button()
            .click(function(event) {
                if (firepad !== null) {
                    firepad.dispose()
                }
                firebase.auth().signOut().then(function() {
                    // Sign-out successful.
                }).catch(function(error) {
                    // An error happened.
                });
            })

        $('#openFile')
            .button()
            .click(function(event) { // to hide the other file button interface from users
                $('#myFile').trigger('click')
            })

        $('#myFile')
            .change(function(event) {
                openFile(event)
            })

        $('#saveFile')
            .button()
            .click(function(event) {
                editor.livewriting('save', editor.livewriting('returnactiondata'))
            })

        $('#play')
            .button()
            .bind('change', function(event) { // because this is checked every frame,
                // I think bool is faster than jquery checkbox->state?
                isRendering = !isRendering
            })

        $('#playback')
            .button()
            .click(function() {
                $('.livewriting_navbar').dialog('open')
            })

        $('.livewriting_navbar')
            .dialog({
                autoOpen: false,
                maxHeight: 400,
                minWidth: 800,
                show: {
                    effect: 'clip',
                    duration: 250
                },
                hide: {
                    effect: 'clip',
                    duration: 250
                }
            })
            
        $('#firebase_user').val(localStorage.firebase_user) 
        $('#firebase_pass').val(localStorage.firebase_pass)
    }) // end document ready

    // TODO::::
    // .tooltip()

    .mousemove(function(event) {
        mouseX = event.pageX
        mouseY = event.pageY
    }) // end document mousemove

    .mousedown(function(event) {
        mouseClickX = event.pageX
        mouseClickY = event.pageY
    }) // end document mousedown

    .mouseup(function(event) {})

    .keydown(function(event) {
        // updateKeyboardDown(event.keyCode);
        if (event.ctrlKey === true && event.shiftKey === true) {
            $('#footer').fadeToggle('slow', function() {})
            $('#editor').fadeToggle('slow', function() {})
        }
    }) // end document keydown

    .keyup(function(event) {
        // updateKeyboardUp(event.keyCode);
    }) // end document keyup
    .on('dragenter', function(event) {
        event.stopPropagation()
        event.preventDefault()
    })
    .on('dragover', function(event) {
        event.stopPropagation()
        event.preventDefault()
    })
    .on('drop', function(event) {
        event.stopPropagation()
        event.preventDefault()
    })

function openFile(event) {
    var file
    if (event.target.files) { file = event.target.files } else { file = event.dataTransfer.files }
    var f
    var numFiles = file.length
    for (var i = 0; f = file[i]; i++) {
        if (f.name.slice(-4) === '.txt') {
            var reader = new FileReader()

            reader.onload = (function(theFile) {
                return function(e) {
                    editor.livewriting('playJson', reader.result)
                    // editor.setValue(reader.result, -1)
                }
            })(f)

            reader.readAsText(f, 'text/plain;charset=utf-8')
        }
    }
}

function addStyleRule(css) {
    var styleElement
    if (typeof document === 'undefined' || document === null) {
        return
    }
    if (!editor.addedStyleRules) {
        editor.addedStyleRules = {}
        styleElement = document.createElement('style')
        document.documentElement.getElementsByTagName('head')[0].appendChild(styleElement)
        editor.addedStyleSheet = styleElement.sheet
    }
    if (editor.addedStyleRules[css]) {
        return
    }
    editor.addedStyleRules[css] = true
    return editor.addedStyleSheet.insertRule(css, 0)
}