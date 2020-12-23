"""
Bluetooth simple demo with web support.

M A Chatterjee 2020-11-20

requires circuit python 5.3x or greater, adafruit libraries

This demo relies on ble serial support (virtual suppor from nordic service) rather than GATT

"""
import time
import array
import math
import board
import supervisor
import json

#hw specific feather sense
import audiobusio
import adafruit_apds9960.apds9960
import adafruit_bmp280
import adafruit_lis3mdl
import adafruit_lsm6ds.lsm6ds33
import adafruit_sht31d

#bluetooth support
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

# incoming data 
recvdata = ""   # rec data buffer from host
en_recvd = True # enable receive data from host

try:
    # feathersense board init & setup  
    # these next few lines are just for reading sensor values specific to the 
    # adafruit feather sense.
    i2c = board.I2C()
    lsm6ds33  = adafruit_lsm6ds.lsm6ds33.LSM6DS33(i2c)
    apds9960  = adafruit_apds9960.apds9960.APDS9960(i2c)
    bmp280 = adafruit_bmp280.Adafruit_BMP280_I2C(i2c)
    sht31d = adafruit_sht31d.SHT31D(i2c)
    microphone = audiobusio.PDMIn(board.MICROPHONE_CLOCK, board.MICROPHONE_DATA,
                                  sample_rate=16000, bit_depth=16)

    def normalized_rms(values):
        minbuf = int(sum(values) / len(values))
        return int(math.sqrt(sum(float(sample - minbuf) *
                                 (sample - minbuf) for sample in values) / len(values)))

    apds9960.enable_proximity = True
    apds9960.enable_color = True

    # Set this to sea level pressure in hectoPascals at your location for accurate altitude reading.
    bmp280.sea_level_pressure = 1012.15

    # ===========================
    # begin bluetooth setup
    ble = BLERadio()  # init the BLE radio
    uart = UARTService() # we're going to use the UART service. 
    ble.name = "deftio-ble-link-demo"  # discovery name in bluetooth host - change to anything you wish
    advertisement = ProvideServicesAdvertisement(uart)

    # prep for main code section
    ix = 0 # packet number - this is incremented with each packet we send over bluetooth so we can do debugging & timing if we want
    print(ble.name + ": Waiting to connect")  # serial port debugging message (if not plugged in to USB this does nothing)
    
    iscon = 0  # is connected 
    s = {}     # this structure is the holder of data for our packet.  You add any fields you wish
    printDbg = False

    run = True  # use for debugging
    while run:
        samples = array.array('H', [0] * 160)
        microphone.record(samples, len(samples))
        s["i"] = ix # loop number
        ix+=1 # incr loop count
        s["t"] = time.monotonic_ns() # loop begin time stamp
        
        if (ix % 64) == 0:  # these sensor are "slow" and are environmental so we don't need them as often
            s["prx"]  = apds9960.proximity
            s["col"]  = apds9960.color_data
            s["tmp"]  = bmp280.temperature
            s["bar"]  = bmp280.pressure
            s["hum"]  = sht31d.relative_humidity
            s["alt"]  = bmp280.altitude

        #rms sound
        s["sn"]   = normalized_rms(samples)
        
        # local board acc/gyr/mags
        s["m0"]   = lis3mdl.magnetic
        s["a0"]   = lsm6ds33.acceleration
        s["g0"]   = lsm6ds33.gyro

        if printDbg:
            print("\nSensors")
            print("---------------------------------------------")
            print("Proximity:", s["prx"])
            print("Red: {}, Green: {}, Blue: {}, Clear: {}".format(* s["col"]))
            print("Temperature: {:.1f} C".format(s["tmp"]))
            print("Barometric pressure:", s["bar"])
            print("Altitude: {:.1f} m".format(s["alt"]))
            print("Magnetic: {:.3f} {:.3f} {:.3f} uTesla".format(* s["m0"]))
            print("Acceleration: {:.2f} {:.2f} {:.2f} m/s^2".format(* s["a0"]))
            print("Gyro: {:.2f} {:.2f} {:.2f} dps".format(* s["g0"]))
            print("Humidity: {:.1f} %".format(s["hum"]))
            print("Sound level:", s["sn"])

        if (not ble.connected): # if we drop the connection, show the beacon again so we can reconnect
            ble.start_advertising(advertisement)

        while not ble.connected:
            pass
        s["tx"] = time.monotonic_ns() # transmit timestamp diff between this and s[t] is sensor data collection time

        # do bluetooth stuff
        if ble.connected:
            if (iscon == 0):
                print("Connected") # print this message only once.
                iscon += 1
            #input from host (slow..)
            try :
                if (en_recvd == True): # if we have enabled receiving data back from the host
                    if uart.in_waiting: # if there are any bytes coming in from the host
                        recvdata = uart.read(256) # receive up to 256 of them.  Change this but remember large blocks of data impact performance
                        if recvdata : # if we got any....
                            print(recvdata )# write to console... use only for debugging
                            # do something with the received data... 
                # handle sending data is next
                uart.write("?>"+json.dumps(s)+"<?") # encode data with packet delimeters for unpacking on the other side
            except :
                supervisor.reload() # reboot if exception ... 
        else:
            iscon=0 
except:
    supervisor.reload() #reboot if exceptions 
