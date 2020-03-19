'use strict';

/* eslint-env es6 */

/** Config */
const { apiKey, apiSecret } = require('../config');

/** Imports */
const merge = require('deepmerge');
const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const jwt = require('jsonwebtoken');

// http://bluebirdjs.com/docs/api/promisification.html
Promise.promisifyAll(request);

/** Constants */
const broadcastURL = `https://api.opentok.com/v2/project/${apiKey}/broadcast`;
const updateLayoutURL = id => `https://api.opentok.com/v2/project/${apiKey}/broadcast/${id}/layout`;
const stopBroadcastURL = id => `${broadcastURL}/${id}/stop`;

/**
 * There is currently a ~15 second delay between the interactive session due to the
 * encoding process and the time it takes to upload the video to the CDN.  Currently
 * using a 20-second delay to be safe.
 */
const broadcastDelay = 20 * 1000;

/** Let's store the active broadcast */
let activeBroadcast = {};


// https://tokbox.com/developer/guides/broadcast/#custom-layouts
const horizontalLayout = {
  layout: {
    type: 'custom',
    stylesheet: `stream {
        float: left;
        height: 100%;
        width: 33.33%;
      }`
  }
};

// https://tokbox.com/developer/guides/broadcast/#predefined-layout-types
const bestFitLayout = {
  layout: {
    type: 'bestFit'
  }
};

/**
 * Get auth header
 * @returns {Object}
 */
const headers = () => {
  const createToken = () => {
    const options = {
      issuer: apiKey,
      expiresIn: '1m',
    };
    return jwt.sign({ ist: 'project' }, apiSecret, options);
  };

  return { 'X-OPENTOK-AUTH': createToken() };
};

/** Exports */

/**
 * Start the broadcast and keep the active broadcast in memory
 * @param {String} broadcastSessionId - Spotlight host session id
 * @param {Number} streams - The current number of published streams
 * @param {String} [rtmpUrl] - The (optional) RTMP stream url
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const start = (broadcastSessionId, streams, rtmp, layout) =>
  new Promise((resolve, reject) => {
    if (activeBroadcast.session === broadcastSessionId) {
      resolve(activeBroadcast);
    } else {
      layout = layout || (streams > 3 ? bestFitLayout : horizontalLayout);
      console.log(layout);
      /**
       * This outputs property must be included in the request body
       * in order to broadcast to RTMP streams
       */
      const { serverUrl, streamName } = rtmp;
      const outputs = (!!serverUrl && !!streamName) ?
          { outputs: { hls: {}, rtmp: { serverUrl, streamName } } } :
          {};

      const requestConfig = {
        headers: headers(),
        url: broadcastURL,
        json: true,
        body: merge.all([{ sessionId: broadcastSessionId }, layout, outputs]),
      };

      // Parse the response from the broadcast api
      const setActiveBroadcast = ({ body }) => {
        const broadcastData = {
          id: body.id,
          session: broadcastSessionId,
          rtmp: !!body.broadcastUrls.rtmp,
          url: body.broadcastUrls.hls,
          apiKey: body.partnerId,
          availableAt: body.createdAt + broadcastDelay
        };
        activeBroadcast = broadcastData;
        console.log(broadcastData);

        return Promise.resolve(broadcastData);
      };

      request.postAsync(requestConfig)
        .then(setActiveBroadcast)
        .then(resolve)
        .catch(reject);
    }
  });


/**
 * Dynamically update the broadcast layout
 * @param {Number} streams - The number of active streams in the broadcast session
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const updateLayout = streams =>
  new Promise((resolve, reject) => {
    const id = activeBroadcast.id;

    if (!id) {
      reject({ error: 'No active broadcast session found' });
    }

    const layout = streams > 3 ? bestFitLayout : horizontalLayout;

    const requestConfig = {
      headers: headers(),
      url: updateLayoutURL(id),
      json: true,
      body: (({ type, stylesheet }) => ({ type, stylesheet }))(layout.layout),
    };

    request.putAsync(requestConfig)
      .then(({ body }) => resolve(body))
      .catch(reject);
  });

/**
 * End the broadcast
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const end = () =>
  new Promise((resolve, reject) => {
    const id = activeBroadcast.id;
    if (!id) {
      return reject({ error: 'No active broadcast session found' });
    }
    const requestConfig = () => ({ headers: headers(), url: stopBroadcastURL(id) });
    request.postAsync(requestConfig(id))
      .then(({ body }) => resolve(body))
      .catch(reject)
      .finally(() => { activeBroadcast = null; });
  });

module.exports = {
  start,
  updateLayout,
  end,
};
