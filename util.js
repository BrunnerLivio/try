const log = require('loglevel');
const { TryPackageError } = require('./errors');

function tryAndLog(promise) {
    return promise
        .then(() => true)
        .catch(err => {
            if(err instanceof TryPackageError) {
                log.error(err.message);
                process.exit(1);
            }
            throw err;
        });
}

module.exports = { tryAndLog };