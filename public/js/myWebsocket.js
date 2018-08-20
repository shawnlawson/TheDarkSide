
/// ////
//  websocket launch
/// ////
var ws
window.WebSocket = window.WebSocket || window.MozWebSocket
// var url = 'ws://' + location.hostname + ':' + 8000;
var url = 'ws://localhost:8002'
console.log('attempting websocket connection to ' + url)
ws = new WebSocket(url)

ws.onopen = function () {
  console.log('opened websocket connection')
}

ws.onerror = function () {
  console.log('ERROR opening websocket connection')
}

ws.onmessage = function (str) {
    // console.log(str);
  var msg = JSON.parse(str.data)

  switch (msg.type) {
    case 'status':
      $('#statusBar').text(msg.message)
            // fade out??
      break

    case 'feedback':
            // console.log(msg.message);
      feedback.setValue(msg.message)
      feedback.session.selection.clearSelection()

      break
  }
}
