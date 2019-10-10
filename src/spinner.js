const emoji = require('node-emoji');
const { Spinner } = require('cli-spinner');

let spinner = null;

function title(message) {
    return `=> ${emoji.get('hourglass_flowing_sand')} ${message} %s`;
}

function start({verbosity = 2, message = 'Setting up environment'} = {}) {
    if (verbosity > 2) return;
    if (spinner) return;

    spinner = new Spinner(title(message));
    spinner.start();
}

function stop() {
    spinner && spinner.stop(true);
}

function update(message) {
    spinner && spinner.setSpinnerTitle(title(message));
}

module.exports = {
    start,
    stop,
    update
};
