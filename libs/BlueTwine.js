/*
    BlueTwine

    BLE Web connection lib with serial and stats support

    M A Chatterjee Dec 2020
    deftio @ deftio . com
 
    Dec 2020

    https://github.com/deftio/
    Simple class for emulating a UART over web Bluetooth Low Energy (BLE)
    
    Also supports JSON callbacks.  (Note sender must properly frame encode and pack JSON for this to work.)
    
    For an example of the client side Bluetooth code see the client-code examples in this repo.
  
    browser class for bluetooth LE GATT, serial servcice, and JSON service
   
    See docs for example, comments.
      Note bluetooth-web only works from secure (HTTPS) connected pages or from localhost. 
      Older browsers and older laptops may not support bluetooth web connections
 
    BSD 2 License (see LICENSE.txt in root folder)
 
 */
BlueTwine = function(serviceUUID, TxUUID, RxUUID)  {

    // default UUIDs for serial service 
    // can overide with setUUIDs()  to use any service id & characteristic as long as the BLE device is setup on that service/char
    this.Nordic_Serial_UUID  = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    this.Nordic_TX_Char_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
    this.Nordic_RX_Char_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

    //default, can override these to use a differnet service or port
    this.serviceUUID = this.Nordic_Serial_UUID;
    this.charTxUUID  = this.Nordic_TX_Char_UUID;
    this.charRxUUID  = this.Nordic_RX_Char_UUID;

    //internal state vars for device connection
    this.device        = null; // the device (can have mult services)
    this.service       = null; // serial write / read service (when active)
    this.charTxService = null; // write data out (raw bytes)
    this.charRxService = null; // read data back (raw bytes, note use callback)
    this.RxmaxFrameBytes = 128000; // max num bytes we'll buffer for a frame or JSON. 
    this.RxFrameBytesBuf = [];   // buffer for data we're accumulating
    this.TxMaxFrameBytes= 20;    // chunk size to break up Tx packets (20 is BLE hard default, if larger is needed look at BLE long writes)
    this.stats         =   {};   // stats object
    
    //onEvent style callbacks for data handling
    this.onDataChunk   = null; // call back for onRxNotify data available (returns ArrayBuffer)
    this.onStringChunk = null; // call back for rawStringData (returns js string)

    //callbacks for framed data (e.g. longer than BLE characteristic length. which is typpically 20 bytes)
    this.onDataFrame   = null; // callback for accumated message bytes (can be many chunks, requires sender support) returns ArrayBuffer
    this.onStringFrame = null; // callback for accumulated message as string (requires sender framing support) returns JS string
    this.onJSON        = null; // callback for receiving JSON (requires sender framing, json stringification support) returns JSON parsed object

    //========================================================
    // array buffer <===> string conversion utils  
    this.ab2str = function (buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
    
    this.str2ab = function (str) {
        var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i=0, strLen=str.length; i<strLen; i++)
            bufView[i] = str.charCodeAt(i);
        return buf;
    }

    //========================================================
    this.statsCopy   = function() {return JSON.parse(JSON.stringify(this.stats))} // get a copy of the stats at a moment in time
    this.statsReset  = function() {this.stats={}}
    this.statsEnable = function(enable) {_statsInc = enable ? this.statsInc : function (){};};   // enable stats


    this.statsInc   = function(key, val, set) { 
        val = ((typeof val) == "number") ? val : 1 ;
        if (set == true)
            this.stats[key] = val;  // set instead of increment
        else
            this.stats[key] = (key in (this.stats)) ? this.stats[key]+val : val;
    } 
    var _statsInc   = this.statsInc;
    
    
    // reset a stat of a specific key or array of keys
    this.statsClr   = function(key) { 
        if (typeof key == "array")
            key.forEach(k =>this.stats[k] = 0)
        else
            this.stats[key] = 0
    } 

    //========================================================
    //begin methods
    this.isValidUUID = function(uuid) {
        if (!Number.isInteger(uuid) && !(typeof uuid === 'string' || uuid instanceof String)) 
            return false;
        if (!uuid) 
            return false;
        return true;
    }

    this.setUUIDs = function (serviceUUID, charTxUUID, charRxUUID) {
        this.serviceUUID = this.isValidUUID(serviceUUID) ? serviceUUID : this.serviceUUID; 
        this.charTxUUID  = this.isValidUUID(serviceUUID) ? charTxUUID  : this.charTxUUID; 
        this.charRxUUID  = this.isValidUUID(serviceUUID) ? charRxUUID  : this.charRxUUID; 
        return {"service" : this.serviceUuid, "charTxUUID":this.charTxUUID, "charRxUUID":this.charRxUUID}
    }
    this.setUUIDs(serviceUUID, TxUUID, RxUUID); // constructor 
  
    this.connectToDevice = async function () {
        try {

            this.log("Attemtping to connecting to device id: " + this.serviceUUID);
            
            let servicesList = typeof (this.serviceUUID) == "array" ? this.serviceUUID : [this.serviceUUID]; // todo 
            let options = { filters: [{services: servicesList}]}; 

            this.device = await navigator.bluetooth.requestDevice(options);
            this.statsInc("connect_start_timestamp", (new Date()).getTime(),true); // could use performance.now()
            this.log("Connected to device id: " + this.serviceUUID);
            this.log("Device name: " + this.device.name);
            await this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
     
            this.log("Connecting to gatt server.. ")
            this.gatt = await this.device.gatt.connect();

            this.log("Getting Primary Service (serial)");
            this.service       = await this.gatt.getPrimaryService(this.serviceUUID);

            this.log("Getting Tx Characteristic ");
            this.charTxService = await this.service.getCharacteristic(this.charTxUUID);

            this.log("Getting Rx Characteristic ");
            this.charRxService = await this.service.getCharacteristic(this.charRxUUID);

            await this.charRxService.startNotifications();
            this.log('Notifications started');
            //this.charRxService.addEventListener('characteristicvaluechanged',(event)=>{this.handleRXNotify(event);});
            this.charRxService.addEventListener('characteristicvaluechanged',this.handleRXNotify);
            
        }
        catch (e) {
            this.log("Error in request / connect : " + e);
        }
    }
  
    //returns read value as ArrayBuffer
    this.readSerialData = async function() {
        try {
            return await this.charRxService.readValue();
        }
        catch (e) {
            this.log("CharRxService service error: " +e);
        }
    }

    // ======================================
    // data must be ArrayBuffer
    // length must be <= than characteristic length (typically 20 bytes) 
    // to write large quanties consider using writeRawBuf() below
    this.writeRawDataChunk = async function (data) {
        try {
            await this.charTxService.writeValue(data);
            _statsInc("tx_bytes", data.byteLength);
        } catch (e) {
            this.log("CharTX Service error: " + e);
        }
    }

    this.writeRawBuf = async function (data) {
        try {
            
            let i=0, e;
            while (i< data.byteLength) {
                e =  i+this.TxMaxFrameBytes;
                e = e < data.byteLength ? e : data.byteLength;
                await this.writeRawDataChunk(data.slice(i,e));
                i +=this.TxMaxFrameBytes;
                _statsInc("tx_frames");
            }
            
        } catch(e) {
            _statsInc("tx_fail")
            this.log("Char write raw frames: " + e);
        }
    }
    // todo : frame encoding
    this.writeString = async function (str) {
        await this.writeRawBuf(this.str2ab(str));
        _statsInc("tx_strings");
        _statsInc("tx_strings_bytes", str.length);
    }

    this.writeJSON   = async function (x) {
        try {
            await this.writeString(JSON.stringify(x));
            _statsInc("tx_json_objects");
        }
        catch (e) {
            _statsInc("tx_json_err");
        }
    }

    this.startRxCallback = async function (listener) {
        await this.charRxService.startNotifications();
        this.onRawData = typeof listener == "function" ? listener : this.onRawData;
        this.charRxService.addEventListener('characteristicvaluechanged',this.handleRXNotify);   
        this.log("Rx callback set");
    }

    this.stopRxCallback = async function () {
        this.charRxService.removeEventListener('characteristicvaluechanged',this.handleRXNotify)
        this.log("Rx callback removed");
    }

    this.handleRXNotify = function(event) {
        let value = event.target.value;  // this is an array buffer with raw bytes (*not* a string)
        _statsInc("rx_frames");
        _statsInc("rx_bytes",value.byteLength);
        
        if (this.onDataChunk) {
            this.onDataChunk(value);
        }
        if (this.onStringChunk) {
            let a = [];
            // Convert raw data bytes to hex values just for the sake of showing something.
            // In the "real" world, you'd use data.getUint8, data.getUint16 or even
            // TextDecoder to process raw data bytes.
            for (let i = 0; i < value.byteLength; i++) { }
                const strvalue = new TextDecoder().decode(event.target.value); // convert to a real js string
            
            if (this.onStringChunk(strvalue))
                this.onStringChunk(strvalue);
        }
        // todo
        //this.onDataFrame this.onStringFrame, this.onJSON
    }

    this.disconnect = function() {
        if (!this.device) {
            this.log ("device is already disonnected");
            return Promise.reject('Device is already connected.');
        }
          return this.device.gatt.disconnect();
    }

    this.onDisconnected = function() {
        this.statsInc("connect_stop_timestmap",(new Date()).getTime(),true);
        this.log('Device is disconnected.');
    }
    
    this.isWebBluetoothAvailable = function() {
        if (navigator.bluetooth) {
            return true;
        }
        else {
            this.log('Web Bluetooth API is not available. check connection is https or localhost or check browser compatibility.');
          return false;
        }
    }

      
    /*****************************
     * Usable typeof operator.  (handles null, functions, dates, Class names etc)
     * Borrowed from bitwrench.js (github.com/deftio/bitwrench or npm bitwrench 
     */
    this.typeOf = function (x, baseTypeOnly)       {
        if (x === null)
            return "null";
        var y = (typeof x == "undefined") ? "undefined" : (({}).toString.call(x).match(/\s([a-zA-Z]+)/)[1].toLocaleLowerCase()) 
        if ((y != "object") && (y != "function"))
            return y;
        if (baseTypeOnly == true) // so if undefind or anything but true
            return y;         
        var r = y;
        try {
            r =  (x.constructor.name.toLocaleLowerCase() == y.toLocaleLowerCase()) ?  y : x.constructor.name;  // return object's name e.g.
        }
        catch (e) { } /* eslint no-empty: ["error", { "allowEmptyCatch": true }] */
        return r;
    };
    /*****************************
     * isType(x,types) returns whether x is one of the types listed in types
     * isType(3,"number")  ==> true
     * isType("tada","number") ==> false
     * isType([3],["number","array"]) ==> true 
     */
    this.isType = function(x, types) {
        types = this.typeOf(types) == "array" ? types : [types];
        return (types.indexOf(this.typeOf(x)) >= 0);
    }

    // bindings for callback "this" contexts.
    this.handleRXNotify = this.handleRXNotify.bind(this);
    this.onDisconnected = this.onDisconnected.bind(this);
    this.statsInc = this.statsInc.bind(this);
    _statsInc = _statsInc.bind(this);
    this.typeOf =this.typeOf.bind(this);
    this.isType =this.isType.bind(this);
} // end BLESerialUart definition


/**
 * Function Description todo: add fn docs
 *
 * @param {object} characteristic - Characteristic.
 * @param {string} data - Data.
 * @returns {Promise} Promise.
 * @private
 **/
    