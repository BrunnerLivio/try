const Docker = require('dockerode');
const log = require('loglevel');
const uuid = require('uuid/v1');

const CTRL_P = '\u0010';
const CTRL_Q = '\u0011';

module.exports = class DockerManager {
    constructor() {
        this.docker = new Docker();
    }

   _generateContainerName() {
        const containerUUID = uuid().split('-')[0];
        return `try-package-${containerUUID}`;
   }
   _resize () {
        const dimensions = {
            h: process.stdout.rows,
            w: process.stderr.columns
        };
    
        if (dimensions.h != 0 && dimensions.w != 0) {
            this.container.resize(dimensions, () => {});
        }
    }

    _exit (stream) {
        process.stdout.removeListener('resize', this._resize);
        process.stdin.removeAllListeners();
        process.stdin.setRawMode(this.isRaw);
        process.stdin.resume();
        stream.end();
        process.exit();
    }

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
    }

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

    async attachStdin() {
        const attach_opts = {stream: true, stdin: true, stdout: true, stderr: true};
        return new Promise((resolve, reject) => {
            this.container.attach(attach_opts, async (err, stream) => {
                if(err) return reject(err);
                this._connectStd(stream);

                this._resize();
                process.stdout.on('resize', () => this._resize());
          
                await this.container.wait();
                this._exit(stream);
                await this.container.remove();
                resolve();
            });
        });
        
    }
}
