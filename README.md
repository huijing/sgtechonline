# SGTech Goes Online

A side-project attempting to build a customisable broadcasting application for streaming online meetups. In a sense, this is not limited to just Singapore but project author is based in Singapore so ¯\\\_(ツ)_/¯

Anyway, this is largely because of COVID-19. It is possible that you're here after this whole thing has blown over, or gotten so bad that the world has ended, or something in between.

*Update: 24 March 2020*  
There's probably going to be a major rewrite soon, because the original code this project was based off has numerous implementations I don't agree with.

## OpenTok, the technology behind the app

The OpenTok live streaming feature lets you broadcast an OpenTok session to an HTTP live streaming (HLS) stream. More clients can simultaneously view this stream than can view a live interactive OpenTok session. Also, clients that do not support WebRTC (such as Safari) can view the HLS stream.

HLS playback is not supported in all browsers. However, there are a number of plugins, such as <a href="https://flowplayer.org/">Flowplayer</a>, that provide cross-browser support (using Flash
Player in browsers that do not provide direct HLS support).

**NOTE**: The viewer limits do not apply to HLS, since all publishing streams are transcoded to a single HLS stream that can be accessed from an HLS player. The expected latency for HLS is 10-15 seconds. When the host clicks the broadcast button, a link is provided, which the host can then share with all prospective viewers. The link directs the viewer to another page within the application that streams the broadcast feed.

This guide has the following sections:

* [Prerequisites](#prerequisites): A checklist of everything you need to get started.
* [Exploring the code](#exploring-the-code): This describes the application code design, which uses recommended best practices to implement the OpenTok Broadcast app features.

## Prerequisites

To be prepared to develop your OpenTok Broadcast app:

1. Review the [OpenTok.js](https://tokbox.com/developer/sdks/js/) requirements.
2. Your app will need an OpenTok **API Key** and **API Secret**, which you can get from the [OpenTok Developer Dashboard](https://dashboard.tokbox.com/). Set the API Key and API Secret in `config.json`, which can be renamed from [example.config.json](./example.config.json). 

To run the application, run the following commands:

```
$ npm i
$ node server.js
```

_**IMPORTANT:** In order to deploy an OpenTok Broadcast app, your web domain must use HTTPS._

The web page that loads the application must be served over HTTP/HTTPS. Browser security limitations prevent you from publishing video using a `file://` path, as discussed in the OpenTok.js [Release Notes](https://www.tokbox.com/developer/sdks/js/release-notes.html#knownIssues).

To support clients running [Chrome 47 or later](https://groups.google.com/forum/#!topic/discuss-webrtc/sq5CVmY69sc), HTTPS is required. A web server such as [MAMP](https://www.mamp.info/) or [XAMPP](https://www.apachefriends.org/index.html) will work, or you can use a cloud service such as [Heroku](https://www.heroku.com/) to host the application.

## Exploring the code

While TokBox hosts [OpenTok.js](https://tokbox.com/developer/sdks/js/), you must host the application yourself. This allows you to customize the app as desired. For more details about the APIs used to develop this application, see the [OpenTok.js Reference](https://tokbox.com/developer/sdks/js/reference/).

### Main application files

* **[server.js](./server.js)**: The server configures the routes for the host, guests, and viewers.

* **[opentok-api.js](./services/opentok-api.js)**: Configures the **Session ID**, **Token**, and **API Key**, creates the OpenTok session, and generates tokens for hosts, guests, and viewers. Set the API Key and API Secret in [config.json](./config.json).

* **[broadcast-api.js](./services/broadcast-api.js)**: Starts and ends the broadcast.

* **[host.js](./public/js/host.js)**: The host is the individual who controls and publishes the broadcast, but does not control audio or video for guests or viewers. The host uses the OpenTok [Signaling API](https://www.tokbox.com/developer/guides/signaling/js/) to send the signals to all clients in the session.

* **[guest.js](./public/js/guest.js)**: Guests can publish in the broadcast. They can control their own audio and video. The application does not include the ability for the host to control whether guests are broadcasting, though the host does have a moderator token that can be used for that purpose.

* **[viewer.js](./public/js/viewer.js)**: Viewers can only view the broadcast.

* **[broadcast.js](./public/js/broadcast.js)**: Plays the broadcast feed.

* **[CSS files](./public/css)**: Defines the client UI style.

### Server

The methods in [server.js](./server.js) include the host, guest, and viewer routes, as well as the broadcast start and end routes. Each of the host, guest, and viewer routes retrieves the credentials and creates the token for each user type (moderator, publisher, subscriber) defined in [opentok-api.js](./services/opentok-api.js):

```javascript
const tokenOptions = userType => {

  const role = {
    host: 'moderator',
    guest: 'publisher',
    viewer: 'subscriber',
  }[userType];

  return { role };
};
```

The credentials are embedded in an EJS template as JSON. For example, the following host route is configured in server.js:

```javascript
app.get('/host', (req, res) => {
  api.getCredentials('host')
    .then(credentials => res.render('pages/host', {
      credentials: JSON.stringify(credentials)
    }))
    .catch(error => res.status(500).send(error));
});
```

The credentials are then retrieved in [host.js](./public/js/host.js) and used to connect to the host to the session:

```javascript
  var getCredentials = function () {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  . . .

  var init = function () {

    . . .

    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);
    var publisher = initPublisher();

    session.connect(credentials.token, function (error) {

      . . .

    });
  };
```

When the web page is loaded, those credentials are retrieved from the HTML and are used to initialize the session.


### Guest

The functions in [guest.js](./public/js/guest.js) retrieve the credentials from the HTML, subscribe to the host stream and other guest streams, and publish audio and video to the session.


### Viewer

The functions in [viewer.js](./public/js/viewer.js) retrieve the credentials from the HTML, connect to the session and subscribe after receiving a signal from the host indicating the broadcast has started, and monitor broadcast status. Once the broadcast begins, the viewer can see the host and guests. Each viewer uses the OpenTok [Signaling API](https://www.tokbox.com/developer/guides/signaling/js/) to receive the signals sent in the broadcast.


### Host

The methods in [host.js](./public/js/host.js) retrieve the credentials from the HTML, set the state of the broadcast and update the UI, control the broadcast stream, subscribe to the guest streams, create the URL for viewers to watch the broadcast, and signal broadcast status.

The host UI includes an input field to add an [RTMP stream](https://tokbox.com/developer/beta/rtmp-broadcast/), a button to start and end the broadcast, as well as a control to get a sharable link that can be distributed to all potential viewers to watch the CDN stream.

The host makes calls to the server, which calls the OpenTok API to start and end the broadcast. Once the broadcast ends, the client player will recognize an error event and display a message that the broadcast is over.

For more information, see [Initialize, Connect, and Publish to a Session](https://tokbox.com/developer/concepts/connect-and-publish/).

The following line in host.js creates a control that allows the host to copy the URL of the CDN stream to the clipboard for distribution to potential viewers:


```javascript
  var init = function () {
    var clipboard = new Clipboard('#copyURL');

    . . .

    });
  };

```

The following method in host.js sets up the publisher session for the host, configures a custom UI with controls for the publisher role associated with the host, and sets up event listeners for the broadcast button.

```javascript
  var publishAndSubscribe = function (session, publisher) {
    session.publish(publisher);
    addPublisherControls(publisher);
    setEventListeners(session, publisher);
  };
```

When the broadcast button is clicked, the `startBroadcast()` method is invoked and submits a request to the server endpoint to begin the broadcast. The server endpoint relays the session ID to the [OpenTok HLS Broadcast REST](https://tokbox.com/developer/rest/#start_broadcast) `/broadcast/start` endpoint, which returns broadcast data to the host. The broadcast data includes the broadcast URL in its JSON-encoded HTTP response:

```javascript
  var startBroadcast = function (session) {

    . . .

    http.post('/broadcast/start', { sessionId: session.sessionId })
      .then(function (broadcastData) {
        broadcast = R.merge(broadcast, broadcastData);
        updateStatus(session, 'active');

        . . .

      }
  };
```


The `startBroadcast()` method subsequently calls the `updateStatus()` method with the broadcast status. The `updateStatus()` method uses the [OpenTok Signaling API](https://www.tokbox.com/developer/guides/signaling/js/) to notify the live viewers who are subscribed to the session that the broadcast has started:

```javascript
  var updateStatus = function (session, status) {

    . . .

    signal(session, broadcast.status);
  };
```


The broadcast data includes both the URL for the CDN stream and a timestamp indicating when the video should begin playing. The `init()` method in [broadcast-api.js](./services/broadcast-api.js) compares this timestamp to the current time to determine when to play the video. It either begins to play immediately, or sets a timeout to play at the appropriate future time:

```javascript
  var init = function () {

    var broadcast = getBroadcastData();
    if (broadcast.availableAt <= Date.now()) {
      play(broadcast.url);
    } else {
      setTimeout(function () { play(broadcast.url); },
        broadcast.availableAt - Date.now());
    }

  };
```


When the broadcast is over, the `endBroadcast()` method in host.js submits a request to the server, which invokes the [OpenTok Broadcast API](https://tokbox.com/developer/rest/#stop_broadcast) `/broadcast/stop` endpoint, which terminates the CDN stream. This is a recommended best practice, as the default is that broadcasts remain active until a 120-minute timeout period has completed.
