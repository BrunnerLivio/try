# :package: try

[![NPM Package](https://badge.fury.io/js/try-pkg.svg)](https://www.npmjs.com/package/try-pkg)

**Quickly try out npm packages inside a container.**

## Purpose

As a developer working with NodeJS you often stumble upon packages you quickly want to try out. Installing these packages on your host system gets it polluted real quick.

`try` tries to keep your host system clean while testing out npm packages. This CLI tool quickly starts up a [Docker](https://www.docker.com/) container and installs your specified packages, so you can try them out!

## Usage

```shell
try-pkg [packages]
```

## Installation



```shell
npm install -g try-pkg
```