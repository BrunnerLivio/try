class TryPackageError extends Error { }

class DockerNotInstalledError extends TryPackageError { }

module.exports = { TryPackageError, DockerNotInstalledError };