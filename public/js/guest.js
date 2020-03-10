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
   * Create an OpenTok publisher object
   */


  var initPublisher = function initPublisher() {
    var query = new URLSearchParams(window.location.search);
    var properties = Object.assign({
      name: query.get('name'),
      insertMode: 'after'
    }, insertOptions);
    return OT.initPublisher('hostDivider', properties);
  };
  /**
   * Subscribe to a stream
   */


  var subscribe = function subscribe(session, stream) {
    var name = stream.name;
    var insertMode = name === 'host' ? 'before' : 'after';
    var properties = Object.assign({
      name: name,
      insertMode: insertMode
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

  var addPublisherControls = function addPublisherControls(publisher) {
    var publisherContainer = document.getElementById(publisher.element.id);
    var el = document.createElement('div');
    var controls = ['<div class="publisher-controls-container">', '<div id="publishVideo" class="control video-control"></div>', '<div id="publishAudio" class="control audio-control"></div>', '</div>'].join('\n');
    el.innerHTML = controls;
    publisherContainer.appendChild(el.firstChild);
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
  };
  /**
   * Start publishing our audio and video to the session. Also, start
   * subscribing to other streams as they are published.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */


  var publishAndSubscribe = function publishAndSubscribe(session, publisher) {
    var streams = 1;
    session.publish(publisher);
    addPublisherControls(publisher);
    session.on('streamCreated', function (event) {
      subscribe(session, event.stream);
      streams++;

      if (streams > 3) {
        document.getElementById('videoContainer').classList.add('wrap');
      }
    });
    session.on('streamDestroyed', function (event) {
      subscribe(session, event.stream);
      streams--;

      if (streams < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');
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
    document.getElementById('publishVideo').addEventListener('click', function () {
      toggleMedia(publisher, this);
    });
    document.getElementById('publishAudio').addEventListener('click', function () {
      toggleMedia(publisher, this);
    });
  };

  var init = function init() {
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