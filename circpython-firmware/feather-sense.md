# Feather Sense FW install

M A Chatterjee 2020 Nov 25


## installation
This dir has code for the client board.

It is based on an Adafruit feather sense:
https://www.adafruit.com/product/4516

The board for the demo runs circuitpython.

## Installing circuitpython on a new board:
https://learn.adafruit.com/adafruit-feather-sense/circuitpython-on-feather-sense

0. plug in the feather sense on USB
1. double click the reset button (puts in bootloader uf2 mode)
2. copy the file "adafruit-circuitpython-feather_bluefruit_sense-en_US-5.3.1.uf2" to the circuitpython dir

reset the device - it should now run circuitpython.

## installing k1 firmware
0. plug in the board and press reset once. it should mount as a USB drive
1. copy code.py from this folder to the root folder of the circuitpython drive.
2. copy all the files in the lib folder (recursive) to the lib folder on the circuit python drive.

now reset the board and it should auto run the k1 firmware and advertize as a bluetooth beacon.




