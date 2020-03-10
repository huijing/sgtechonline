(function () {
  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  const insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false
  };

  /**
   * Get our OpenTok API Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */
  const getCredentials = function () {
    const el = document.getElementById('credentials');
    const credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  /**
   * Subscribe to a stream
   * @returns {Object} A subscriber object
   */
  const subscribe = function (session, stream) {
    console.log(stream);
    const name = stream.name;
    const insertMode = name === 'Host' ? 'before' : 'after';
    const properties = Object.assign({
      name: name,
      insertMode: insertMode
    }, insertOptions);
    return session.subscribe(stream, 'hostDivider', properties, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };

  /** Ping the host to see if the broadcast has started */
  const checkBroadcastStatus = function (session) {
    session.signal({
      type: 'broadcast',
      data: 'status'
    });
  };

  /**
   * Update the banner based on the status of the broadcast (active or ended)
   */
  const updateBanner = function (status) {
    const banner = document.getElementById('banner');
    const bannerText = document.getElementById('bannerText');

    if (status === 'active') {
      banner.classList.add('hidden');
    } else if (status === 'ended') {
      bannerText.classList.add('ended');
      bannerText.innerHTML = 'The broadcast has ended.';
      banner.classList.remove('hidden');
    }
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

  const trackChat = function (content, db) {
    db.info().then(function (info) {
      console.log(info);
    })

  }

  /**
   * Listen for events on the OpenTok session
   */
  const setEventListeners = function (session, db) {
    let streams = [];
    let subscribers = [];
    let broadcastActive = false;

    /** Subscribe to new streams as they are published */
    session.on('streamCreated', function (event) {
      streams.push(event.stream);
      if (broadcastActive) {
        subscribers.push(subscribe(session, event.stream));
      }
      if (streams.length > 3) {
        document.getElementById('videoContainer').classList.add('wrap');
      }
    });

    session.on('streamDestroyed', function (event) {
      const index = streams.indexOf(event.stream);
      streams.splice(index, 1);
      if (streams.length < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');
      }
    });

    /** Listen for a broadcast status update from the host */
    session.on('signal:broadcast', function (event) {
      const status = event.data;
      broadcastActive = status === 'active';

      if (status === 'active') {
        streams.forEach(function (stream) {
          subscribers.push(subscribe(session, stream));
        });
      } else if (status === 'ended') {
        subscribers.forEach(function (subscriber) {
          session.unsubscribe(subscriber);
        });
      }
      updateBanner(status);
    });

    /** Listen for msg type signal events and update chat log display */
    session.on('signal:msg', function signalCallback(event) {
      console.log(event)
      const content = event.data;
      const className = event.from.connectionId === session.connection.connectionId ? 'self' : 'others';
      updateChat(content, className);
      trackChat(content, db)
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
  };

  const init = function () {
    const credentials = getCredentials();
    const props = { connectionEventsSuppressed: true };
    const session = OT.initSession(credentials.apiKey, credentials.sessionId, props);
    const db = new PouchDB('chatLog');

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        console.log(session.connection);
        setEventListeners(session, db);
        checkBroadcastStatus(session);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
}());
