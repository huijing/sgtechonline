"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

(function () {
  /** The state of things */
  var broadcast = {
    status: 'waiting',
    streams: 1,
    rtmp: false
  };
  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */

  var insertOptions = {
    width: '100%',
    height: '25%',
    showControls: false
  };
  /**
   * Get our OpenTok http Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */

  var getCredentials = function getCredentials() {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };
  /**
   * Create an OpenTok publisher object
   */


  var initPublisher = function initPublisher() {
    var query = new URLSearchParams(window.location.search);
    var properties = Object.assign({
      name: query.get('name'),
      style: {
        nameDisplayMode: "on"
      },
      insertMode: 'before'
    }, insertOptions);
    return OT.initPublisher('hostDivider', properties);
  };
  /**
   * Send the broadcast status to everyone connected to the session using
   * the OpenTok signaling API
   * @param {Object} session
   * @param {String} status
   * @param {Object} [to] - An OpenTok connection object
   */


  var signal = function signal(session, status, to) {
    var signalData = Object.assign({}, {
      type: 'broadcast',
      data: status
    }, to ? {
      to: to
    } : {});
    session.signal(signalData, function (error) {
      if (error) {
        console.log(['signal error (', error.code, '): ', error.message].join(''));
      } else {
        console.log('signal sent');
      }
    });
  };
  /**
   * Construct the url for viewers to view the broadcast stream
   * @param {Object} params
   * @param {String} params.url The CDN url for the m3u8 video stream
   * @param {Number} params.availableAt The time (ms since epoch) at which the stream is available
   */


  var getBroadcastUrl = function getBroadcastUrl(params) {
    var buildQueryString = function buildQueryString(query, key) {
      return [query, key, '=', params[key], '&'].join('');
    };

    var queryString = Object.keys(params).reduce(buildQueryString, '?').slice(0, -1);
    return [window.location.host, '/broadcast', queryString].join('');
  };
  /**
   * Set the state of the broadcast and update the UI
   */


  var updateStatus = function updateStatus(session, status) {
    var startStopButton = document.getElementById('startStop');
    var playerUrl = getBroadcastUrl({
      url: broadcast.url,
      availableAt: broadcast.availableAt
    });
    var displayUrl = document.getElementById('broadcastURL');
    var rtmpActive = document.getElementById('rtmpActive');
    broadcast.status = status;

    if (status === 'active') {
      startStopButton.classList.add('active');
      startStopButton.innerHTML = 'End Broadcast';
      document.getElementById('urlContainer').classList.remove('hidden');
      displayUrl.innerHTML = playerUrl;
      displayUrl.setAttribute('value', playerUrl);

      if (broadcast.rtmp) {
        rtmpActive.classList.remove('hidden');
      }
    } else {
      startStopButton.classList.remove('active');
      startStopButton.innerHTML = 'Broadcast ended';
      startStopButton.disabled = true;
      rtmpActive.classList.add('hidden');
    }

    signal(session, broadcast.status);
  };
  /**
   * Let the user know that the url has been copied to the clipboard
   */


  var urlCopied = function urlCopied() {
    var notice = document.getElementById('copyNotice');
    notice.classList.remove('invisible');
    setTimeout(function () {
      notice.classList.add('invisible');
    }, 1500);
  };

  var validRtmp = function validRtmp() {
    var server = document.getElementById('rtmpServer');
    var stream = document.getElementById('rtmpStream');
    var serverDefined = !!server.value;
    var streamDefined = !!stream.value;
    var invalidServerMessage = 'The RTMP server url is invalid. Please update the value and try again.';
    var invalidStreamMessage = 'The RTMP stream name must be defined. Please update the value and try again.';

    if (serverDefined && !server.checkValidity()) {
      document.getElementById('rtmpLabel').classList.add('hidden');
      document.getElementById('rtmpError').innerHTML = invalidServerMessage;
      document.getElementById('rtmpError').classList.remove('hidden');
      return null;
    }

    if (serverDefined && !streamDefined) {
      document.getElementById('rtmpLabel').classList.add('hidden');
      document.getElementById('rtmpError').innerHTML = invalidStreamMessage;
      document.getElementById('rtmpError').classList.remove('hidden');
      return null;
    }

    document.getElementById('rtmpLabel').classList.remove('hidden');
    document.getElementById('rtmpError').classList.add('hidden');
    return {
      serverUrl: server.value,
      streamName: stream.value
    };
  };

  var hideRtmpInput = function hideRtmpInput() {
    ['rtmpLabel', 'rtmpError', 'rtmpServer', 'rtmpStream'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
  };
  /**
   * Make a request to the server to start the broadcast
   * @param {String} sessionId
   */


  var startBroadcast = function startBroadcast(session) {
    var rtmp = validRtmp();

    if (!rtmp) {
      return;
    }

    hideRtmpInput();
    http.post('/broadcast/start', {
      sessionId: session.sessionId,
      streams: broadcast.streams,
      rtmp: rtmp
    }).then(function (broadcastData) {
      broadcast = _objectSpread({}, broadcast, {}, broadcastData);
      updateStatus(session, 'active');
    })["catch"](function (error) {
      console.log(error);
    });
  };
  /**
   * Make a request to the server to stop the broadcast
   * @param {String} sessionId
   */


  var endBroadcast = function endBroadcast(session) {
    http.post('/broadcast/end').then(function () {
      updateStatus(session, 'ended');
    })["catch"](function (error) {
      console.log(error);
    });
  };
  /**
   * Subscribe to a stream
   */


  var subscribe = function subscribe(session, stream) {
    var properties = Object.assign({
      name: stream.name,
      insertMode: 'after'
    }, insertOptions);
    session.subscribe(stream, 'hostDivider', properties, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };
  /**
   * Toggle publishing audio/video to allow host to mute
   * their video (publishVideo) or audio (publishAudio)
   * @param {Object} publisher The OpenTok publisher object
   * @param {Object} el The DOM element of the control whose id corresponds to the action
   */


  var toggleMedia = function toggleMedia(publisher, el) {
    var enabled = el.classList.contains('disabled');
    el.classList.toggle('disabled');
    publisher[el.id](enabled);
  };

  var updateBroadcastLayout = function updateBroadcastLayout() {
    http.post('/broadcast/layout', {
      streams: broadcast.streams
    }).then(function (result) {
      console.log(result);
    })["catch"](function (error) {
      console.log(error);
    });
  };
  /**
   * Receive a message and append it to the message history
   */


  var updateChat = function updateChat(content, className) {
    var msgHistory = document.getElementById('chatHistory');
    var msg = document.createElement('p');
    msg.textContent = content;
    msg.className = className;
    msgHistory.appendChild(msg);
    msgHistory.scroll({
      top: msgHistory.scrollHeight,
      behavior: 'smooth'
    });
  };

  var setEventListeners = function setEventListeners(session, publisher) {
    /** Add click handler to the start/stop button */
    var startStopButton = document.getElementById('startStop');
    startStopButton.classList.remove('hidden');
    startStopButton.addEventListener('click', function () {
      if (broadcast.status === 'waiting') {
        startBroadcast(session);
      } else if (broadcast.status === 'active') {
        endBroadcast(session);
      }
    });
    /** Subscribe to new streams as they're published */

    session.on('streamCreated', function (event) {
      var currentStreams = broadcast.streams;
      subscribe(session, event.stream);
      broadcast.streams++;

      if (broadcast.streams > 3) {
        document.getElementById('videoContainer').classList.add('wrap');

        if (broadcast.status === 'active' && currentStreams <= 3) {
          updateBroadcastLayout();
        }
      }
    });
    session.on('streamDestroyed', function () {
      var currentStreams = broadcast.streams;
      broadcast.streams--;

      if (broadcast.streams < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');

        if (broadcast.status === 'active' && currentStreams >= 4) {
          updateBroadcastLayout();
        }
      }
    });
    /** Signal the status of the broadcast when requested */

    session.on('signal:broadcast', function (event) {
      if (event.data === 'status') {
        signal(session, broadcast.status, event.from);
      }
    });
    /** Listen for msg type signal events and update chat log display */

    session.on('signal:msg', function signalCallback(event) {
      var content = event.data;
      var className = event.from.connectionId === session.connection.connectionId ? 'self' : 'others';
      updateChat(content, className);
    });
    var chat = document.getElementById('chatForm');
    var msgTxt = document.getElementById('chatInput');
    chat.addEventListener('submit', function (event) {
      event.preventDefault();
      session.signal({
        type: 'msg',
        data: "".concat(session.connection.data.split('=')[1], ": ").concat(msgTxt.value)
      }, function signalCallback(error) {
        if (error) {
          console.error('Error sending signal:', error.name, error.message);
        } else {
          msgTxt.value = '';
        }
      });
    }, false);
    document.getElementById('copyURL').addEventListener('click', function () {
      urlCopied();
    });
    document.getElementById('publishVideo').addEventListener('click', function () {
      toggleMedia(publisher, this);
    });
    document.getElementById('publishAudio').addEventListener('click', function () {
      toggleMedia(publisher, this);
    });
  };

  var addPublisherControls = function addPublisherControls(publisher) {
    var publisherContainer = document.getElementById(publisher.element.id);
    var el = document.createElement('div');
    var controls = ['<div class="publisher-controls-container">', '<div id="publishVideo" class="control video-control" tabindex="0"></div>', '<div id="publishAudio" class="control audio-control" tabindex="0"></div>', '</div>'].join('\n');
    el.innerHTML = controls;
    publisherContainer.appendChild(el.firstChild);
  };
  /**
   * The host starts publishing and signals everyone else connected to the
   * session so that they can start publishing and/or subscribing.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */


  var publishAndSubscribe = function publishAndSubscribe(session, publisher) {
    session.publish(publisher);
    addPublisherControls(publisher);
    setEventListeners(session, publisher);
  };

  var init = function init() {
    var clipboard = new ClipboardJS('#copyURL');
    var credentials = getCredentials();
    var props = {
      connectionEventsSuppressed: true
    };
    var session = OT.initSession(credentials.apiKey, credentials.sessionId, props);
    var publisher = initPublisher();
    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        publishAndSubscribe(session, publisher);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();