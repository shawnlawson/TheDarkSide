var DEBUG = false

var Range = ace.require('ace/range').Range

var livewriting = (function ($) {
  'use strict'

  var INSTANTPLAYBACK = false,
    SLIDER_UPDATE_INTERVAL = 100,
    INACTIVE_SKIP_THRESHOLD = 2000,
    SKIP_RESUME_WARMUP_TIME = 1000,   
    lw_histogram_bin_number = 480,
    canvas_histogram_width = 480,
    canvas_histogram_height = 50,
    
    changeAceFunc = function (event, editor) {
      var it = editor
      var timestamp = Date.now() - it.lw_startTime
      var index = it.lw_liveWritingJsonData.length
      it.lw_liveWritingJsonData[index] = {'p': 'c', 't': timestamp, 'd': event}
      // it.lw_liveWritingJsonData[index] = {'p': 'c', 't': timestamp, 'd': event, 'r', firepad.editorAdapter_.ignoreChanges}
      if (DEBUG)console.log('change event :' + JSON.stringify(it.lw_liveWritingJsonData[index]) + ' time:' + timestamp)
    },
    scrollLeftAceFunc = function (editor, number) {
      var it = editor
      var timestamp = Date.now() - it.lw_startTime
      var index = it.lw_liveWritingJsonData.length
      it.lw_liveWritingJsonData[index] = {'p': 's', 't': timestamp, 'n': number, 'y': 'left'}
      if (DEBUG)console.log('viewPortChange event :' + JSON.stringify(it.lw_liveWritingJsonData[index]) + ' time:' + timestamp)
    },
    scrollTopAceFunc = function (editor, number) {
      var it = editor
      var timestamp = Date.now() - it.lw_startTime
      var index = it.lw_liveWritingJsonData.length
      it.lw_liveWritingJsonData[index] = {'p': 's', 't': timestamp, 'n': number, 'y': 'top'}
      if (DEBUG)console.log('viewPortChange event :' + JSON.stringify(it.lw_liveWritingJsonData[index]) + ' time:' + timestamp)
    },
    cursorAceFunc = function (event, editor) {
      var it = editor
      var timestamp = Date.now() - it.lw_startTime
      var index = it.lw_liveWritingJsonData.length

      it.lw_liveWritingJsonData[index] = {'p': 'u', 't': timestamp, 'd': editor.session.selection.getRange(), 'b': editor.session.selection.isBackwards() + 0}
      if (DEBUG)console.log('change event :' + JSON.stringify(it.lw_liveWritingJsonData[index]) + ' time:' + timestamp)
    },
  // START
    remoteCursorFunc = function (editor) {
      if (!editor.myBackMarkerListener) { return }
      var timestamp = Date.now() - editor.lw_startTime
      var index = editor.lw_liveWritingJsonData.length
      // false for back markers
      var marks = editor.session.getMarkers(false)

      for (var m in marks) {
        if (marks[m].clazz.indexOf('other-client-') > -1) {
          var r = new Range.fromPoints(marks[m].range.start.getPosition(), marks[m].range.end.getPosition())
          editor.lw_liveWritingJsonData[index] = {'p': 'o', 't': timestamp, 'd': r, 'c': marks[m].clazz}
          if (DEBUG)console.log('other cursor change event : ' + JSON.stringify(editor.lw_liveWritingJsonData[index]) + ' time: ' + timestamp)
        }
      }
    },
    execAceFunc = function (type, editor, r, lang) {
      if (type === 'execLine' || type === 'execBlock') {
        var it = editor
        var timestamp = Date.now() - it.lw_startTime
        var index = it.lw_liveWritingJsonData.length
        var deltaTime
        if (index > 0) {
          deltaTime = timestamp - it.lw_liveWritingJsonData[index-1].t
        }
        it.lw_liveWritingJsonData[index] = {'p': 'e', 't': timestamp, 'a': type, 'd': r, 'l': lang, 'c': mCode, 'dt' : deltaTime}
        if (DEBUG)console.log('executing line event:' + JSON.stringify(it.lw_liveWritingJsonData[index]) + ' time:' + timestamp)
      }
    },
  // END

    scheduleNextEventFunc = function () {
      // scheduling part
      var it = this
      if (it.lw_pause) { return }
      if (it.lw_data_index < 0) {
        it.lw_data_index = 0
      }// this can happen due to the slider
      if (it.lw_data_index === it.lw_data.length) {
        return
      }
      // var startTime = it.lw_startTime
      var currentTime = Date.now()
      var nextEventInterval = it.lw_startTime + it.lw_data[it.lw_data_index]['t'] - currentTime
      if (DEBUG)console.log('nextEventInterval : ' + nextEventInterval)

      // let's catch up some of the old changes.
      while (it.lw_data[it.lw_data_index] !== undefined &&
        nextEventInterval < 0 && it.lw_data_index < it.lw_data.length - 1) {
        it.lw_triggerPlay(false, true)
        nextEventInterval = it.lw_startTime + it.lw_data[it.lw_data_index]['t'] - currentTime
      }

      if (it.lw_skip_inactive && nextEventInterval > INACTIVE_SKIP_THRESHOLD) {
        if (DEBUG)console.log('skipping inactive part : ' + nextEventInterval)
        nextEventInterval = SKIP_RESUME_WARMUP_TIME
        it.lw_startTime = currentTime - it.lw_data[it.lw_data_index]['t'] + nextEventInterval
      }

      if (INSTANTPLAYBACK) nextEventInterval = 0
       // recurring trigger
      it.lw_next_event = setTimeout(function () {
        it.lw_triggerPlay(false)
      }, nextEventInterval)
    },

    triggerPlayAceFunc = function (reverse, skipSchedule) {
      var event = this.lw_data[this.lw_data_index]
      if (event === undefined) {
        if (DEBUG) alert('no event for index: ' + this.lw_data_index)
      }
      this.focus() // removed SL
      if (DEBUG) console.log('reverse:' + reverse + ' ' + JSON.stringify(event))
      if (event.p === 'c') { // change in content
        var change = event.d
        var text
        var range
        if (change.data) {
          console.log('do something with change.data')
        } else if (change.action === 'insert') {
          if (reverse) {
            range = Range.fromPoints(change.start, change.end)
            this.session.doc.remove(range)
          } else {
            text = change.lines.join('\n')
            this.session.doc.insert(change.start, text)
          }
        } else if (change.action === 'remove') {
          if (reverse) {
            text = change.lines.join('\n')
            this.session.doc.insert(change.start, text)
          } else {
            range = Range.fromPoints(change.start, change.end)
            this.session.doc.remove(range)
          }
        } else {
          if (DEBUG)alert('ace editor has another type of action other than "remove" and "insert": ' + change.action)
        }
      } else if (event.p === 'u') { // cursor change
        this.session.selection.setSelectionRange(event.d, Boolean(event.b))
      } else if (event.p === 'o') { // remote cursor change
        // remove old marks
        var marks = this.session.getMarkers(false)

        for (var m in marks) {
          if (marks[m].clazz.indexOf('other-client-') > -1) {
            this.session.removeMarker(marks[m].id)
          }
        }
        // add updated marks
        var css
        var color = '#' + event.c.substring(event.c.length - 6)
        if (event.d.start.column === event.d.end.column && event.d.start.row === event.d.end.row) {
          css = '.' + event.c + ' {\n  position: absolute;\n  background-color: transparent;\n  border-left: 2px solid ' + color + ';\n}'
          addStyleRule(css)
        } else {
          css = '.' + event.c + ' {\n  position: absolute;\n  background-color: ' + color + ';\n  border-left: 2px solid ' + color + ';\n}'
          addStyleRule(css)
        }
        var r = Range.fromPoints(event.d.start, event.d.end)
        r.clipRows = function () {
          var range
          range = Range.prototype.clipRows.apply(this, arguments)
          range.isEmpty = function () {
            return false
          }
          return range
        }
        this.session.addMarker(r, event.c, 'text')
      } else if (event.p === 's') { // scroll
        if (event.y === 'left') {
          this.session.setScrollLeft(event.n)
        } else if (event.y === 'top') {
          this.session.setScrollTop(event.n)
        } else {
          if (DEBUG) alert('unknown scroll type for ace editor: ' + event['y'])
        }
      }
      // START adding code execute
      else if (event.p === 'e') {
        // TODO:: let this call an exec function from event.l for language
        this.runCode(event.d, event.a, event.l)
      }
      // END adding code execute
      if (reverse) {
        this.lw_data_index--
      } else {
        this.lw_data_index++
      }

      // check the final text once this is done.
      if (this.lw_data_index == this.lw_data.length) {
        if (DEBUG)console.log('done replay')
      //    this.lw_data_index = this.lw_data.length -1;

        if (this.lw_finaltext != this.getValue()) {
          console.log('There is discrepancy. Do something')
          if (DEBUG) alert('LiveWritingAPI: There is discrepancy. Do something' + this.lw_finaltext + ':' + this.getValue())
        }

        $('.play').trigger('click')
      }

      // scheduling part
      if (!skipSchedule) { this.lw_scheduleNextEvent() }
    },

  ///////////////////////////////////////////////////////////////////
  // UI controller
  ///////////////////////////////////////////////////////////////////
    updateSlider = function (it) {
      if (it.lw_pause) return
      var currentTime = Date.now()
      var value = (currentTime - it.lw_startTime) * it.lw_playback
      it.lw_sliderValue = value
      $('.livewriting_slider').slider('value', value)
      if (value > it.lw_endTime) {
        livewritingPause(it)
        return
      }

      setTimeout(function () {
        updateSlider(it)
      }, SLIDER_UPDATE_INTERVAL)
    },
    livewritingResume = function (it) {
      var options = {
        label: 'pause',
        icons: {
          primary: 'ui-icon-pause'
        }
      }

      $('#lw_toolbar_play').button('option', options)
      it.lw_pause = false
      var time = $('.livewriting_slider').slider('value')
      var currentTime = Date.now()
      it.lw_startTime = currentTime - time / it.lw_playback
      // it.lw_resumedTime = Date.now();
      // it.lw_startTime = it.lw_startTime + (it.lw_resumedTime - it.lw_pausedTime);
      it.lw_scheduleNextEvent()
      updateSlider(it)
    },
    sliderGoToEnd = function (it) {
      var max = $('.livewriting_slider').slider('option', 'max')
      it.setValue(it.lw_finaltext)
      it.moveCursorTo(0, 0)
      it.lw_data_index = it.lw_data.length - 1
      livewritingPause(it)
      $('.livewriting_slider').slider('value', max)
    },
    sliderGoToBeginning = function (it) {
      it.setValue(it.lw_initialText)
      it.lw_data_index = 0
      livewritingPause(it)
      $('.livewriting_slider').slider('value', 0)
    },
    livewritingPause = function (it) {
      it.lw_pause = true
      clearTimeout(it.lw_next_event)
      var options = {
        label: 'play',
        icons: {
          primary: 'ui-icon-play'
        }
      }
      $('#lw_toolbar_play').button('option', options)
    },
    configureToolbar = function (it, navbar) {
      // navbar.draggable() // this line requires jquery ui
      $('.livewriting_slider').append("<canvas id='livewriting_histogram' width=" + canvas_histogram_width + ' height=' + canvas_histogram_height + '></canvas>')

      $('.livewriting_speed').button()
      $('.lw_toolbar_speed').button({
        text: false,
        icons: {
          primary: 'ui-icon-triangle-1-s'
        }
      }).click(function () {
        $('#lw_playback_slider').toggle()
      })

      // $('#lw_toolbar_setting').button({
      //   text: false,
      //   icons: {
      //     primary: 'ui-icon-gear'
      //   }
      // }).click(function () {
      //   console.log('for now, nothing happens')
      // })

      $('#lw_playback_slider').slider({
        orientation: 'vertical',
        range: 'min',
        min: -20,
        max: 60,
        value: 0,
        slide: function (event, ui) {
          var value = $('#lw_playback_slider').slider('value') / 10.0

          it.lw_playback = Math.pow(2.0, value)

          var time = $('.livewriting_slider').slider('value')
          var currentTime = Date.now()
          it.lw_startTime = currentTime - time / it.lw_playback

          $('.livewriting_speed>span').text(it.lw_playback.toFixed(1) + ' X')
        },
        stop: function (event, ui) {
          $('#lw_playback_slider').hide()
        }
      })

      $('.livewriting_toolbar_wrapper').toggleClass('.ui-widget-header')
      $('#lw_toolbar_beginning').button({
        text: false,
        icons: {
          primary: 'ui-icon-seek-start'
        }
      }).click(function () {
        sliderGoToBeginning(it)
      })
      $('#lw_toolbar_slower').button({
        text: false,
        icons: {
          primary: 'ui-icon-minusthick'
        }
      }).click(function () {
        it.lw_playback = it.lw_playback / 2.0
        if (it.lw_playback < 0.25) {
          it.lw_playback *= 2.0
        }

        var time = $('.livewriting_slider').slider('value')
        var currentTime = Date.now()
        it.lw_startTime = currentTime - time / it.lw_playback

        $('.livewriting_speed').text(it.lw_playback)
      })
      $('#lw_toolbar_play').button({
        text: false,
        icons: {
          primary: 'ui-icon-pause'
        }
      })
      .click(function () {
        if (!it.lw_pause) {
          livewritingPause(it)
        } else {
          livewritingResume(it)
        }
      })
      $('#lw_toolbar_faster').button({
        text: false,
        icons: {
          primary: 'ui-icon-plusthick'
        }
      }).click(function () {
        it.lw_playback = it.lw_playback * 2.0
        if (it.lw_playback > 64.0) {
          it.lw_playback /= 2.0
        }
        var time = $('.livewriting_slider').slider('value')
        var currentTime = Date.now()
        it.lw_startTime = currentTime - time / it.lw_playback

        $('.livewriting_speed').text(it.lw_playback)
      })
      $('#lw_toolbar_end').button({
        text: false,
        icons: {
          primary: 'ui-icon-seek-end'
        }
      }).click(function () {
        sliderGoToEnd(it)
      })

      $('#lw_toolbar_stat').button({
        text: false,
        icons: {
          primary: 'ui-icon-image'
        }
      }).click(function (e) {
        $('#lw_toolbar_stat .ui-button-text').toggleClass('ui-button-text-toggle')
        $('#livewriting_histogram').toggle()
        $('div.livewriting_slider_wrapper').toggleClass('histogram_slider_wrapper')
      })

      $('#lw_toolbar_skip').button({
        text: false,
        icons: {
          primary: 'ui-icon-arrowreturnthick-1-n'
        }
      }).click(function (e) {
        it.lw_skip_inactive = !it.lw_skip_inactive
        $('#lw_toolbar_skip .ui-button-text').toggleClass('ui-button-text-toggle')
        if (it.lw_skip_inactive) {
          clearTimeout(it.lw_next_event)
          it.lw_scheduleNextEvent()
          $('.ui-slider-inactive-region').css('background-color', '#ccc')
          $('div.livewriting_slider').css('background', '#F49C25')
        } else {
          $('.ui-slider-inactive-region').css('background-color', '#fff')
          $('div.livewriting_slider').css('background', '#D4C3C3')
        }
      })
    },
    sliderEventHandler = function (it, value) {
      var time = value
      var currentTime = Date.now()
      it.lw_startTime = currentTime - time / it.lw_playback
      if (!it.lw_pause) { clearTimeout(it.lw_next_event) }
      if (it.lw_sliderValue > time) // backward case
      {
        while (it.lw_data_index > 0 && time < it.lw_data[it.lw_data_index - 1].t) {
          it.lw_data_index--
          it.lw_triggerPlay(true, true)
          it.lw_data_index++
          it.lw_data_index = Math.max(it.lw_data_index, 0)
          if (DEBUG)console.log('slider backward:' + it.lw_data_index)
          if (DEBUG)console.log('value:' + it.getValue() + 'length:' + it.getValue().length)
        }
      } else { // forward case
        while (it.lw_data_index < it.lw_data.length &&
          time > it.lw_data[it.lw_data_index].t) {
            //            && it.lw_sliderValue < it.lw_data[it.lw_data_index].t){
          it.lw_triggerPlay(false, true)
          if (DEBUG)console.log('slider forward(time:' + time + '):' + it.lw_data_index)
          if (DEBUG)console.log('value:' + it.getValue())
        }
      }
      // this handles forward when pause.
      // if(it.lw_pause){
      it.lw_sliderValue = time

      if (!it.lw_pause) {
        it.lw_scheduleNextEvent()
      }
    },
    
    createNavBar = function (it) {
      if (DEBUG)console.log('create Navigation Bar')
      var end_time = it.lw_data[it.lw_data.length - 1]['t']
      if (DEBUG) console.log('slider end time : ' + end_time)
      var navbar = $('.livewriting_navbar')

      configureToolbar(it, navbar)
      var slider = $('.livewriting_slider').slider({
        min: 0,
        max: end_time + 1,
        slide: function (event, ui) {
          sliderEventHandler(it, ui.value)
        }
      })
      $('.livewriting_slider').slider('value', 0)
    },

    createLiveWritingTextArea = function (it, type, options, initialValue) {
      var defaults = {
        name: 'Default live writing textarea',
        startTime: null,
        stateMouseDown: false,
        writeMode: null,
        readMode: null
      }
      it.lw_settings = $.extend(defaults, options)
            // Iterate over the current set of matched elements
      it.lw_type = type
      it.lw_startTime = Date.now()

      if (DEBUG)console.log('starting time:' + it.lw_startTime)

      it.lw_liveWritingJsonData = []
      it.lw_initialText = initialValue
      it.lw_mostRecentValue = initialValue
      it.lw_writemode = true

      it.setValue(it.lw_initialText)

      it.on('change', changeAceFunc)
      it.on('changeSelection', cursorAceFunc)
      // START
      it.myBackMarkerListener = true
      it.session.on('changeBackMarker', function (event) {
        return remoteCursorFunc(it)
      })
      it.commands.on('afterExec', function (event) {
        execAceFunc(event.command.name, it, editor.session.selection.getRange(), mLanguage)
      })
      // END
      it.session.on('changeScrollLeft', function (number) {
        scrollLeftAceFunc(it, number) // this is needed to pass the editor instance. by deafult it has edit session.
      })
      it.session.on('changeScrollTop', function (number) {
        scrollTopAceFunc(it, number) /// this is needed to pass the editor instance.by deafult it has edit session.
      })

      if (it.lw_settings.writeMode != null) { it.lw_settings.writeMode() }
    },

    getActionData = function (it) {
      var data = {}

      data['version'] = 4
      data['playback'] = 1 // playback speed
      data['editor_type'] = it.lw_type
      data['initialtext'] = it.lw_initialText
      data['action'] = it.lw_liveWritingJsonData
      data['localEndtime'] = new Date().getTime()
      data['localStarttime'] = it.lw_startTime
      data['finaltext'] = it.getValue()
      return data
    },
    
    histValue = function (x) {
      return 0.3 + 0.7 * Math.pow(2 * x - Math.pow(x, 2), 0.5)
    },
    drawHistogram = function (it) {
      var c = document.getElementById('livewriting_histogram')
      var ctx = c.getContext('2d')

      var total_length = it.lw_data[it.lw_data.length - 1]['t'] + 1
      var inserted = new Array(lw_histogram_bin_number).fill(0)
      var removed = new Array(lw_histogram_bin_number).fill(0)
      var maxChange = -1

      for (var i = 0; i < it.lw_data.length; i++) {
        if (it.lw_data[i].p != 'c') { continue }
        var starting_time = it.lw_data[i]['t']
        var index = Math.round(starting_time / total_length * lw_histogram_bin_number)
        var length = -1
        if (it.lw_type == 'ace') {
          if (it.lw_data[i].d.action == 'insert') {
            length = it.lw_data[i].d.lines.join().length
            inserted[index] += length
          } else if (it.lw_data[i].d.action == 'remove') {
            length = it.lw_data[i].d.lines.join().length
            removed[index] += length
          }
        }
        if (length > maxChange) { maxChange = length }
      }
      var bin_size = canvas_histogram_width / lw_histogram_bin_number
      if (DEBUG)console.log('binsize:' + bin_size)
      var value = 0
      for (var i = 0; i < lw_histogram_bin_number; i++) {
        if (inserted[i] > 0) {
          value = histValue(inserted[i] / maxChange)
          ctx.fillStyle = '#97DB97'
          ctx.fillRect(bin_size * i, canvas_histogram_height / 2 * (1 - value), bin_size, canvas_histogram_height / 2 * value)
          if (DEBUG)console.log('i:' + i + ', inserted:' + inserted[i] + ' value: ' + value)
        }
        if (removed[i] > 0) {
          value = histValue(removed[i] / maxChange)
          ctx.fillStyle = '#EB5555'
          ctx.fillRect(bin_size * i, canvas_histogram_height / 2, bin_size, canvas_histogram_height / 2 * value)
          if (DEBUG)console.log('i:' + i + ', removed:' + removed[i] + ' value: ' + value)
        }
      }
    },

    playbackbyJson = function (it, json_file) {
      it.lw_triggerPlay = triggerPlayAceFunc
      //TODO:: if we want to edit and playback at the same time. 
      it.setReadOnly(true) 
      it.$blockScrolling = Infinity

      it.removeListener('change', changeAceFunc)
      it.removeListener('changeSelection', cursorAceFunc)
      // START
      it.myBackMarkerListener = false
      // it.session.removeListener('changeBackMarker', function (event) {
      //   remoteCursorFunc(it)
      // })
      // it.commands.removeListener('afterExec', function (event) {
      //   execAceFunc(event.command.name, it)
      // })
      // // END
      // it.session.removeListener('changeScrollLeft', function (number) {
      //   scrollLeftAceFunc(it, number)
      // })
      // it.session.removeListener('changeScrollTop', function (number) {
      //   scrollTopAceFunc(it, number)
      // })

      it.lw_scheduleNextEvent = scheduleNextEventFunc

      it.focus()

      if (DEBUG)console.log(it.lw_settings.name)
      it.lw_version = json_file['version']
      it.lw_playback = (json_file['playback'] ? json_file['playback'] : 1)
      it.lw_type = json_file['editor_type'] 
      it.lw_finaltext = (json_file['finaltext'] ? json_file['finaltext'] : '')
      it.lw_initialText = (json_file['initialtext'] ? json_file['initialtext'] : '')
      it.setValue(it.lw_initialText)
      it.lw_data_index = 0
      it.lw_data = json_file['action']
      it.lw_endTime = it.lw_data[it.lw_data.length - 1].t
      
      if (DEBUG)console.log(it.name + 'play response recieved in version(' + it.version + ')\n')

      var currTime = Date.now()
      it.lw_startTime = currTime
      createNavBar(it)
      if (it.lw_type === 'ace') {
        it.session.getMode().getNextLineIndent = function () { return '' }
        it.session.getMode().checkOutdent = function () { return false }
      }
      livewritingResume(it)
      var startTime = currTime + it.lw_data[0]['t'] / it.lw_playback
      if (DEBUG)console.log('1start:' + startTime + ' time: ' + currTime + ' interval:' + it.lw_data[0]['t'] / it.lw_playback + ' currentData:', JSON.stringify(it.lw_data[0]))
      // let's draw inactive region.
      drawHistogram(it)
      var total_length = it.lw_data[it.lw_data.length - 1]['t'] + 1
      var prevStartTime = 0
      for (var i = 0; i < it.lw_data.length; i++) {
        var starting_time = it.lw_data[i]['t']
        if (it.lw_data[i]['t'] - prevStartTime > INACTIVE_SKIP_THRESHOLD) {
          var width = (it.lw_data[i]['t'] - prevStartTime) / total_length
          if (width < 0.001) { // 0.001 means  1 px when the page width is 1000
            continue
          }
          var inactive_region = $('<div></div>')
          inactive_region.css('left', (prevStartTime / total_length * 100.0) + '%')
          inactive_region.css('width', (width * 100.0) + '%')
          inactive_region.addClass('ui-slider-inactive-region')
          $('.livewriting_slider').append(inactive_region)
        }
        prevStartTime = it.lw_data[i]['t']
      }
    }

  ///////////////////////////////////////////////////////////////////
  // Major API Commands
  ///////////////////////////////////////////////////////////////////
  var livewritingMainfunction = function (message, option1, option2, option3) {
    var it = $(this)[0]
    
    if (typeof (message) !== 'string') {
      alert('LiveWritingAPI: livewriting textarea need a string message')
      return it
    }

    if (it == null || typeof (it) === 'undefined') {
      alert('LiveWritingAPI: no object found for livewritingtexarea')
      return it
    }

    if (message == 'reset') {
      it.lw_startTime = Date.now()
      //clear current recording file? 
    } else if (message == 'create') {
      if (typeof (option2) !== 'object' && typeof (option2) !== 'undefined') {
        alert('LiveWritingAPI: the 3rd argument should be the options array.')
        return it
      }
      if (option1 != 'ace') {
        alert('LiveWritingAPI: Creating live writing text area only supports ace editor. ')
        return it
      }
      if ($(this).length > 1) {
        alert('LiveWritingAPI: Please, have only one textarea in a page')
        return it
      }

      if (typeof option3 === 'undefined') { option3 = '' }

      createLiveWritingTextArea(it, option1, option2, option3)

      return it
// START added
    } else if (message === 'save') {
      if (it.lw_liveWritingJsonData.length == 0) {
        alert(it.lw_settings.noDataMsg)
        respondFunc(false)
        return
      }

      // see https://github.com/panavrin/livewriting/blob/master/json_file_format
      var data = getActionData(it)

      var blob = new Blob([JSON.stringify(data, null, ' ')], {type: 'text/plain;charset=utf-8'})
      var d = new Date()
      d.setMonth(d.getMonth() + 1)
      var fName = d.getFullYear() + '_' + d.getMonth() + 'M_' + d.getDate() + 'D_' +
                      d.getHours() + 'H_' + d.getMinutes() + 'm_' + d.getSeconds() + 's'

      saveAs(blob, 'Jensaarai_' + fName + '.txt')
    } 
    //we need this for code executions coming in remote
    else if (message === 'record') {
        execAceFunc(option2, it, option1, option3)
    }
// END add
    else if (message == 'playJson') {
      if (typeof (option1) !== 'object' && typeof (option1) !== 'string') {
        alert('LiveWritingAPI: playJson require data object:' + option1)
        return
      }
      var data
      if (typeof (option1) === 'object') {
        data = option1
      } else {
        try {
          data = JSON.parse(option1)
        } catch (e) {
          console.log(e)
          return false
        }
      }

      it.lw_writemode = false
      
      playbackbyJson(it, data)
    }
  }

  return livewritingMainfunction
}(jQuery))

