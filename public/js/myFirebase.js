/// ////
//  firebase launch
/// ////

// Helper to get hash from end of URL or generate a random one.
function getExampleRef () {
  var ref = firebase.database().ref()
  var hash = window.location.hash.replace(/#/g, '')
  if (hash) {
    ref = ref.child(hash)
  } else {
    ref = ref.push() // generate unique location.
    window.location = window.location + '#' + ref.key // add it as a hash to the URL.
  }
  if (typeof console !== 'undefined') {
    console.log('Firebase data: ', ref.toString())
  }
  return ref
}
// local
// var config = {
//   apiKey: 'something',
//   databaseURL: "ws://127.0.1:5000"
// }
// remote
// Initialize Firebase
var config = {
  apiKey: 'yourkey',
  authDomain: 'yourdomain.firebaseapp.com',
  databaseURL: 'yourURL.firebaseio.com',
  storageBucket: 'yourBucket.appspot.com',
  messagingSenderId: 'yourId'
}

firebase.initializeApp(config)
/// / Get Firebase Database reference.
var firepadRef = getExampleRef()
var userId = Math.floor(Math.random() * 9999999999).toString()
/// / Create Firepad.
var firepad = Firepad.fromACE(firepadRef, editor, {
  userId: userId,
  defaultText: 'void main() {\n\tgl_FragColor=vec4( 0.0, 0.0, 0.0, 1.0 );\n\n}\n\nbps (180/120)\n\nlet steps = take 16 [0,0.0625..]\n\nd1 $ s "break*8" # begin (choose steps) # cut "1"\nd1 $ s "alone*8" # begin (choose steps) # cut "1"\n\nd1  $ striate 16 $ s "calm"\nhush\n\nd1 $ every 2 (density 2) $ degradeBy 0.5 $ sound "break*8"\n\t|=| cut "1"\n\t|=| gain "1.2"\n\t|=| begin (choose steps)\n\n//unit to fit to a cycle?\nd1 $ s "{seq3 seq2 [~ seq3] ~ seq2 [~ seq3] ~}%2"\n  # n (slow (4/3) $ run 9)\n   # gain "1.2"\n  # unit "c"\n  # speed "1"\n\n  d1 $ s "funky*4"\n  # n (irand 8)\n  # gain "1.2"\n  # unit "c"\n  # speed "4"\n\n'
})

var audioMessageRef = firebase.database().ref('audioMessage/' + 1)

audioMessageRef.on('child_added', function (data) {
    // var userId = document.getElementById("whoAmI").value;
  if (data.val().author !== userId) {
       // record
    editor.livewriting('record', data.val().range, data.val().exec)
      // play
    editor.runTidal(data.val().range, data.val().exec)

    audioMessageRef.child(data.key).remove()
  }
})

// audioMessageRef.on('child_changed', function(data) {
//   console.log(data.key+ " " +data.val().text + " " +data.val().author);
// });

// audioMessageRef.on('child_removed', function(data) {
// console.log(data.key+ " " +data.val().text + " " +data.val().author);
// });

// var audioMessageRef =firebase.database().ref('/users/' + userId + '/audioMessage');
// audioMessageRef.on('value', function(snapshot) {

// });
