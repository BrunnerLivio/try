#!/usr/bin/env node
const { tryPackage } = require('./index');
const log = require('loglevel');

// Parse command line arguments
const argv = require('minimist')(process.argv.slice(2))

const packages = argv._;

!packages.length && (log.error('You must enter the packages you want to use') || process.exit(1));  

tryPackage(packages);