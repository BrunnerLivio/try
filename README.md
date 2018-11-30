# :package: try

[![NPM Package](https://badge.fury.io/js/try-pkg.svg)](https://www.npmjs.com/package/try-pkg)

**Quickly try out npm packages inside a container.**

## Purpose

As a developer working with NodeJS you often stumble upon packages you quickly want to try out. Installing these packages on your host system gets it polluted real quick.

`try` tries to keep your host system clean while testing out npm packages. This CLI tool quickly starts up a [Docker](https://www.docker.com/) container and installs your specified packages, so you can try them out!

## Usage

You can print the usage by executing `try --help`.

```shell

Usage: try [packages]

Quickly try out npm packages inside a container

Options:
  -V, --version              output the version number
  -v, --verbose              Verbosity value
  -i, --image [image]        The docker image which it should pull from [node] (default: "node")
  --image-version [version]  Specify the node image version [latest] (default: "latest")
  --silent                   If the program should not print any log statements
  -h, --help                 output usage information

```

## Installation


You can install the package using npm.

```shell

npm install -g try-pkg

```