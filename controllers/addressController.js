const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
require('dotenv').config()
var VerifyToken = require('../auth/VerifyToken');
const addressFactory = require('../fatory/address')
const System = require('../models/system')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const eos = require('../helpers/eos')
const btc = require('../helpers/btc')
const eth = require('../helpers/eth')
const etc = require('../helpers/etc')
const ltc = require('../helpers/ltc')
const dash = require('../helpers/dash')
const xrp = require('../helpers/xrp')
const xlm = require('../helpers/xlm')


//---------------------- BTC WALLET ------------------------------
router.get('/check-btc-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const isGenerated = await btc.is_btc_address_generated(userId)
    res.send({ address: isGenerated })
})

router.get('/generate-btc-address', VerifyToken, async (req, res) => {
    let response = await addressFactory.generateAddress(req)
    return res.send({ generated: response })
})

router.get('/get-btc-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const response = await btc.get_btc_address(userId)
    res.send({ success: true, address: response })
})

router.get('/initialize-btc-wallet', VerifyToken, async (req, res) => {
    try {
        await btc.initialize_btc_wallet('wagon opinion dilemma echo level click network system hold million inch inhale')
        return res.send({ success: true, message: 'Wallet initialzed successfully' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.get('/encrypt-btc-wallet', async (req, res) => {
    const response = await btc.encrypt_wallet()
    res.send(response)
})


router.get('/decrypt-btc-wallet', async (req, res) => {
    const response = await btc.decrypt_wallet()
    res.send(response)
})

router.get('/get-btc-wallet', async (req, res) => {
    const response = await btc.get_btc_wallet()
    return res.send(response)
})

//---------------------- ETH WALLET ------------------------------

router.get('/check-eth-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const isGenerated = await eth.is_eth_address_generated(userId)
    res.send({ address: isGenerated })
})

router.get('/generate-eth-address', VerifyToken, async (req, res) => {
    let response = await addressFactory.generateAddress(req)
    return res.send({ generated: response })
})

router.get('/get-eth-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const response = await eth.get_eth_address(userId)
    res.send({ success: true, address: response })
})

router.get('/initialize-eth-wallet', VerifyToken, async (req, res) => {
    try {
        await eth.initialize_eth_wallet('tag volcano eight thank tide danger coast health above argue embrace heavy')
        return res.send({ success: true, message: 'Wallet initialzed successfully' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.get('/encrypt-eth-wallet', async (req, res) => {
    const response = await eth.encrypt_wallet()
    res.send(response)
})


router.get('/decrypt-eth-wallet', async (req, res) => {
    const response = await eth.decrypt_wallet()
    res.send(response)
})

router.get('/get-eth-wallet', async (req, res) => {
    const response = await eth.get_eth_wallet()
    return res.send(response)
})

//---------------------- ETC WALLET ------------------------------

router.get('/check-etc-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const isGenerated = await etc.is_etc_address_generated(userId)
    res.send({ address: isGenerated })
})

router.get('/generate-etc-address', VerifyToken, async (req, res) => {
    let response = await addressFactory.generateAddress(req)
    return res.send({ generated: response })
})

router.get('/get-etc-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const response = await etc.get_etc_address(userId)
    res.send({ success: true, address: response })
})

router.get('/initialize-etc-wallet', VerifyToken, async (req, res) => {
    try {
        await etc.initialize_etc_wallet('tag volcano eight thank tide danger coast health above argue embrace heavy')
        return res.send({ success: true, message: 'Wallet initialzed successfully' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.get('/encrypt-etc-wallet', async (req, res) => {
    const response = await etc.encrypt_wallet()
    res.send(response)
})


router.get('/decrypt-etc-wallet', async (req, res) => {
    const response = await etc.decrypt_wallet()
    res.send(response)
})

router.get('/get-etc-wallet', async (req, res) => {
    const response = await etc.get_etc_wallet()
    return res.send(response)
})

//---------------------- LTC WALLET ------------------------------

router.get('/check-ltc-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const isGenerated = await ltc.is_ltc_address_generated(userId)
    res.send({ address: isGenerated })
})

router.get('/generate-ltc-address', VerifyToken, async (req, res) => {
    let response = await addressFactory.generateAddress(req)
    return res.send({ generated: response })
})

router.get('/get-ltc-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const response = await ltc.get_ltc_address(userId)
    res.send({ success: true, address: response })
})

router.get('/initialize-ltc-wallet', VerifyToken, async (req, res) => {
    try {
        await ltc.initialize_ltc_wallet('tag volcano eight thank tide danger coast health above argue embrace heavy')
        return res.send({ success: true, message: 'Wallet initialzed successfully' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.get('/encrypt-ltc-wallet', async (req, res) => {
    const response = await ltc.encrypt_wallet()
    res.send(response)
})


router.get('/decrypt-ltc-wallet', async (req, res) => {
    const response = await ltc.decrypt_wallet()
    res.send(response)
})

router.get('/get-ltc-wallet', async (req, res) => {
    const response = await ltc.get_ltc_wallet()
    return res.send(response)
})

//---------------------- DASH WALLET ------------------------------

router.get('/check-dash-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const isGenerated = await dash.is_dash_address_generated(userId)
    res.send({ address: isGenerated })
})

router.get('/generate-dash-address', VerifyToken, async (req, res) => {
    let response = await addressFactory.generateAddress(req)
    return res.send({ generated: response })
})

router.get('/get-dash-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const response = await dash.get_dash_address(userId)
    res.send({ success: true, address: response })
})

router.get('/initialize-dash-wallet', VerifyToken, async (req, res) => {
    try {
        await dash.initialize_dash_wallet('tag volcano eight thank tide danger coast health above argue embrace heavy')

        return res.send({ success: true, message: 'Wallet initialzed successfully' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.get('/encrypt-dash-wallet', async (req, res) => {
    const response = await dash.encrypt_wallet()
    res.send(response)
})


router.get('/decrypt-dash-wallet', async (req, res) => {
    const response = await dash.decrypt_wallet()
    res.send(response)
})

router.get('/get-dash-wallet', async (req, res) => {
    const response = await dash.get_dash_wallet()
    return res.send(response)
})

//---------------------- XRP WALLET ------------------------------

router.get('/check-xrp-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const isGenerated = await xrp.is_xrp_address_generated(userId)
    res.send({ address: isGenerated })
})

router.get('/generate-xrp-address', VerifyToken, async (req, res) => {
    let response = await addressFactory.generateAddress(req)
    return res.send({ generated: response })
})

router.get('/get-xrp-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const response = await xrp.get_xrp_address(userId)
    res.send({ success: false, response })
})

router.get('/initialize-xrp-wallet', VerifyToken, async (req, res) => {
    try {
        await xrp.initialize_xrp_wallet('tag volcano eight thank tide danger coast health above argue embrace heavy')
        return res.send({ success: true, message: 'Wallet initialzed successfully' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.get('/encrypt-xrp-wallet', async (req, res) => {
    const response = await xrp.encrypt_wallet()
    res.send(response)
})


router.get('/decrypt-xrp-wallet', async (req, res) => {
    const response = await xrp.decrypt_wallet()
    res.send(response)
})

router.get('/get-xrp-wallet', async (req, res) => {
    const response = await xrp.get_xrp_wallet()
    return res.send(response)
})


//---------------------- XLM WALLET ------------------------------

router.get('/check-xlm-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const isGenerated = await xlm.is_xlm_address_generated(userId)
    res.send({ address: isGenerated })
})

router.get('/get-xlm-address', VerifyToken, async (req, res) => {
    const userId = req.userId
    const response = await xlm.get_xlm_address()
    res.send({ success: false, address: response })
})

router.get('/initialize-xlm-wallet', async (req, res) => {
    try {
        await xlm.initialize_xlm_wallet('tag volcano eight thank tide danger coast health above argue embrace heavy', 'passphrase', 'ZIPCX-12345')
        return res.send({ success: true, message: 'Wallet initialzed successfully' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.get('/encrypt-xlm-wallet', async (req, res) => {
    const response = await xlm.encrypt_wallet()
    res.send(response)
})


router.get('/decrypt-xlm-wallet', async (req, res) => {
    const response = await xlm.decrypt_wallet()
    res.send(response)
})

router.get('/get-xlm-wallet', async (req, res) => {
    const response = await xlm.get_xlm_wallet()
    return res.send(response)
})

module.exports = router;