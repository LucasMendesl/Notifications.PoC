module.exports = (rawMsg, newVersion) => {
    const message = String(rawMsg)
    return message.replace(/{{currentTag}}/g, newVersion)
  }