#!/usr/bin/env node
const { tryPackage, TryPackageError } = require('./index');
const log = require('loglevel');

// Parse command line arguments
const argv = require('minimist')(process.argv.slice(2))

const packages = argv._;

!packages.length && (log.error('You must enter the packages you want to use') || process.exit(1));  

async function main () {
    try {
        await tryPackage(packages);
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