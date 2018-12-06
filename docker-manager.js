const Docker = require('dockerode');
const log = require('loglevel');
const uuid = require('uuid/v1');
const { DockerNotInstalledError } = require('./errors');
const errorMessages = require('./error-messages');

const CTRL_P = '\u0010';
const CTRL_Q = '\u0011';

/**
 * The DockerManager which acts as a wrapper around dockerode
 */
module.exports = class DockerManager {
    /**
     * Initailizes the DockerManager
     */
    constructor() {
        this.docker = new Docker();
    }

    /**
     * Generates an unique container name
     */
   _generateContainerName() {
        const containerUUID = uuid().split('-')[0];
        return `try-package-${containerUUID}`;
   }

   /**
    * Resizes the container when the uses tty resizes
    */
   _resize () {
        const dimensions = {
            h: process.stdout.rows,
            w: process.stderr.columns
        };

        if (dimensions.h != 0 && dimensions.w != 0) {
            this.container.resize(dimensions, () => {});
        }
    }

    /**
     * Exists the given stream and removes all listeners
     * @param {stream} stream The stream to exit
     */
    _exit (stream) {
        process.stdout.removeListener('resize', this._resize);
        process.stdin.removeAllListeners();
        process.stdin.setRawMode(this.isRaw);
        process.stdin.resume();
        stream.end();
    }

    /**
     * Connects the tty stdin / stdout to the given stream
     * @param {Stream} stream The exec stream
     */
    _connectStd(stream) {
        // Show outputs
        stream.pipe(process.stdout);

        // Connect stdin
        this.isRaw = process.isRaw;
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.setRawMode(true);
        process.stdin.pipe(stream);

        process.stdin.on('data', key => {
            if (this.previousKey === CTRL_P && key === CTRL_Q) this._exit(stream);
            this.previousKey = key;
        });
    }

    /**
     * Pulls the given image
     * @param {string} image The image which should get pulled
     * @param {string} version The version of the image which should get pulled 
     */
    pullImage(image = 'node', version = 'latest') {
        this.imageName = `${image}:${version}`;
        log.debug(`=> Pulling ${this.imageName}`);
        return new Promise((resolve, reject) => {
            this.docker.pull(this.imageName, (err, stream) => {
                let message = '';
                if(err) return reject(err);
                stream.on('data', data => message += data);
                stream.on('end', () => resolve(message));
                stream.on('error', err => reject(err));
            });
        });
    }

    /**
     * Creates the container with an unique id
     */
    async createContainer() {
        this.containerName = this._generateContainerName();
        log.debug(`=> Creating container ${this.containerName}`);
        this.container = await this.docker.createContainer({ 
            Image: this.imageName,
            Cmd: ['node'],
            name: this.containerName,
            Tty: true,
            OpenStdin: true });
        log.debug('=> Starting container');
        await this.container.start();
        return this.containerName;
    }

    /**
     * Executes the given program in the Docker container
     * @param {string[]} command The program to execute
     */
    async execute(command) {
          const exec = await this.container.exec({
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true
          });

          return new Promise(async (resolve, reject) => {
              await exec.start(async (err, stream) => {
                  if (err) return reject();
                  let message = '';
                  stream.on('data', data => message += data.toString());
                  stream.on('end', () => resolve(message));
              });
          });
    }

    /**
     * Attaches the stdin and stdout to the Docker node process
     */
    async attachStdin() {
        const attach_opts = {stream: true, stdin: true, stdout: true, stderr: true};
        return new Promise((resolve, reject) => {
            log.debug('=> Attaching stdin')
            this.container.attach(attach_opts, async (err, stream) => {
                if(err) return reject(err);
                this._connectStd(stream);

                this._resize();
                process.stdout.on('resize', () => this._resize());

                await this.container.wait();
                this._exit(stream);
                resolve();
            });
        });
    }

    /**
     * Removes the docker container
     */
    removeContainer() {
        log.debug('=> Removing container');
        return this.container.remove({ force: true });
    }

    /**
     * Ping the Docker API
     * @throws {DockerNotInstalledError} Gets thrown when could not ping Docker API
     */
    async ping() {
        try {
            log.debug('=> Pinging docker');
            return await this.docker.ping();
        } catch(err) {
            throw new DockerNotInstalledError(
                errorMessages.DOCKER_NOT_INSTALLED
            );
        }
    }
}

