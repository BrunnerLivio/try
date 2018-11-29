const { promisify } = require('util');

const uuid = require('uuid/v1');

const Docker = require('dockerode');
const log = require('loglevel');

const { DockerNotInstalledError, TryPackageError } = require('./errors');
const { tryAndLog } = require('./util');
const errorMessages = require('./error-messages');

// Import exec and promisfiy it
const exec = promisify(require('child_process').exec);

/**
 * Checks if the given docker path is executable.
 * If it is not executeable, it throws an exception.
 * 
 * @throws {DockerNotInstalledError} Gets thrown when the given path could not get executed
 * @param {string} dockerPath The executable docker program
 */
 async function checkDocker(dockerPath) {
    try {
        await exec(dockerPath);
    } catch(err) {
        throw new DockerNotInstalledError(
            errorMessages.DOCKER_NOT_INSTALLED
        );
    }
}

async function spawnNodeContainer(nodeVersion = 'latest') {
    log.info(`=> Pulling node:${nodeVersion}`);
    const imageName = `node:${nodeVersion}`;
    
    const docker = new Docker();
    await docker.pull(imageName);
    
    const containerUUID = uuid().split('-')[0];
    const containerName = `try-package-${containerUUID}`;
    log.info(`=> Creating container ${containerName}`);

    return docker.createContainer({ Image: imageName, Cmd: ['node'], name: containerName, Tty: true, OpenStdin: true })
}

async function executeCommand(command, container) {
    var options = {
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true
    };
  
    const exec = await container.exec(options);
    return new Promise(async (resolve, reject) => {
        await exec.start(async (err, stream) => {
            if (err) return reject();
            let message;
            stream.on('data', data => message += data.toString());
            stream.on('end', () => resolve(message));
        });
    });
}

var previousKey,
    CTRL_P = '\u0010',
    CTRL_Q = '\u0011';

function handler(err, container) {
  var attach_opts = {stream: true, stdin: true, stdout: true, stderr: true};

  container.attach(attach_opts, function handler(err, stream) {
    // Show outputs
    stream.pipe(process.stdout);

    // Connect stdin
    var isRaw = process.isRaw;
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.pipe(stream);

    process.stdin.on('data', function(key) {
      // Detects it is detaching a running container
      if (previousKey === CTRL_P && key === CTRL_Q) exit(stream, isRaw);
      previousKey = key;
    });

    container.start(function(err, data) {
      resize(container);
      process.stdout.on('resize', function() {
        resize(container);
      });

      container.wait(async function(err, data) {
        exit(stream, isRaw);
        await container.remove();
      });
    });
  });
}

// Resize tty
function resize (container) {
  var dimensions = {
    h: process.stdout.rows,
    w: process.stderr.columns
  };

  if (dimensions.h != 0 && dimensions.w != 0) {
    container.resize(dimensions, function() {});
  }
}

// Exit container
function exit (stream, isRaw) {
  process.stdout.removeListener('resize', resize);
  process.stdin.removeAllListeners();
  process.stdin.setRawMode(isRaw);
  process.stdin.resume();
  stream.end();
  process.exit();
}

async function tryPackage(packages) {
    log.setLevel('debug');
    await tryAndLog(checkDocker('docker'));
    const container = await spawnNodeContainer();
    log.info('=> Starting container');
    await container.start();
    log.info('=> Installing packages');
    await executeCommand(['cd', '/tmp'], container);
    await executeCommand(['mkdir', 'test'], container);
    await executeCommand(['cd', 'test'], container);
    await executeCommand(['npm', 'init', '-y'], container);
    const message = await executeCommand(['npm', 'i', ...packages], container);
    log.debug(message);
    log.info('=> Have fun :)');
    await executeCommand(['node'], container);
    handler(null, container);
}

module.exports = { 
    tryPackage,
    DockerNotInstalledError,
    TryPackageError
};