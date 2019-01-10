#!/usr/bin/env node

var FirebaseServer = null

var express = null
var server = null
var webApp = null

var WebSocketServer = null
var wss = null

var spawn = null
var fs = null
var readline = null
var tidal = null

function sanitizeStringForTidal (x) {
  var result = x.replace(/\n/g, '')
  result = result.replace(/\t/g, ' ')
  return result
}

/*************************
Start up any Command Line Interface stuff
*************************/

var prog = require('caporal')
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
            //color must be first
            winston.format.colorize(),
            winston.format.simple()
          ),
  transports: [
    new winston.transports.Console()
  ]
});


prog
    .version('0.1.0')
    .logger(logger)
    .option('-d, --debug <debug>', 'Enable Debugging', prog.BOOL, false)
    .option('-f, --firebase <firebase>', 'Enable local Firebase', prog.BOOL, false)
    .option('-o, --fireport <fireport>', 'Set firebase on this port', prog.INT, 5000)
    .option('-n, --firehost <firehost>', 'Set firebase server', null, 'localhost.firebaseio.test')
    .option('-w, --webhost <webhost>', 'Use Locahost website', prog.BOOL, true)
    .option('-e, --webport <webport>', 'Set Locahost website port', prog.INT, 8000)
    .option('-s, --websocket <websocket>', 'Use websocket', prog.BOOL, 'true')
    .option('-k, --websocketport <websocketport>', 'Set websocket port', prog.INT, 8002)
    .option('-i, --tidal <tidal>', 'Use TidalCycles', prog.BOOL, true)
    .option('-l, --tidalbootfile <tidalbootfile>', 'Set tidalcycles boot file', null, 'ghciSuperDirt')
    .action(function (args, options, logger) {
        /*************************
        Info about Degugging status
        *************************/
      if (options.debug) {
        logger.info('Debugging Enabled')
      }

        /*************************
        Start up any firebase stuff
        *************************/
      if (options.firebase) {
            // if (options.debug) {
            //     debug.enable('firebase-server*');
            // }

        FirebaseServer = require('./localFirebase.js')

        new FirebaseServer(options.fireport, options.firehost, {})

        logger.info('Firebase Listening on: ' + options.fireport)
      } else {
        logger.warn('Not using local Firebase')
      }

        /*************************
        Start up any Website stuff
        *************************/
      if (options.webhost) {
        express = require('express')
        server = require('http').createServer()
        webApp = express()

        webApp.use(express.static('public'))
        server.on('request', webApp)
            // console.log(options.webport);
        server.listen(options.webport, function () {
          logger.info('Webhost Listening on: ' + options.webport)
        })
      } else {
        logger.info('Not webhosting site')
      }

        /*************************
        Start up any Web Socket stuff
        *************************/
      if (options.websocket) {
        WebSocketServer = require('ws').Server
        wss = new WebSocketServer({
          server: server,
          port: options.websocketport
        })

        wss.on('connection', function (ws) {
          ws.on('message', function (m) {
            var n = JSON.parse(m)
            if (n.request === 'eval') {
              if (options.debug) {
                logger.info(sanitizeStringForTidal(n.code))
              }
              tidal.stdin.write(sanitizeStringForTidal(n.code) + '\n')
            }
          })

          ws.on('close', function (code, msg) {
            logger.info('Web Socket closed')
          })

          ws.on('error', function () {
            logger.error('Web Socket error')
          })

                // try to send hello message
          try {
            ws.send(JSON.stringify({
              type: 'status',
              message: 'websocket connected to server'
            }))
          } catch (e) {
            logger.error('Web Socket send error: ' + e)
            return
          }

          logger.info('Web Socket added connection on port: ' + options.websocketport)
        })

            // wss.mySend = function mySend(code, msg) {
            //     try {
            //         // wss.clients.forEach(function each(client) {
            //             console.log(ws);
            //             // if (client.readyState === WebSocket.OPEN) {
            //                 wss.send(JSON.stringify({
            //                     type: code,
            //                     message: msg
            //                 }));
            //             // }
            //         // });
            //     } catch (e) {
            //         logger.error("Web Socket send error: " + e);
            //         return;
            //     }
            // };
      } else {
        logger.info('Not using websockets')
      }

        /*************************
        Start up any Tidal stuff
        *************************/
      if (options.tidal) {
        spawn = require('child_process').spawn
        fs = require('fs')
        readline = require('readline')
        tidal = spawn('ghci', ['-XOverloadedStrings'])

        var feedbackTimer = null
        var feedbackToSend = ''

        tidal.on('close', function (code) {
          readline.close()
          logger.error('Tidal process exited with code ' + code + '\n')
        })

        readline.createInterface({
          input: tidal.stdout,
          terminal: false
        }).on('line', function (line) {
          logger.info(line)
        })

        readline.createInterface({
          input: tidal.stderr,
          terminal: false
        }).on('line', function (line) {
          logger.error(line)
          feedbackToSend += line + '\n'
          clearTimeout(feedbackTimer)
          feedbackTimer = setTimeout(sendIt, 100)
        }).on('pause', function () {
          logger.info('exit')
        })

        fs.readFile(options.tidalbootfile, 'utf8', function (err, data) {
          if (err) {
            logger.error('Tidal could not read file, ' + options.tidalbootfile + ' : ' + err)
            return
          }
          tidal.stdin.write(data)
          logger.info('Tidal & GHCI initialized')
        })

        var sendIt = function () {
          if (options.websocket) {
            try {
              wss.send(JSON.stringify({
                type: 'feedback',
                message: feedbackToSend
              }))
            } catch (e) {
              logger.error('Web Socket send error: ' + e)
              return
            }

            feedbackToSend = ''
          }
        }
      } else {
        logger.warn('Not using Tidal')
      }
    })

prog.parse(process.argv)
