
const log = require('loglevel');
const emoji = require('node-emoji');

const { DockerNotInstalledError, TryPackageError } = require('./errors');
const DockerManager = require('./docker-manager.js');
const spinner = require('./spinner');
const PullProgressIndicator = require('./pull-progress-indicator');

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'silent'];

const docker = new DockerManager();

/**
 * Pulls docker image with a progress indicator
 * 
 * @param {string} image 
 * @param {string} version 
 */
async function pullDockerImageWithProgress(image, version) {
    spinner.update('Pulling docker image');

    const pullProgressIndicator = new PullProgressIndicator();

    const message = await docker.pullImage(
        image,
        version,
        // Progress indicator updates
        event => {
            // Stopping spinner so `pullProgressIndicator` could take over stdout
            // TODO: Is there a better way to do this?
            spinner.stop();

            pullProgressIndicator.update(event)
        }
    );

    pullProgressIndicator.stop();

    // Start up spinner, because we're done showing progress!
    spinner.start();

    log.debug('=> Pulled image', message);
}

/**
 * Spawns a docker container, installs the given packages and runs the
 * 'node' process.
 * @param {string[]} packages The packages which should get installed
 * @param {object} [options] The optional options
 * @param {number} [options.verbose=2] Numeric index of the log verbosity from 0 (trace) to 5 (silent)
 * @param {string} [options.image=node] The name of the docker image
 * @param {string} [options.version=latest] The version of the docker image
 * @param {boolean} [options.noCleanup=false] If it should not remove the container
 * @param {boolean} [options.useTypescript] If it should use TypeScript
 */
async function tryPackage(packages = [], options = { }) {
    // options.verbose can be 0, therefor need to be
    // explicitly check if is null
    const verbosity = options.verbose === null ? 2 : options.verbose;
    log.setLevel(LOG_LEVELS[verbosity]);

    // Check if Docker API is available
    await docker.ping();

    spinner.start({verbosity});

    // Update image and create the container
    await pullDockerImageWithProgress(options.image, options.version);

    const containerName = await docker.createContainer(options.useTypescript);

    // Check if node is working
    let nodeVersion = await docker.execute(['node', '-v']);
    nodeVersion = nodeVersion
        .replace(/\n/g, '')
        .replace(/\t/g, '')
        .trim();

    // Install packages
    log.debug('Installing packages');
    spinner.update(`Installing packages ${packages.join(', ')}`);
    await docker.execute(['yarn', 'add', ...packages]);
    spinner.stop();
    
    log.info(`=> ${emoji.get('package')} Using NodeJS ${nodeVersion.replace('\n', '').trim()}`)

    await docker.attachStdin();
    if (options.noCleanup) {
        log.info(`=> Keeping container. Run the container with`);
        log.info(`=> docker start ${containerName} && docker exec -it ${containerName} /bin/bash`)
      } else {
        await docker.removeContainer();
    }
}

module.exports = {
    tryPackage,
    DockerNotInstalledError,
    TryPackageError
};
