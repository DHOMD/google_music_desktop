/*!
Google Play Music Desktop Player
Version: v4.6.1
API Version: v1.1.0
Compiled: Sat, 14 Jul 2018 08:38:36 GMT
Copyright (C) 2018 Samuel Attard
This software may be modified and distributed under the terms of the MIT license.
 */
'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _electron = require('electron');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

global.isGPM = true;

require('../../generic');

// Initialize the global Logger to forward to the main process.
window.Logger = _electron.remote.getGlobal('Logger');
Logger.debug('Renderer process logger initialized.');

// DEV: Hold all Emitter events until the GPM external assets have been loaded.
Emitter.ready = false;
var waitingQueue = [];
window.wait = function (fn) {
  if (Emitter.ready) {
    fn();
  } else {
    waitingQueue.push(fn);
  }
};

// DEV: Polyfill window.open to be shell.openExternal
window.open = function (url) {
  return _electron.remote.shell.openExternal(url);
};

var service = Settings.get('service');

require('./playback');
require('./interface/' + (service === 'youtube-music' ? 'ytm' : 'gpm'));
require('./chromecast');
require('./runtime');

var serviceReady = function serviceReady() {
  if (service === 'youtube-music') {
    return document.querySelector('.ytmusic-player-bar') && document.querySelector('video');
  }
  // Google Play Music
  return document.querySelector('#material-vslider') && document.querySelectorAll('audio')[1];
};

// DEV: We need to wait for the page to load sufficiently before we can load
//      gmusic.js and its child libraries
var waitForExternal = setInterval(function () {
  if (serviceReady()) {
    clearInterval(waitForExternal);

    if (service === 'youtube-music') {
      var YTMusic = require('ytmusic.js');
      window.GMusic = YTMusic;
      window.GPM = new YTMusic();
      require('./mock-gpusic-ui');
      // TODO: Implement theming support
      window.GPMTheme = {
        updateTheme: function updateTheme() {},
        enable: function enable() {},
        disable: function disable() {}
      };
    } else {
      var GMusic = require('gmusic.js');
      window.GMusic = GMusic;
      // Google Play Music
      require('gmusic-ui.js')(GMusic);
      require('gmusic-mini-player.js')(GMusic);
      var GMusicTheme = require('gmusic-theme.js');

      window.GPM = new GMusic();
      window.GPMTheme = new GMusicTheme();
    }

    /*
    Move to magical file
    */
    if (window.GPM.search) {
      window.GPM.search.performSearchAndPlayResult = function (searchText, result) {
        window.GPM.search.performSearch(searchText).then(function () {
          return window.GPM.search.playResult(result);
        });
      };
    }

    /*
    Fix scrollbars
    */
    _electron.remote.getCurrentWebContents().insertCSS('::-webkit-scrollbar,::shadow ::-webkit-scrollbar{width:9px;background:0 0}::-webkit-scrollbar-track,::shadow ::-webkit-scrollbar-track{background-color:rgba(0,0,0,.25)}::-webkit-scrollbar-track:hover,::shadow ::-webkit-scrollbar-track:hover{background-color:rgba(0,0,0,.35)}::-webkit-scrollbar-track:active,::shadow ::-webkit-scrollbar-track:active{background-color:rgba(0,0,0,.25)}::-webkit-scrollbar-thumb,::shadow ::-webkit-scrollbar-thumb{background-color:rgba(0,0,0,.3);border-radius:0}::-webkit-scrollbar-thumb:hover,::shadow ::-webkit-scrollbar-thumb:hover{background-color:rgba(0,0,0,.4)}::-webkit-scrollbar-thumb:active,::shadow ::-webkit-scrollbar-thumb:active{background-color:rgba(0,0,0,.4)}' // eslint-disable-line
    );

    Emitter.ready = true;
    _lodash2.default.forEach(waitingQueue, function (fn) {
      try {
        fn();
      } catch (e) {
        Logger.error('Emitter fn() threw exception.', e.stack);
      }
    });
    // TODO: This never took off, comment out for now
    // Settings.set('gpmdp_connect_email', window.gbar._CONFIG[0][10][5]);
  }
}, 10);

if (_electron.remote.getGlobal('DEV_MODE')) window.__devtron = { require: require, process: process };