const exists = path => {
  try {
    require.resolve(path)
    return true
  } catch (err) {
    return false
  }
}

module.exports = {
  ...require('stream'),
  ...(!exists('stream/web') ? require('web-streams-polyfill') : require('stream/web'))
}