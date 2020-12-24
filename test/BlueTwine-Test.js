/**
bitwrench test functions for npm (nodejs) see bitwrench_test_karam.js for browser version of tests

this file uses the mocha test framework and chai assert framework along with jsdom to test certiain environment params

npm install mocha --save-dev 
npm install chai  --save-dev 
npm install jsdom --save-dev 

*/
"use strict";



var assert = require("assert");

// include bitwrench
var bw = require("../libs/bitwrench.min.js");


var btl = require("../BlueTwine.js"); // 
var bluetwine = BlueTwine();


//====================

//if (bw.isNodeJS()) {

var jsdom = require('jsdom');
const { JSDOM } = jsdom;

var istanbul = require('nyc')
// console.log(istanbul,istanbul.__coverage__)
const fs = require("fs");
const path = require("path");

const BlueTwineFile = fs.readFileSync(path.resolve(__dirname,"../BlueTwine.js"), { encoding: "utf-8" }).toString(); // this is a literal copy of bluetwine for jsdom injection
console.log("BlueTwineFile Loaded..."+BlueTwineFile.length+" chars"); 

const BlueTwineFileInstrumented = fs.readFileSync(path.resolve(__dirname,"../instr_tmp/BlueTwine.js"), { encoding: "utf-8" }).toString(); // this is a literal copy of bluetwine for jsdom injection
console.log("BlueTwineFileInstrumented Loaded..."+BlueTwineFileInstrumented.length+" chars"); 

`
var coverageVar = (
    function() {
        var coverageVar = __coverage__;
        / *
        for(var key of Object.keys(global)) {
            if (/\$\$cov\d+\$\$/.test(key)) {
                coverageVar = key;
            }
        }* /
        console.log('Coverage var:', coverageVar);
        return coverageVar;
    }
)();
`
//}
// ================================================================
var setupdom = function(wnd,html) {
	if (bw.isNodeJS() ) {

		const testDoc = `<!DOCTYPE html><html><head></head><body><span id="myTestSpan">starter</span><div class="foo">default</div></body></html>`;
	  	wnd = (new JSDOM( (((typeof html) !== "undefined") ? html : testDoc), 
	  		{ 
	  		runScripts: "dangerously" , 
	  		created: function (errors, wnd) { wnd[coverageVar] = global[coverageVar]; console.log(coverageVar) },
	  		done   : function (errors, wnd) {if (errors) {console.log(errors);  done(true); } else { window = wnd; done(); }
		    }
	  	})).window;

	  	// Execute my library by inserting a <script> tag containing it.
	  	const scriptEl = wnd.document.createElement("script");
	  	scriptEl.textContent = BlueTwineFileInstrumented;
	  	wnd.document.head.appendChild(scriptEl);
	}
	else {

		wnd = (typeof window != "undefined") ? window : wnd; // yes the global window -- we're in the browser
		//if (html)
		//	window.document.documentElement = html;
		console.log("browser context")
	}
	return wnd;
}
//==================================

//tests begin:

// ================================================================
describe("#typeOf()", function() {
/** 
test built-in basic typeof operator
*/

	//using meta tests
	var x;
	var tests = [
		{args: [[]],              expected: "array"},
		{args: [{}],              expected: "object"},
		{args: [1],               expected: "number"},
		{args: ["test string"],   expected: "string"},
		{args: [x],				  expected: "undefined"},
		{args: [null],			  expected: "null"},
		{args: [new Date()],	  expected: "date"},
		{args: [function(){}],    expected: "function"},
		{args: [class{}],		  expected: "function"},
		{args: [class{},true],    expected: "function"}
	];
  
  	tests.forEach(function(test) {
    	it("bw.typeOf (internal type operator)  " + test.args.length + " args", function() {
	      	var res = bluetwine.typeOf.apply(null, test.args);
	      	assert.equal(res, test.expected);
    	});
 	});

});
// ================================================================
/*
describe("#blueuart.isWebBluetoothAvailable()returns whether bt is available at runtime", function() {
	it("version()   " + 0 + " args", function() {
	      	var res = bluetwine.isWebBluetoothAvailable();
			  assert(typeof res == "boolean");
			  console.log("web bluetooth is available" + res)
    	});
});
*/
// ================================================================
describe("#version() returns version info at runtime", function() {
	it("version()   " + 0 + " args", function() {
	      	var res = bluetwine.version();
	      	assert(res.version.split(".").length>=3);
	      	assert((res.hasOwnProperty("about")));
	      	assert((res.hasOwnProperty("copy")));
	      	assert((res.hasOwnProperty("url")));
	      	assert.equal(res.license , "BSD-2-Clause");

    	});
});

