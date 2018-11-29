const { tryPackage } = require('./index');


// Parse command line arguments
const argv = require('minimist')(process.argv.slice(2))

const packages = argv._;

tryPackage(packages);