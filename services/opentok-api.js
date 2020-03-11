'use strict';

/* eslint-env es6 */

/** Config */
const { apiKey, apiSecret } = require('../config');

/** Imports */
const Promise = require('bluebird');
const OpenTok = require('opentok');

// http://bluebirdjs.com/docs/api/promisification.html
const OT = Promise.promisifyAll(new OpenTok(apiKey, apiSecret));

/** Private */
const defaultSessionOptions = { mediaMode: 'routed' };

/**
 * Returns options for token creation based on user type
 * @param {String} userType Host, guest, or viewer
 */
const tokenOptions = userType => {
  const role = {
    host: 'moderator',
    guest: 'publisher',
    viewer: 'subscriber',
  }[userType];

  return { role };
};

/**
 * Create an OpenTok session
 * @param {Object} [options]
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
let activeSession;
const createSession = options =>
  new Promise((resolve, reject) => {
    const setActiveSession = (session) => {
      activeSession = session;
      return Promise.resolve(session);
    };

    options = (typeof options === 'undefined') ? defaultSessionOptions : options;

    OT.createSessionAsync(options)
      .then(setActiveSession)
      .then(resolve)
      .catch(reject);
  });

/**
 * Create an OpenTok token
 * @param {String} userType Host, guest, or viewer
 * @param [String] name Name to display in chat
 * @returns {String}
 */
const createToken = (userType, name, isFocused) => {
  let options = tokenOptions(userType)
  options.data = `username=${name}`
  if (isFocused) {
    options.initialLayoutClassList = ['focus']
  }
  return OT.generateToken(activeSession.sessionId, options)
};

/** Exports */

/**
 * Creates an OpenTok session and generates an associated token
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const getCredentials = (userType, name, isFocused) =>
  new Promise((resolve, reject) => {
    isFocused = !!isFocused;
    if (activeSession) {
      const token = createToken(userType, name, isFocused);
      resolve({ apiKey, sessionId: activeSession.sessionId, token });
    } else {

      const addToken = session => {
        const token = createToken(userType, name);
        return Promise.resolve({ apiKey, sessionId: session.sessionId, token });
      };

      createSession()
        .then(addToken)
        .then(resolve)
        .catch(reject);
    }
  });

module.exports = {
  getCredentials
};
