# The Dark Side

The dark side of the Force is a pathway to many abilities some consider to be unnatural.

The Dark side is used by [Obi-Wan Codenobi](http://shawnlawson.com) and [The Wookie](http://ryanrosssmith.com) for use in live-coding audio-visual performances. Together they travel as [_The Rebel Scum_](http://codenobiandwookie.com).

### Multi-Language
The Dark Side uses the same GLSL language as [The Force](https://github.com/shawnlawson/The_Force), but with the addition of being able to also live-coding [Tidal Cycles](https://tidalcycles.org) in the same text buffer. 

The GLSL will auto-compile. 

Tidal will be executed by the typical <kbd>shift</kbd>+<kbd>return</kbd> for lines and <kbd>ctrl</kbd>+<kbd>return</kbd> or <kbd>cmd</kbd>+<kbd>return</kbd>for blocks.

### Multi-User
The Dark Side is tele-matic and multi-user. The backend uses Google's [Firebase](https://firebase.google.com) under [Firepad](https://firepad.io) an extesion to the [Ace Editor](https://ace.c9.io). This can be configured to run multiple users remotely (anywhere) or locally (same subnet).

### Text Recording/Playback
Text edits are recorded and then able to be saved, JSON format, and played back in The Dark Side with an edits made to Sang Won Lee's [livewriter](https://github.com/panavrin/livewriting).

### Publication
Short paper on this software published at the 3rd [International Conference on Live-Coding](https://iclc.livecodenetwork.org/2017/en/index.html). That paper is here [ShortPaper-TheDarkSide.pdf](http://www.shawnlawson.com/wp-content/uploads/2018/03/ShortPaper-TheDarkSide.pdf)

Lots of testing this out here [https://vimeo.com/album/4688973](https://vimeo.com/album/4688973)

# Installation

1. Install all things required for [Tidal Cycles](https://tidalcycles.org/getting_started.html)
2. Install [Node](https://nodejs.org/en/)
3. Download this repository
4. From terminal or command line go to the downloaded repository, then
```bash
npm install
```
5. Make a [firebase account](https://firebase.google.com)
6. Follow [directions here](https://firebase.google.com/docs/web/setup?authuser=0) to grab your apiKey, etc. this information will replace the config dictionary in [TheDarkSide/public/js/myFirebase.js](./public/js/myFirebase.js)  Replace only what's required. __NOTE:__ This is your private key information, anyone who has this will use your account, unless you additionally setup user authentications. Each collaborator will also need this information in their copy of their repository so that you're all pointing to the same place.


# Usage

### Starting and collaborating

From terminal in the repository, type
```bash
node index
```

Open a browser window, Chrome recommended. 

Go to localhost:8000

A random hash, something like 

/#-Ke-ob9Bx4oBoKwR867q   

will be append to the URL. This hash is your current firepad database. Share this hash with your collaborators, or use the same hash everytime to use The Dark Side. For example, bookmark this new URL.

### Launch Settings

Using
```bash
node index help
```
will give information and options for the program. For more details and the default settings see [TheDarkSide/index.js](./index.js)

### Running Locally 

For local subnet firebase you'll need to change the config. [TheDarkSide/public/js/myFirebase.js](./public/js/myFirebase.js) In local mode the apiKey can be anything.
```javascript
var config = {
   apiKey: 'something',
   databaseURL: "ws://127.0.1:5000"
}
```
Note that the connection is websocket and that the ip only has two dots. This is __very__ important. The above only works if it's one person. If you need several people on a local subnet, then things become more complicated. The following have worked based on where I am. You will need something similar.For example when I generate a wifi from my computer and others connect to it:
```javascript
var config = {
   apiKey: 'something',
   databaseURL: "ws://lawsos2.local.:5000"
}
```
or, when we all join my wifi router at home
```javascript
var config = {
   apiKey: 'something',
   databaseURL: "ws://lawsos2-mbp15.fios-router.home:5000"
}
```

### Saving and Playing Text Recordings

The floppy drive icon at the bottom will save your performance to a JSON formatted .txt file. 

To play back your file, use the file open icon and choose your file. Click the gear icon to open a semi-working playback control window.


### Additionally helpful to know

- Check [The_Force](https://github.com/shawnlawson/The_Force) contains several GLSL examples
- [Workshop Notes](https://github.com/shawnlawson/The_Force_Workshop) contains some hand-written information and a few more example shaders
- <kbd>ctrl</kbd>+<kbd>shift</kbd> will toggle text visibility
- backbuffer is a copy of the previous frame's frontbuffer


## Sources

* https://github.com/ajaxorg/ace
* http://darsa.in/fpsmeter/ also https://github.com/darsain/fpsmeter
* http://jquery.com
* http://www.flaticon.com
* https://github.com/eligrey/FileSaver.js
* https://github.com/eligrey/canvas-toBlob.js
* https://github.com/marmorkuchen-net/osc-js
* https://github.com/panavrin/livewriting
