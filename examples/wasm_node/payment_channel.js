const filecoin_signer = require('@zondax/filecoin-signing-tools');
const bip39 = require('bip39');
const bip32 = require('bip32');
const axios = require('axios');
const {getDigest} = require('./test/utils');
const secp256k1 = require('secp256k1');
const assert = require('assert');
const cbor = require("ipld-dag-cbor").util;

const URL = process.env.URL
const TOKEN = process.env.TOKEN

const privateKeyBase64 = "YbDPh1vq3fBClzbiwDt6WjniAdZn8tNcCwcBO2hDwyk="
const privateKey = Buffer.from(privateKeyBase64, 'base64')

const headers = { "Authorization": `Bearer ${TOKEN}` }

const skip = false

async function main () {
  let response
  var PCH
  
  if (!skip) {
    
      /* Import private key */
      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.WalletImport",
        id: 1,
        params: [{ Type: "secp256k1", PrivateKey: privateKeyBase64}]
      }, {headers})

      console.log(response.data)

      /* Get miner address with funds */
      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.WalletList",
        id: 1,
        params: []
      }, {headers})

      let address
      for (i in response.data.result) {
        if (response.data.result[i].startsWith("t3")) {
          address = response.data.result[i]
        }
      }
      console.log(address)

      /* Get nonce */

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.MpoolGetNonce",
        id: 1,
        params: [address]
      }, {headers})

      console.log(response.data)
      let nonce = response.data.result

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.WalletSignMessage",
        id: 1,
        params: [address, {
          From: address,
          To: "t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy",
          Nonce: nonce,
          GasPremium: "2500",
          GasFeeCap: "2500",
          GasLimit: 2500000,
          Method: 0,
          Value: "10000000000000",
          Params: ""
        }]
      }, {headers})

      console.log(response.data)
      let signedMessage = response.data.result

      /* Send signed tx */

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.MpoolPush",
        id: 1,
        params: [signedMessage]
      }, { headers })

      console.log(response.data)

      let cid = response.data.result

      /* Wait for message */

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.StateWaitMsg",
        id: 1,
        params: [cid, null]
      }, { headers })

      console.log(response.data)
      
      /* Get nonce */

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.MpoolGetNonce",
        id: 1,
        params: [address]
      }, {headers})

      console.log(response.data)
      nonce = response.data.result

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.WalletSignMessage",
        id: 1,
        params: [address, {
          From: address,
          To: "t1d2xrzcslx7xlbbylc5c3d5lvandqw4iwl6epxba",
          Nonce: nonce,
          GasFeeCap: "2500",
          GasPremium: "2500",
          GasLimit: 2500000,
          Method: 0,
          Value: "10000000000000",
          Params: ""
        }]
      }, {headers})

      console.log(response.data)
      signedMessage = response.data.result

      /* Send signed tx */

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.MpoolPush",
        id: 1,
        params: [signedMessage]
      }, { headers })

      console.log(response.data)

      cid = response.data.result

      /* Wait for message */

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.StateWaitMsg",
        id: 1,
        params: [cid, null]
      }, { headers })

      console.log(response.data)
    
      /* Recover address */
      console.log("##### RECOVER ADDRESS #####")
      
      let recoveredKey = filecoin_signer.keyRecover(privateKeyBase64, true);

      console.log(recoveredKey.address)
      
      /* Get nonce */
      console.log("##### GET NONCE #####")

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.MpoolGetNonce",
        id: 1,
        params: [recoveredKey.address]
      }, {headers})

      console.log(response.data)
      nonce = response.data.result

      /* Create payment channel */
      
      console.log("##### CREATE PAYMENT CHANNEL #####")
      
      let create_pymtchan = filecoin_signer.createPymtChan(recoveredKey.address, "t1d2xrzcslx7xlbbylc5c3d5lvandqw4iwl6epxba", "10000000000", nonce)
        
      signedMessage = JSON.parse(filecoin_signer.transactionSignLotus(create_pymtchan, privateKey));
      
      console.log(signedMessage)
      
      /* Send payment channel creation message */
      
      console.log("##### SEND PAYMENT CHANNEL #####")
      
      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.MpoolPush",
        id: 1,
        params: [signedMessage]
      }, { headers })

      console.log(response.data)

      cid = response.data.result

      /* Wait for message */
      
      console.log("##### WAIT FOR PAYMENT CHANNEL STATE #####")

      response = await axios.post(URL, {
        jsonrpc: "2.0",
        method: "Filecoin.StateWaitMsg",
        id: 1,
        params: [cid, null]
      }, { headers })

      console.log(response.data)
      PCH = response.data.result.ReturnDec.IDAddress
  }

  console.log(PCH)
  let PAYMENT_CHANNEL_ADDRESS = "t01010"
  if (PCH !== undefined) {
    PAYMENT_CHANNEL_ADDRESS = PCH
  }

  const VOUCHER_SIGNER = "8VcW07ADswS4BV2cxi5rnIadVsyTDDhY1NfDH19T8Uo="
  
  /* Create Voucher */
  
  console.log("##### CREATE VOUCHER #####")

  let voucher = filecoin_signer.createVoucher(PAYMENT_CHANNEL_ADDRESS, BigInt(0), BigInt(0), "100000", BigInt(0), BigInt(1), BigInt(0))
  
  console.log(voucher)
  
  /* Recover address */
  console.log("##### RECOVER ADDRESS #####")
  
  let recoveredKey = filecoin_signer.keyRecover(privateKeyBase64, true);

  console.log(recoveredKey.address)
  
  /* Sign Voucher */
  
  console.log("##### SIGN VOUCHER #####")

  let signedVoucher = filecoin_signer.signVoucher(voucher, VOUCHER_SIGNER)
  
  console.log(signedVoucher)
  
  /*  Create Voucher 2 */
  
  console.log("##### CREATE VOUCHER 2 #####")

  let voucher2 = filecoin_signer.createVoucher(PAYMENT_CHANNEL_ADDRESS, BigInt(0), BigInt(0), "200000", BigInt(0), BigInt(2), BigInt(0))
  
  console.log(voucher2)
  
  /* Sign Voucher 2 */

  console.log("##### SIGN VOUCHER 2 #####")

  let signedVoucher2 = filecoin_signer.signVoucher(voucher2, VOUCHER_SIGNER)
  
  console.log(signedVoucher2)
  
  let tmp = cbor.deserialize(Buffer.from(signedVoucher2, 'base64'))[10]
  
  console.log(Buffer.from(tmp).slice(1).toString('base64'))

  /* Create update voucher message */
  
  console.log("##### PREPARE UPDATE PAYMENT CHANNEL MESSAGE  #####")
  
  /* Get nonce */
  console.log("##### GET NONCE #####")

  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.MpoolGetNonce",
    id: 1,
    params: ["t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy"]
  }, {headers})

  console.log(response.data)
  nonce = response.data.result
  
  let update_paych_message = filecoin_signer.updatePymtChan(PAYMENT_CHANNEL_ADDRESS, "t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy", signedVoucher, nonce)

  console.log(update_paych_message)

  signedMessage = JSON.parse(filecoin_signer.transactionSignLotus(update_paych_message, privateKeyBase64));
  
  console.log(signedMessage)
  
  console.log("##### SEND PAYMENT CHANNEL #####")
  
  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.MpoolPush",
    id: 1,
    params: [signedMessage]
  }, { headers })

  console.log(response.data)

  cid = response.data.result

  /* Wait for message */
  
  console.log("##### WAIT FOR PAYMENT CHANNEL STATE #####")

  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.StateWaitMsg",
    id: 1,
    params: [cid, null]
  }, { headers })

  console.log(response.data)
  
  /* Read payment channel state */
  
  console.log("##### READ PAYMENT CHANNEL STATE #####")
  
  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.StateReadState",
    id: 1,
    params: [PAYMENT_CHANNEL_ADDRESS, null]
  }, { headers })

  console.log(response.data)
  
  /* Settle payment channel */
  
  /* Get nonce */
  console.log("##### GET NONCE #####")

  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.MpoolGetNonce",
    id: 1,
    params: ["t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy"]
  }, {headers})

  console.log(response.data)
  nonce = response.data.result
  
  update_paych_message = filecoin_signer.settlePymtChan(PAYMENT_CHANNEL_ADDRESS, "t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy", nonce)

  console.log(update_paych_message)

  signedMessage = JSON.parse(filecoin_signer.transactionSignLotus(update_paych_message, privateKey));
  
  console.log(signedMessage)
  
  console.log("##### SETTLE PAYMENT CHANNEL #####")
  
  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.MpoolPush",
    id: 1,
    params: [signedMessage]
  }, { headers })

  console.log(response.data)

  cid = response.data.result

  /* Wait for message */
  
  console.log("##### WAIT FOR PAYMENT CHANNEL STATE #####")

  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.StateWaitMsg",
    id: 1,
    params: [cid, null]
  }, { headers })

  console.log(response.data)
  
  console.log("##### READ PAYMENT CHANNEL STATE #####")
  
  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.StateReadState",
    id: 1,
    params: [PAYMENT_CHANNEL_ADDRESS, null]
  }, { headers })

  console.log(response.data)
  
  /* 
    IMPORTANT !!
    Wait until block `settling_at` block height reach before collect
  */

  /* Collect channel payment */
  
  console.log("##### COLLECT CHANNEL MESSAGE  #####")

  /* Get nonce */
  console.log("##### GET NONCE #####")

  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.MpoolGetNonce",
    id: 1,
    params: ["t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy"]
  }, {headers})

  console.log(response.data)
  nonce = response.data.result
  
  update_paych_message = filecoin_signer.collectPymtChan(PAYMENT_CHANNEL_ADDRESS, "t137sjdbgunloi7couiy4l5nc7pd6k2jmq32vizpy", nonce)

  console.log(update_paych_message)

  signedMessage = JSON.parse(filecoin_signer.transactionSignLotus(update_paych_message, privateKey));
  
  console.log(signedMessage)
  
  console.log("##### COLLECTE PAYMENT CHANNEL #####")
  
  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.MpoolPush",
    id: 1,
    params: [signedMessage]
  }, { headers })

  console.log(response.data)

  cid = response.data.result
  
  console.log("##### WAIT FOR PAYMENT CHANNEL STATE #####")

  response = await axios.post(URL, {
    jsonrpc: "2.0",
    method: "Filecoin.StateWaitMsg",
    id: 1,
    params: [cid, null]
  }, { headers })

  console.log(response.data)
  
}

main()
  .catch((error) => {
    console.log(error)
  })