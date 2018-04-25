"use strict";

const winston = require('winston');

exports.createLogger = function createLogger(opts) {

    opts = opts || {
        colorize: true
    };

    var config = {
        levels: {
            error: 0,
            debug: 1,
            warn: 2,
            data: 3,
            info: 4,
            verbose: 5,
            silly: 6
        },
        colors: {
            error: 'red',
            debug: 'blue',
            warn: 'yellow',
            data: 'grey',
            info: 'green',
            verbose: 'cyan',
            silly: 'magenta'
        }
    };
    var logger = new(winston.Logger)({
        transports: [
            new(winston.transports.Console)(opts)
        ], 
    });

    return logger;
};



// var myLogger = new (winston.Logger)({
//   transports: [
//     // colorize the output to the console
//     new (winston.transports.Console)()
//   ],
//   levels: config.levels,
//   colors: config.colors
// });
