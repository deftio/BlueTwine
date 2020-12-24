#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

"use strict";
//The above shenbang allows running on systems whether nodejs exec is called 'node'
//or called 'nodejs' which is common on many debian systems such as Ubuntu.

//more traditional shebang would be:
//#!/usr/bin/env node

//beginl actualjavascript below


var btl = require('../BlueTwine.js');

let version = BlueTwine().version()["version"];



var fs = require("fs");

/* process cmd line

process.argv[0] --> nodejs executable
process.argv[1] --> /full/path/to/this/file/update-bt-package.js 
process.argv[2] --> input_filename
process.argv[3] --> output_filename

example:

update-bt-package 
*/

var readJSONFile  = function (fname,callback_fn) {       
   fs.readFile(fname, "utf8", function (err, data) { if (err) throw err; callback_fn(JSON.parse(data)); });
};

var saveJSONFile = function (fname,data) {
	fs.writeFile(fname, data, function (err) {
        if (err) return console.log(err);
    });
}


if (process.argv.length <=2) {
	console.log("update-package: no arguments supplied (no operations performed).  \nThis tool updates the version number in package.json\n\n");
	console.log("usage:\n ./udpate-bt-package original-package.json updated.json\n\n");
}
else {
	if ((typeof process.argv[2] == "string") && (typeof process.argv[3] == "string")) {
		var savePackage = function (data) {
			data["version"] = version;  
			saveJSONFile(process.argv[3],JSON.stringify(data, null, "\t")); 
		}
		readJSONFile(process.argv[2], savePackage); 
	}
}


