/*
    BLESerialUart

    M. A. Chatterjee 

    Dec 2020

    Simple class for emulating a UART over web Bluetooth Low Energy (BLE)

 */
BLESerialUart = function()  {

    // default UUIDs for serial service 
    // can overide with setUUIDs()  to use any service ids
    this.Nordic_Serial_UUID  = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    this.Nordic_TX_Char_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
    this.Nordic_RX_Char_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

    //default, can override
    this.serviceUUID = this.Nordic_Serial_UUID;
    this.charTxUUID  = this.Nordic_TX_Char_UUID;
    this.charRxUUID  = this.Nordic_RX_Char_UUID;

    //internal state vars for device connection
    this.device        = null; // the device (can have mult services)
    this.service       = null; // serial write / read service (when active)
    this.charTxService = null; // write data out (raw bytes)
    this.charRxService = null; // read data back (raw bytes, note use callback)
    
    this.onRawData     = function(d) {console.log(d)};
    
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
    //begin methods
    this.isValidUUID = function(uuid) {
        if (!Number.isInteger(uuid) && !(typeof uuid === 'string' || uuid instanceof String)) 
            return false;

        if (!uuid) 
            return false;
        return true;
    }

    this.setUUIDs = function (serviceUUID, charTxUUID, charRxUUID) {
        this.serviceUUID = isValidUUID(serviceUUID) ? serviceUUID : this.serviceUUID; 
        this.charTxUUID  = isValidUUID(serviceUUID) ? charTxUUID  : this.charTxUUID; 
        this.charRxUUID  = isValidUUID(serviceUUID) ? charRxUUID  : this.charRxUUID; 
        return {"service" : this.serviceUuid, "charTxUUID":this.charTxUUID, "charRxUUID":this.charRxUUID}
    }

  
    this.requestDevice = async function () {
        try {
            this.log("Connecting to " + this.serviceUUID);
            let options = { filters: [{services: [this.serviceUUID]}]};
            this.device = await navigator.bluetooth.requestDevice(options);
            await this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
     /*
        }
        catch (e) {
            this.log("Error on requesting device" + e);
        }
    }
  
    this.connect = async function() {
        try {
            */
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
            this.charRxService.addEventListener('characteristicvaluechanged',this.handleRXNotify);
//======
/*
log('Connecting to GATT Server...');
const server = await device.gatt.connect();

log('Getting Service...');
const service = await server.getPrimaryService(serviceUuid);

log('Getting Characteristic...');
myCharacteristic = await service.getCharacteristic(characteristicUuid);

await myCharacteristic.startNotifications();

log('Notifications started');
myCharacteristic.addEventListener('characteristicvaluechanged',    handleNotifications);
*/
//======
        }
        catch (e) {
            this.log("Error in request / connect : " + e);
        }
    }
  
    //returns read value as array buffer
    this.readSerialData = async function() {
        try {
            await this.charRxService.readValue();
        }
        catch (e) {
            this.log("CharRxService service error: " +e);
        }
        //const service = await this.device.gatt.getPrimaryService(this.serviceUUID);
        //const characteristic = await service.getCharacteristic(this.charRxUUID);
        //await characteristic.readValue();
    }

    // data must be ArrayBuffer
    // length must be less than this.device....length
    this.writeRawDataChunk = async function (data) {
        try {
            await this.charTxService.writeValue(data);
        } catch (e) {
            this.log("CharTX Service error: " + e);
        }
        //const service = await this.device.gatt.getPrimaryService(this.serviceUUID);
        //const characteristic = await service.getCharacteristic(this.charTxUUID);
        //await characteristic.writeValue(data);
    }

    this.startRxCallback = async function (listener) {
        //const service = await this.device.gatt.getPrimaryService(this.serviceUUID);
        //const characteristic = await service.getCharacteristic(this.charRxUUID);
        //await characteristic.startNotifications();
        //characteristic.addEventListener('characteristicvaluechanged', listener);
        await this.charRxService.startNotifications();
        this.onRawData = typeof listener == "function" ? listener : this.onRawData;
        this.charRxService.addEventListener('characteristicvaluechanged',this.onRawData);
        
    }

    this.stopRxCallback = async function () {
        //const service = await this.device.gatt.getPrimaryService(this.serviceUUID);
        //const characteristic = await service.getCharacteristic(this.charRxUUID);
        //await characteristic.stopNotifications();
        //characteristic.removeEventListener('characteristicvaluechanged', listener);
        this.charRxService.removeEventListener('characteristicvaluechanged',this.onRawData)
    }

    this.handleRXNotify = function(event) {
        let value = event.target.value;  // this is an array buffer with raw bytes (*not* a string)
        let a = [];
        // Convert raw data bytes to hex values just for the sake of showing something.
        // In the "real" world, you'd use data.getUint8, data.getUint16 or even
        // TextDecoder to process raw data bytes.
        for (let i = 0; i < value.byteLength; i++) { }
        const strvalue = new TextDecoder().decode(event.target.value); // convert to a real js string
        //onRawData(strvalue);
        writeDataDiv(strvalue,"#rawDiv");
    }

    this.disconnect = function() {
        if (!this.device) {
        return Promise.reject('Device is not connected.');
        }
        return this.device.gatt.disconnect();
    }

    this.onDisconnected = function() {
        this.log('Device is disconnected.');
    }
    this.onDisconnected = this.onDisconnected.bind(this);
} // end BLESerialUart definition


    /**
     * Function Description
     *
     * @param {object} characteristic - Characteristic.
     * @param {string} data - Data.
     * @returns {Promise} Promise.
     * @private
     **/
    