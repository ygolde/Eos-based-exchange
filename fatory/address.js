const COINS = require('../models/coins')
const eos = require('../helpers/eos')
const btc = require('../helpers/btc')
const eth = require('../helpers/eth')
const etc = require('../helpers/etc')
const ltc = require('../helpers/ltc')
const dash = require('../helpers/dash')
const xrp = require('../helpers/xrp')
const xlm = require('../helpers/xlm')

var generateAddress = async (req) => {
    return new Promise(async (resolve) => {
        let network = req.query.network
        let coin = req.query.coin
        let userId = req.userId
        if (!coin)
            return resolve({ success: false, message: 'Please provide registered coin' })
        switch (coin) {
            case 'EOS':
                try {
                    let keyPairs = await eos.getAddress()
                    return resolve(keyPairs)

                } catch (error) {
                    return resolve({ success: false, message: 'Please try again to get an address' });
                }
            case 'BTC':
                try {
                    let address = await btc.generateAddress(userId)
                    resolve(address);
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'ETH':
                try {
                    console.log('ETH')
                    let address = await eth.generateAddress(userId);
                    resolve(address)
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'ETC':
                try {
                    let address = await etc.generateAddress(userId);
                    resolve(address)
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'LTC':
                try {
                    let address = await ltc.generateAddress(userId)
                    resolve(address)
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'DASH':
                try {
                    let address = await dash.generateAddress(userId);
                    resolve(address);
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'XRP':
                try {
                    let address = await xrp.generateAddress(userId);
                    resolve(address);
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'XLM':
                try {
                    let address = await xlm.generateAddress(userId);
                    resolve(address);
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
            default:
                resolve({ success: false, message: 'Please provide registered coin' })
                break;
        }
    })
}

module.exports = {
    generateAddress: generateAddress
}