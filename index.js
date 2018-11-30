const { promisify } = require('util');

const log = require('loglevel');
const emoji = require('node-emoji');

const { DockerNotInstalledError, TryPackageError } = require('./errors');
const DockerManager = require('./docker-manager.js');

// Import exec and promisify it
const exec = promisify(require('child_process').exec);

function parseInstalledPackages(msg) {
  const regex = / ([^\s]+)@(.*)/gm;
  const matches = regex.exec(msg);
  const packages = [];
  while ((m = regex.exec(msg)) !== null) {
    if (m.index === regex.lastIndex) {
        regex.lastIndex++;
    }
    packages.push(m[0])
  }
  return packages;
}

async function tryPackage(packages) {
    log.setLevel('info');
    
    const docker = new DockerManager();
    await docker.ping();

    log.info(`=> ${emoji.get('hourglass_flowing_sand')} Setting up environment`);

    await docker.pullImage();
    await docker.createContainer();
    
    let nodeVersion = await docker.execute(['node', '-v']);
    await docker.execute(['cd', '/tmp']);
    await docker.execute(['mkdir', 'test']);
    await docker.execute(['cd', 'test']);
    await docker.execute(['npm', 'init', '-y']);
    
    await docker.execute(['npm', 'i', ...packages]);
    log.info(`=> ${emoji.get('package')} Using NodeJS ${nodeVersion.replace('\n', '')}`)
    await docker.execute(['node']);
    await docker.attachStdin();
}

module.exports = { 
    tryPackage,
    DockerNotInstalledError,
    TryPackageError
};