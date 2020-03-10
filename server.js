const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;
app.use(express.static(`${__dirname}/public`));
app.use(express.json());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

const opentok = require('./services/opentok-api');
const broadcast = require('./services/broadcast-api');

app.get('/', (req, res) => {
  res.render('pages/index')
});

app.get('/viewer', (req, res) => {
  opentok.getCredentials('viewer', req.query.name)
    .then(credentials => res.render('pages/viewer', { credentials: JSON.stringify(credentials) }))
    .catch(error => res.status(500).send(error));
});

app.get('/host', (req, res) => {
  opentok.getCredentials('host', req.query.name)
    .then(credentials => res.render('pages/host', { credentials: JSON.stringify(credentials) }))
    .catch(error => res.status(500).send(error));
});

app.get('/guest', (req, res) => {
  opentok.getCredentials('guest', req.query.name)
    .then(credentials => res.render('pages/guest', { credentials: JSON.stringify(credentials) }))
    .catch(error => res.status(500).send(error));
});

app.get('/broadcast', (req, res) => {
  const url = req.query.url;
  const availableAt = req.query.availableAt;
  res.render('pages/broadcast', { broadcast: JSON.stringify({ url, availableAt }) });
});

app.get('*', (req, res) => {
  res.redirect('/');
});

app.post('/broadcast/start', (req, res) => {
  const sessionId = req.body.sessionId;
  const streams = req.body.streams;
  const rtmp = req.body.rtmp;
  broadcast.start(sessionId, streams, rtmp)
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/layout', (req, res) => {
  const streams = req.body.streams;
  broadcast.updateLayout(streams)
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/end', (req, res) => {
  broadcast.end()
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error));
});

app.listen(process.env.PORT || port, () => console.log(`app listening on port ${port}`));
