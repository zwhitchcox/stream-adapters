const browserWebStreams = typeof ReadableStream === "undefined" ? require('web-streams-polyfill') : window

module.exports = {
  ...require('stream-browserify'),
  ...browserWebStreams,
}