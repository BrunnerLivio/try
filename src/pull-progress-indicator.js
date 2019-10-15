const logUpdate = require('log-update');
const { green, cyan, yellow } = require('colorette');
const emoji = require('node-emoji');

/**
 * Some status names are long; this map has shorter names!
 */
const SHORT_NAME_STATUS = {
    'pulling fs layer': 'Preparing',
    'download complete': 'Downloaded',
    'pull complete': 'Completed',
    'retry': 'Retrying'
};

/**
 * Maximum column length for status 
 */
const STATUS_STRING_MAX_LENGTH = 25;

/**
 * Cached emoji, so it needn't be fetched repeatedly!
 */
const PACKAGE_EMOJI = emoji.get('package');


/**
 * Starts up a progress bar for the `docker pull` operation, parses the event stream from dockerode to get the progress info.
 */
class PullProgressIndicator {
    constructor() {
        this._chunkInfo = null;
    }

    /**
     * Gets shortened status name, because some status names can be a wee bit long.
     * 
     * @param {string} status 
     */
    _getShortenedStatus(status) {
        if (!status) return '';

        // Special case for retries
        if (status.includes('retry')) return SHORT_NAME_STATUS.retry;

        return SHORT_NAME_STATUS[status.toLowerCase()] || status;
    }

    /**
     * Uses `log-update` to update the progress information on the terminal
     */
    _redrawProgress() {
        if (this._chunkInfo === null) {
            // TODO: Should we persist this? https://www.npmjs.com/package/log-update#logupdatedone
            return logUpdate.clear();
        }

        const chunkProgress = Object.keys(this._chunkInfo).map(id => {
            const { status, progress } = this._chunkInfo[id];
            const chunkPart = `${PACKAGE_EMOJI} ${yellow(id)}`;

            // Padding because even columns are <3 
            const statusPart = green(this._getShortenedStatus(status).padEnd(STATUS_STRING_MAX_LENGTH));

            const progressBarPart = cyan(progress || '');

            return `${chunkPart} | ${statusPart} | ${progressBarPart}`;
        })
        .join(`\n`);

        return logUpdate(chunkProgress);

    }

    /**
     * Updates status, given an event from dockerode 
     * 
     * @param {Object} event
     * @param {String} event.status 
     * @param {String} [event.id=undefined]
     * @param {Object} [event.progressDetail=undefined]
     * @param {Object} [event.progress=undefined]
     */
    update(event) {
        const { progressDetail, status, progress, id } = event || {};
        if (!progressDetail) return;

        // First time chunks are being encountered..
        if (!this._chunkInfo) this._chunkInfo = {};

        this._chunkInfo[id] = { progressDetail, status, progress };
        this._redrawProgress();
    }

    /**
     * Stops the progress bar and clears the terminal
     */
    stop() {
        this._chunkInfo = null;
        this._redrawProgress();
    }
}

module.exports = PullProgressIndicator;