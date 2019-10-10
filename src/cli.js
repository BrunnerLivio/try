#!/usr/bin/env node

const { tryPackage, TryPackageError } = require('./index');
const log = require('loglevel');

const program = require('commander');
const packageJSON = require('../package.json');

// Setup the CLI options
program
    .description(packageJSON.description)
    .version(packageJSON.version)
    .option('-v, --verbose', 'Verbosity value', (_, total) => total + 1, 0)
    .option('-i, --image [image]', 'The docker image which it should pull from', 'node')
    .option('--image-version [version]', 'Specify the node image version', 'latest')
    .option('--no-cleanup', 'If set to true, the created container will not get cleaned up', false)
    .option('--silent', 'If the program should not print any log statements')
    .parse(process.argv)

const packages = program.args;

// Translates the verbosity parameter to log level verbosity level
// no parameter = 0, -v = 1, -vv = 0, -vvv = 0
let verbose = program.verbose ? 2 - program.verbose : 2;
verbose = verbose < 0 ? 0 : verbose;

// Warn user if no packages are given
!packages.length && (log.error('You must enter the packages you want to use') || process.exit(1));

/**
 * Executes the main program
 */
async function main () {
    try {
        await tryPackage(packages, {
            version: program.imageVersion,
            image: program.image,
            verbose: program.silent ? 5 : verbose,
            noCleanup: !program.cleanup
        });
        process.exit(0);
    } catch(err) {
        // If is expected exception, log it
        if (err instanceof TryPackageError) {
            log.error(err.message);
            process.exit(1);
        }
        // If not, then throw again
        throw err;
    }
}

main();
