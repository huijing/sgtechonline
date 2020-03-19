"use strict";

(function () {
  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  var insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false
  };
  /**
   * Get our OpenTok API Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */

  var getCredentials = function getCredentials() {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };
  /**
   * Subscribe to a stream
   * @returns {Object} A subscriber object
   */


  var subscribe = function subscribe(session, stream) {
    console.log(stream);
    var name = stream.name;
    var insertMode = name === 'Host' ? 'before' : 'after';
    var properties = Object.assign({
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


  var checkBroadcastStatus = function checkBroadcastStatus(session) {
    session.signal({
      type: 'broadcast',
      data: 'status'
    });
  };
  /**
   * Update the banner based on the status of the broadcast (active or ended)
   */


  var updateBanner = function updateBanner(status) {
    var banner = document.getElementById('banner');
    var bannerText = document.getElementById('bannerText');

    if (status === 'active') {
      banner.classList.add('hidden');
    } else if (status === 'ended') {
      bannerText.classList.add('ended');
      bannerText.innerHTML = 'The broadcast has ended.';
      banner.classList.remove('hidden');
    }
  };
  /**
   * Load previous chat history, if available
   */


  var initChat = function initChat(db, status) {
    if (status === 'active') {
      document.getElementById('chatForm').classList.remove('disabled');
      document.getElementById('chatInput').removeAttribute('disabled');
      db.allDocs({
        include_docs: true,
        attachments: true
      }).then(function (result) {
        var messagesArray = result.rows;
        var msgHistory = document.getElementById('chatHistory');
        messagesArray.forEach(function (message) {
          var msg = document.createElement('p');
          msg.textContent = message.doc.content;
          msg.className = message.doc.className;
          msgHistory.appendChild(msg);
        });
        msgHistory.scroll({
          top: msgHistory.scrollHeight,
          behavior: 'smooth'
        });
      })["catch"](function (err) {
        console.log(err);
      });
    } else if (status === 'ended') {
      document.getElementById('chatForm').classList.add('disabled');
      document.getElementById('chatInput').setAttribute('disabled');
      db.destroy().then(function (response) {
        console.log(response);
      })["catch"](function (err) {
        console.log(err);
      });
    }
  };

  var trackChat = function trackChat(content, className, db) {
    var message = {
      '_id': Date.now().toString(),
      'content': content,
      'className': className
    };
    db.put(message).then(function () {
      return db.allDocs({
        include_docs: true
      });
    }).then(function (response) {
      console.log(response);
    })["catch"](function (err) {
      console.log(err);
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
  /**
   * Listen for events on the OpenTok session
   */


  var setEventListeners = function setEventListeners(session, db) {
    var streams = [];
    var subscribers = [];
    var broadcastActive = false;
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
      var index = streams.indexOf(event.stream);
      streams.splice(index, 1);

      if (streams.length < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');
      }
    });
    /** Listen for a broadcast status update from the host */

    session.on('signal:broadcast', function (event) {
      var status = event.data;
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

      initChat(db, status);
      updateBanner(status);
    });
    /** Listen for msg type signal events and update chat log display */

    session.on('signal:msg', function signalCallback(event) {
      var content = event.data;
      var className = event.from.connectionId === session.connection.connectionId ? 'self' : 'others';
      updateChat(content, className);
      trackChat(content, className, db);
    });
    var chat = document.getElementById('chatForm');
    var msgTxt = document.getElementById('chatInput');
    chat.addEventListener('submit', function (event) {
      event.preventDefault();

      if (broadcastActive) {
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
      }
    }, false);
  };

  var init = function init() {
    var credentials = getCredentials();
    var props = {
      connectionEventsSuppressed: true
    };
    var session = OT.initSession(credentials.apiKey, credentials.sessionId, props);
    var db = new PouchDB('chatLog');
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
})();