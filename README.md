[![License](https://img.shields.io/badge/License-BSD%202--Clause-blue.svg)](https://opensource.org/licenses/BSD-2-Clause)
[![NPM version](https://img.shields.io/npm/v/bluetwine.svg?style=flat-square)](https://www.npmjs.com/package/bluetwine)
[![Build Status](https://travis-ci.org/deftio/bluetwine.svg?branch=master)](https://travis-ci.org/deftio/bluetwine)

[![BlueTwine](./img/bluetwine-logo.png)](https://www.github.com/deftio/bluetwine)
# BlueTwine: A Bluetooth Web Libary with Serial / JSON support

2020 November 25

## Intro
This repo uses bluetooth low energy (BLE) web to talk to an IOT service in close range.  Since Bluetooth can be very complicated to set up I chose to make am example using bluetooth serial and JSON to simplify tasks for someone making a quick demo.  

TBD (not released just yet)

## Web code
Go to this github page or clone the repo and run from localhost.  

To use bluetooth web you must a browser with web blooth support such as chrome or edge.  Since bluetooth serial access hardware the user must click on the connect button and the page must be served over either https:// or localhost 

Safari may not support BLE web

## Client code setup
To use BlueTwine you'll need a device sending data over Bluetooth Low Energy and it needs to be discoverable.


# Supported Boards & Set up
The client code here relies on adafruit circuitpython.  I used the Adafruit Feather Sense board (url) which also supports many sensors.
To use the client code, clone the repo.  Then install circuitpythone (5.3x or later) on your board.  

## Other boards && Dependancies
Other boards may support this demo but you'll need support for bluetooth serial emulation.

## History 
Originally written to debug an IOT project where there were numerous custom sensors and didn't want the overhead of re-plumbing BLE connection everytime there was a sensor config change.  Using JSON over serial emulation allows easy attachment of custom debug commands and info.  A challenge of using JSON over BLE is that it is low performance, higher power consumption, and longer latencies.  However after a bring up is complete and data stream finalized then moving the protocol to be BLE register ("characteristic based in BLE language") should be straight forward.

## Contributing
M A Chatterjee deftio at deftio dot com (started)

