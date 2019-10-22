const uuid = require('uuid/v1');

/**
 * Generates an unique container name
 */
function getContainerName() {
  const containerUUID = uuid().split("-")[0];
  return `try-package-${containerUUID}`;
}

module.exports = { getContainerName };
