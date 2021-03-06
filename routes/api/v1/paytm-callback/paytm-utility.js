/*
Most of the code here is from the paytm checksum verification utility - node.js version , see paytm sdk for details
@author Divyanshu Agrawal
 */

var express = require("express");
var router = express.Router();
var fq = require("fuzzquire");
var paytm_config = require('./paytm/paytm_config').paytm_config;
var paytm_checksum = require('./paytm/checksum');
var querystring = require('querystring');
var mongoose = require("mongoose");
var cgTranscriptsModel = fq("schemas/cgTranscripts.js")



/*
PAYTM provided PHP code, here for reference.
<?php
    $paytmParams = $_POST;
    $merchantKey="gKpu7IKaLSbkchFS";
    $paytmChecksum = isset($_POST["CHECKSUMHASH"]) ? $_POST["CHECKSUMHASH"] : "";
    $isValidChecksum = verifychecksum_e($paytmParams, $merchantKey, $paytmChecksum);
    if($isValidChecksum == "TRUE") {
        echo "<b>Checksum Matched</b>";
    } else {
        echo "<b>Checksum MisMatch</b>";
    }
?>*/

// Sample expected parameters for the code : 
// paramarray['MID'] = 'mPIdhI81262336819681'; //Provided by Paytm
// paramarray['ORDER_ID'] = 'ORDER00001'; //unique OrderId for every request
// paramarray['CUST_ID'] = 'CUST0001';  // unique customer identifier 
// paramarray['INDUSTRY_TYPE_ID'] = 'xxxxxxxxx'; //Provided by Paytm
// paramarray['CHANNEL_ID'] = 'WAP'; //Provided by Paytm
// paramarray['TXN_AMOUNT'] = '1.00'; // transaction amount
// paramarray['WEBSITE'] = 'xxxxxxxxxxxx'; //Provided by Paytm
// paramarray['CALLBACK_URL'] = 'https://pguat.paytm.com/paytmchecksum/paytmCallback.jsp';//Provided by Paytm
// paramarray['EMAIL'] = 'abc@gmail.com'; // customer email id
// paramarray['MOBILE_NO'] = '9999999999'; // customer 10 digit mobile no.
// router.post("/order", function (req, res) {
// 	// Required params : id, mob

// 	res.json({
// 		message:"Endpoint does not exist."
// 	})

// })

router.post("/verify_checksum", function (req, res) {

	var decodedBody = req.body
	// get received checksum
	var checksum = decodedBody.CHECKSUMHASH;

	// remove this from body, will be passed to function as separate argument
	delete decodedBody.CHECKSUMHASH;

	// response.writeHead(200, { 'Content-type': 'text/html', 'Cache-Control': 'no-cache' });
	if (paytm_checksum.verifychecksum(decodedBody, paytm_config.MERCHANT_KEY, checksum)) {
		console.log("Checksum Verification => true");
		res.json({
			verified: true
		});
	} else {
		console.log("Checksum Verification => false");
		res.json({
			verified: false
		});
	}
	// if checksum is validated Kindly verify the amount and status 
	// if transaction is successful 
	// kindly call Paytm Transaction Status API and verify the transaction amount and status.
	// If everything is fine then mark that transaction as successful into your DB.			

	// response.end();

})

router.post("/verify-order", function (req, res) {
	console.log(req.body);
	res.json(req.body);
})

module.exports = router;