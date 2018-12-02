
const log = require('loglevel');
const emoji = require('node-emoji');

const { DockerNotInstalledError, TryPackageError } = require('./errors');
const DockerManager = require('./docker-manager.js');

// TODO: Implement with program
// function parseInstalledPackages(msg) {
//   const regex = / ([^\s]+)@(.*)/gm;
//   const matches = regex.exec(msg);
//   const packages = [];
//   while ((m = regex.exec(msg)) !== null) {
//     if (m.index === regex.lastIndex) {
//         regex.lastIndex++;
//     }
//     packages.push(m[0])
//   }
//   return packages;
// }

/**
 * Spawns a docker container, installs the given packages and runs the
 * 'node' process.
 * @param {string[]} packages The packages which should get installed 
 * @param {object} [options] The optional options
 * @param {number} [options.verbose=2] Numeric index of the log verbosity from 0 (trace) to 5 (silent)
 * @param {string} [options.image=node] The name of the docker image
 * @param {string} [options.version=latest] The version of the docker image
 */
async function tryPackage(packages, options) {
    log.setLevel(options.verbose || 2);
    
    const docker = new DockerManager();
    // Check if Docker API is available
    await docker.ping();

    log.info(`=> ${emoji.get('hourglass_flowing_sand')} Setting up environment`);

    // Update image and create the container
    const message = await docker.pullImage(options.image, options.version);
    log.trace('=> Pulled image', message);
    await docker.createContainer();
    
    // Check if node is working
    let nodeVersion = await docker.execute(['node', '-v']);

    // Go into tmp directory and init npm
    await docker.execute(['cd', '/tmp']);
    await docker.execute(['mkdir', 'test']);
    await docker.execute(['cd', 'test']);
    await docker.execute(['npm', 'init', '-y']);
    
    // Install packages
    await docker.execute(['npm', 'i', ...packages]);

    log.info(`=> ${emoji.get('package')} Using NodeJS ${nodeVersion.replace('\n', '')}`)

    // Start node and attach to stdin
    await docker.execute(['node']);
    await docker.attachStdin();
    await docker.removeContainer();
}

module.exports = { 
    tryPackage,
    DockerNotInstalledError,
    TryPackageError
};