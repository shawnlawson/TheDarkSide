var mCompileTimer = null
var mErrors = new Array()
var mExecs = new Array()
var mExecTimer = null
var mFeedback = false
var mCode = ''

function setShaderFromEditor () {
  if (headerShader !== null) {
    // var expToDelete = /([d][1-8]|hush|let|bps)[\s\S]*?(\n\n|\s\n)/ig;
    // var rawCode = editor.getValue();
    // var cleanCode = rawCode.replace(expToDelete, "\n");
    // var tidalCode = false;
    var rawCode = editor.session.doc.getAllLines()
    var rawCodeLength = rawCode.length
    var cleanCode = ''
    var startExp = /(?:\h?[d][1-8]|\h?hush|\h?let|\h?setcps|\h?import)/ig
    var i = 0
    while (i < rawCodeLength) {
      var resultStart = startExp.exec(rawCode[i])
      if (resultStart !== null) {
        while (i < rawCodeLength - 1) {
          cleanCode += '\n'
          i++
          if (rawCode[i].length === 0 || !rawCode[i].trim()) {
            break
          }
        }
      } else {
        cleanCode += rawCode[i] + '\n'
        i++
      }
    }
    // console.log();

    material.fragmentShader = headerShader + '\n\n' + cleanCode

    var result = createShader(material.vertexShader, material.fragmentShader)
    var n = headerShader.split(/\r\n|\r|\n/).length
    setLineErrors(result, n + 2)
    if (result.mSuccess === true) {
      material.needsUpdate = true
    }
  }
}

function setLineErrors (result, lineOffset) {
  while (mErrors.length > 0) {
    var mark = mErrors.pop()
    editor.session.removeMarker(mark)
  }

  editor.session.clearAnnotations()

  if (result.mSuccess === false) {
    // var lineOffset = getHeaderSize();
    var lines = result.mInfo.match(/^.*((\r\n|\n|\r)|$)/gm)
    var tAnnotations = []
    for (var i = 0; i < lines.length; i++) {
      var parts = lines[i].split(':')

      if (parts.length === 5 || parts.length === 6) {
        var annotation = {}
        annotation.row = parseInt(parts[2]) - lineOffset
        annotation.text = parts[3] + ' : ' + parts[4]
        annotation.type = 'error'

        if (debugging) { tAnnotations.push(annotation) }

        var id = editor.session.addMarker(new Range(annotation.row, 0, annotation.row, 1), 'errorHighlight', 'fullLine', false)
        mErrors.push(id)
      }
    }

    if (debugging) {
      console.log(result.mInfo)
      editor.session.setAnnotations(tAnnotations)
    }
  }
}

/// /////////////////////////////////
//  ACE launch
/// /////////////////////////////////
var langTools = ace.require('ace/ext/language_tools')
langTools.setCompleters([langTools.snippetCompleter, langTools.keyWordCompleter])

var editor = ace.edit('editor')
editor.setTheme('ace/theme/monokai')
editor.session.setMode('ace/mode/glsl')
editor.session.setUseWrapMode(true)
editor.session.setUseWorker(true)
editor.session.selection.clearSelection()

editor.setDisplayIndentGuides(false)
// editor.setOptions({
//   enableBasicAutocompletion: false,
//   enableSnippets: true,
//   enableLiveAutocompletion: true
// })

editor.setShowPrintMargin(false)
editor.getSession().on('change', function (e) {
  clearTimeout(mCompileTimer)
  mCompileTimer = setTimeout(setShaderFromEditor, 200)
})
editor.$blockScrolling = Infinity
editor.setOptions({
  fontSize: '12pt'
})

var delay

editor.livewriting = livewriting
editor.livewriting('create', 'ace', {}, '')

editor.commands.addCommand({
  name: 'toggleTidalFeedback',
  bindKey: {
    win: 'Ctrl-9',
    mac: 'Command-9'
  },
  exec: function (editor) {
    if (mFeedback) {
      mFeedback = false
      $('#editor').css({
        bottom: '40px',
        position: 'absolute'
      })
      editor.resize()
      $('#feedback').hide()
    } else {
      mFeedback = true
      var h = $('#editor').height()
      $('#editor').css({
        bottom: '200px',
        position: 'absolute'
      })
      editor.resize()
      var h = $('#editor').height()
      $('#feedback').css({
        top: (h + 10) + 'px',
        position: 'absolute'
      }).show()
      feedback.setHighlightActiveLine(false)
    }
  }
})

editor.commands.addCommand({
  name: 'toggleAutoComplete',
  bindKey: {
    win: 'Ctrl-0',
    mac: 'Command-0'
  },
  exec: function (editor) {
    editor.setOptions({
      enableLiveAutocompletion: !editor.getOptions().enableLiveAutocompletion
    })
  }
})

editor.commands.addCommand({
  name: 'execLine',
  bindKey: {
    win: 'Shift-Return',
    mac: 'Shift-Return'
  },
  exec: function () {
    if (audioMessageRef !== null) {
      audioMessageRef.push({ author: userId, exec: 'execLine', range: editor.session.selection.getRange(), backwards: editor.session.selection.isBackwards() + 0 })
    }
    editor.runCode(editor.session.selection.getRange(), 'execLine')
  }
})

editor.commands.addCommand({
  name: 'execBlock',
  bindKey: {
    win: 'Ctrl-Return',
    mac: 'Command-Return'
  },
  exec: function () {
    if (audioMessageRef !== null) {
      audioMessageRef.push({ author: userId, exec: 'execBlock', range: editor.session.selection.getRange(), backwards: editor.session.selection.isBackwards() + 0 })
    }
    editor.runCode(editor.session.selection.getRange(), 'execBlock')
  }
})

editor.runCode = function (theRange, execType) {
  var theCode = ''
  var sel = new Range()
  var startExp = /(?:\h?[d][1-8]|\h?hush|\h?let|\h?bps|\v)/ig
  var endExp = /\v/gi
  var myCursor = editor.session.selection.getCursor()

  if (execType === 'execLine') {
    sel = theRange
    sel.start.column = 0
    sel.end.column = 1
    var lines = editor.session.doc.getLines(sel.start.row, sel.end.row)
    theCode = lines.join('\n\n')
  } else { // is block execution
    sel = theRange
    sel.start.column = 0
    sel.end.column = 0

    while (sel.start.row >= 0) {
      var lineStart = editor.session.doc.getLine(sel.start.row)
      var resultStart = startExp.exec(lineStart)
      if (resultStart !== null) {
        break
      }
      sel.start.row -= 1
    }

    var lastLine = editor.session.doc.getLength()

    while (sel.end.row < lastLine) {
      var lineEnd = editor.session.doc.getLine(sel.end.row)
      if (lineEnd.length === 0 || !lineEnd.trim()) {
        break
      }
      sel.end.row += 1
    }

    var lines = editor.session.doc.getLines(sel.start.row, sel.end.row)
    theCode = lines.join(editor.session.doc.getNewLineCharacter())
    // for highlighting
    sel.end.row -= 1
  }

  sel.clipRows = function () {
    var range
    range = Range.prototype.clipRows.apply(this, arguments)
    range.isEmpty = function () {
      return false
    }
    return range
  }

  var id = editor.session.addMarker(sel, 'execHighlight', 'fullLine')
  mExecs.push(id)
  mExecTimer = setTimeout(clearExecHighLighting, 550)

  // editor.session.selection.moveCursorTo(myCursor.row, myCursor.column)
  // editor.session.selection.clearSelection()

  var msg = {
    request: 'eval',
    code: theCode
  }
  console.log(theCode)
  mCode = theCode
  ws.send(JSON.stringify(msg))
}

function clearExecHighLighting () {
  while (mExecs.length > 0) {
    var mark = mExecs.pop()
    editor.session.removeMarker(mark)
  }
}

/// /////////////////////////////////
//  Tidal Feedback
/// /////////////////////////////////
var feedback = ace.edit('feedback')
feedback.setTheme('ace/theme/monokai')
feedback.session.setMode('ace/mode/haskell')
feedback.session.setUseWrapMode(true)
feedback.session.setUseWorker(true)
feedback.session.selection.clearSelection()
feedback.setDisplayIndentGuides(false)
feedback.setShowPrintMargin(false)
feedback.$blockScrolling = Infinity
feedback.setOptions({
  fontSize: '10pt',
  readOnly: true,
  highlightActiveLine: false,
  highlightGutterLine: false,
  highlightSelectedWord: false
})
feedback.renderer.$cursorLayer.element.style.opacity = 0
$('#feedback .ace_active-line').hide()
$('#feedback').hide()
