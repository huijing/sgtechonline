(function () {

  /** The state of things */
  let broadcast = { status: 'waiting', streams: 1, rtmp: false };

  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  const insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false
  };

  /**
   * Get our OpenTok http Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */
  const getCredentials = function () {
    const el = document.getElementById('credentials');
    const credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  /**
   * Create an OpenTok publisher object
   */
  const initPublisher = function () {
    let query = new URLSearchParams(window.location.search)
    const properties = Object.assign({
      name: query.get('name'),
      style: { nameDisplayMode: "on" },
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
  const signal = function (session, status, to) {
    const signalData = Object.assign({}, { type: 'broadcast', data: status }, to ? { to } : {});
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
  const getBroadcastUrl = function (params) {
    const buildQueryString = function (query, key) {
      return [query, key, '=', params[key], '&'].join('');
    };
    const queryString = Object.keys(params).reduce(buildQueryString, '?').slice(0, -1);
    return [window.location.host, '/broadcast', queryString].join('');
  };

  /**
   * Set the state of the broadcast and update the UI
   */
  const updateStatus = function (session, status) {
    const startStopButton = document.getElementById('startStop');
    const playerUrl = getBroadcastUrl({url: broadcast.url, availableAt: broadcast.availableAt});
    const displayUrl = document.getElementById('broadcastURL');
    const rtmpActive = document.getElementById('rtmpActive');

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
  const urlCopied = function () {
    const notice = document.getElementById('copyNotice');
    notice.classList.remove('invisible');
    setTimeout(function () {
      notice.classList.add('invisible');
    }, 1500);
  };

  const validRtmp = function () {
    const server = document.getElementById('rtmpServer');
    const stream = document.getElementById('rtmpStream');

    const serverDefined = !!server.value;
    const streamDefined = !!stream.value;
    const invalidServerMessage = 'The RTMP server url is invalid. Please update the value and try again.';
    const invalidStreamMessage = 'The RTMP stream name must be defined. Please update the value and try again.';

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
    return { serverUrl: server.value, streamName: stream.value };
  };

  const hideRtmpInput = function () {
    ['rtmpLabel', 'rtmpError', 'rtmpServer', 'rtmpStream'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
  };

  /**
   * Make a request to the server to start the broadcast
   * @param {String} sessionId
   */
  const startBroadcast = function (session) {
    const rtmp = validRtmp();
    if (!rtmp) {
      return;
    }

    hideRtmpInput();

    http.post('/broadcast/start', { sessionId: session.sessionId, streams: broadcast.streams, rtmp: rtmp })
    .then(function (broadcastData) {
      broadcast = {...broadcast, ...broadcastData};
      updateStatus(session, 'active');
    }).catch(function (error) {
      console.log(error);
    });
  };

  /**
   * Make a request to the server to stop the broadcast
   * @param {String} sessionId
   */
  const endBroadcast = function (session) {
    http.post('/broadcast/end')
    .then(function () {
      updateStatus(session, 'ended');
    })
    .catch(function (error) {
      console.log(error);
    });
  };

  /**
   * Subscribe to a stream
   */
  const subscribe = function (session, stream) {
    const properties = Object.assign({
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
  const toggleMedia = function (publisher, el) {
    const enabled = el.classList.contains('disabled');
    el.classList.toggle('disabled');
    publisher[el.id](enabled);
  };

  const updateBroadcastLayout = function () {
    http.post('/broadcast/layout', { streams: broadcast.streams })
    .then(function (result) { console.log(result); })
    .catch(function (error) { console.log(error); });
  };

  /**
   * Receive a message and append it to the message history
   */
  const updateChat = function (content, className) {
    const msgHistory = document.getElementById('chatHistory');
    const msg = document.createElement('p');
    msg.textContent = content;
    msg.className = className;
    msgHistory.appendChild(msg);
  };

  const setEventListeners = function (session, publisher) {
    /** Add click handler to the start/stop button */
    const startStopButton = document.getElementById('startStop');
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
      const currentStreams = broadcast.streams;
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
      const currentStreams = broadcast.streams;
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
      const content = event.data;
      const className = event.from.connectionId === session.connection.connectionId ? 'self' : 'others';
      updateChat(content, className);
    });

    const chat = document.getElementById('chatForm');
    const msgTxt = document.getElementById('chatInput');
    chat.addEventListener('submit', function(event) {
      event.preventDefault();
      session.signal({
        type: 'msg',
        data: `${session.connection.data.split('=')[1]}: ${msgTxt.value}`
      }, function signalCallback(error) {
        if (error) {
          console.error('Error sending signal:', error.name, error.message);
        } else {
          msgTxt.value = '';
        }
      })
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

  const addPublisherControls = function (publisher) {
    const publisherContainer = document.getElementById(publisher.element.id);
    const el = document.createElement('div');
    const controls = [
      '<div class="publisher-controls-container">',
      '<div id="publishVideo" class="control video-control" tabindex="0"></div>',
      '<div id="publishAudio" class="control audio-control" tabindex="0"></div>',
      '</div>',
    ].join('\n');
    el.innerHTML = controls;
    publisherContainer.appendChild(el.firstChild);
  };

  /**
   * The host starts publishing and signals everyone else connected to the
   * session so that they can start publishing and/or subscribing.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  const publishAndSubscribe = function (session, publisher) {
    session.publish(publisher);
    addPublisherControls(publisher);
    setEventListeners(session, publisher);
  };

  const init = function () {
    const clipboard = new ClipboardJS('#copyURL');
    const credentials = getCredentials();
    const props = { connectionEventsSuppressed: true };
    const session = OT.initSession(credentials.apiKey, credentials.sessionId, props);
    const publisher = initPublisher();

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        publishAndSubscribe(session, publisher);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
}());
