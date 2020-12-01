const express = require('express')
var router = express.Router()
const bodyParser = require('body-parser')
require('dotenv').config()
router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())
const VerifyToken = require('../auth/VerifyToken')
const eos = require('../helpers/eos')
const txFactory = require('../fatory/transaction')
const eth = require('../helpers/eth')

router.get('/getAccount', async (req, res) => {
    const { name } = req.query
    if (!name)
        return res.send({ success: false, message: 'Please provide a valid account name' })
    if (typeof name != 'string')
        return res.send({ success: false, message: 'Account name must be valid string' })
    let response = await eos.getAccount(name)
    res.send(response)
})

router.get('/getAccountBalance', async (req, res) => {
    const { name, token, contract } = req.query
    if (!name || !token || !contract)
        return res.send({ success: false, message: 'Please provide required parameters' })
    if (typeof name != 'string' || typeof token != 'string' || typeof contract != 'string')
        return res.send({ success: false, message: 'All parameters must be valid strings' })

    let response = await eos.getAccountBalance({ name, token, contract })
    return res.send(response)
})

router.post('/transfer', async (req, res) => {
    let { sender, receiver, amount, token, memo, contract, privateKey } = req.body
    amount = parseFloat(amount).toFixed(4)
    if (amount == 'NaN' || amount < 0.0001)
        return res.send({ success: false, message: 'Please provide valid amount' })
    let response = await eos.transfer({ sender, receiver, amount, token, memo, contract, privateKey })
    return res.send(response)
})

router.post('/createAccount', async (req, res) => {
    const { name } = req.body;
    if (!name)
        return res.send({ success: false, message: 'Please provide required parameters' })
    if (typeof name != 'string')
        return res.send({ success: false, message: 'Account name must a valid string' })
    let response = await eos.createAccount({ new_account: name })
    return res.send(response)
})

router.get('/getAccountName', async (req, res) => {
    const { publickey } = req.query;
    const response = await eos.getAccountName(publickey)
    return res.send(response)
})

router.get('/getRamPrice', async (req, res) => {
    const response = await eos.ramPrice()
    res.send(response)
})

router.get('/getRamFee', async (req, res) => {
    const response = await eos.getRamFee()
    res.send(response)
})

router.post('/buyRam', async (req, res) => {
    const { payer, receiver, rambyte } = req.body
    const response = await eos.buyRam({ payer, receiver, rambyte })
    res.send(response)
})

router.post('/sellRam', async (req, res) => {
    const { seller, rambyte } = req.body
    const response = await eos.sellRam({ seller, rambyte })
    res.send(response)
})

router.post('/stake', async (req, res) => {
    const { payer, to, netstake, cpustake } = req.body
    const response = await eos.stake({ payer, to, netstake, cpustake })
    return res.send(response)
})

router.post('/unstake', async (req, res) => {
    const { payer, to, netstake, cpustake } = req.body
    const response = await eos.unstake({ payer, to, netstake, cpustake })
    return res.send(response)
})

router.post('/createWallet', async (req, res) => {
    const { name } = req.body
    const response = await eos.createWallet(name)
    return res.send(response)
})

router.post('/openWallet', async (req, res) => {
    const { name } = req.body
    const response = await eos.openWallet(name)
    return res.send(response)
})

router.post('/lockWallet', async (req, res) => {
    const { name } = req.body
    const response = await eos.lockWallet(name)
    return res.send(response)
})

router.post('/lockAllWallet', async (req, res) => {
    const { name } = req.body
    const response = await eos.lock_allWallets(name)
    return res.send(response)
})

router.post('/unlockWallet', async (req, res) => {
    const { name, password } = req.body
    const response = await eos.unlockWallet(name, password)
    return res.send(response)
})

router.post('/importWallet', async (req, res) => {
    const { name, privatekey } = req.body
    const response = await eos.importWallet(name, privatekey)
    return res.send(response)
})

router.get('/listWallet', async (req, res) => {
    const response = await eos.listWallets()
    return res.send(response)
})

router.get('/getPublicKeys', async (req, res) => {
    const response = await eos.publicKeys()
    return res.send(response)
})

router.get('/removeKey', async (req, res) => {
    const { publickey, name, password } = req.body
    const response = await eos.removeWalletKey(publickey, name, password)
    return res.send(response)
})


router.post('/send-btc-tx', VerifyToken, async (req, res) => {
    const options = {
        coin: 'BTC',
        userId: req.userId,
        amount: req.body.amount,
        to: req.body.address
    }
    const response = await txFactory.sendTx(options)
    return res.send(response)
})

router.post('/send-eth-tx', VerifyToken, async (req, res) => {
    const options = {
        coin: 'ETH',
        userId: req.userId,
        amount: req.body.amount,
        to: req.body.address
    }
    const response = await txFactory.sendTx(options)
    return res.send(response)
})

router.post('/send-ltc-tx', VerifyToken, async (req, res) => {
    const options = {
        coin: 'LTC',
        userId: req.userId,
        amount: req.body.amount,
        to: req.body.address
    }
    const response = await txFactory.sendTx(options)
    return res.send(response)
})

router.post('/send-etc-tx', VerifyToken, async (req, res) => {
    const options = {
        coin: 'ETC',
        userId: req.userId,
        amount: req.body.amount,
        to: req.body.address
    }
    const response = await txFactory.sendTx(options)
    return res.send(response)
})

router.post('/send-xrp-tx', VerifyToken, async (req, res) => {
    const options = {
        coin: 'XRP',
        userId: req.userId,
        amount: req.body.amount,
        to: req.body.address
    }
    const response = await txFactory.sendTx(options)
    return res.send(response)
})

router.post('/send-dash-tx', VerifyToken, async (req, res) => {
    const options = {
        coin: 'DASH',
        userId: req.userId,
        amount: req.body.amount,
        to: req.body.address
    }
    const response = await txFactory.sendTx(options)
    return res.send(response)
})


router.get('/get-estimated-fee', async (req, res) => {
    const response = await eth.getEstimatedNetworkFees()
    return res.send(response)
})

module.exports = router;