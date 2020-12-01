const COINS = require('../models/coins')
const eos = require('../helpers/eos')
const btc = require('../helpers/btc')
const eth = require('../helpers/eth')
const etc = require('../helpers/etc')
const ltc = require('../helpers/ltc')
const dash = require('../helpers/dash')
const xrp = require('../helpers/xrp')
const xlm = require('../helpers/xlm')

var sendTx = async (options) => {
    return new Promise(async (resolve) => {
        let coin = options.coin
        let userId = options.userId
        if (!coin)
            return resolve({ success: false, message: 'Please provide registered coin' })
        switch (coin) {
            case 'EOS':
                try {
                    let tx = await eos.sendTx(options)
                    return resolve(tx)

                } catch (error) {
                    return resolve({ success: false, message: 'Please try again to get an address' });
                }
            case 'ZIPCO':
                try {
                    let tx = await eos.sendTx(options)
                    return resolve(tx)

                } catch (error) {
                    return resolve({ success: false, message: 'Please try again to get an address' });
                }
            case 'BTC':
                try {
                    const tx = await btc.send_tx(options)
                    resolve(tx);
                } catch (err) {
                    resolve({ success: false, message: err })
                }
                break;
            case 'ETH':
                try {
                    const tx = await eth.send_tx(options);
                    resolve(tx)
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'ETC':
                try {
                    const tx = await etc.send_tx(options);
                    resolve(tx)
                } catch (err) {
                    console.log(err.message)
                    resolve({ success: false, message: err.message })
                }
                break;
            case 'LTC':
                try {
                    const tx = await ltc.send_tx(options)
                    resolve(tx)
                } catch (err) {
                    resolve({ success: false, message: err.message })
                }
                break;
            case 'DASH':
                try {
                    let address = await dash.send_tx(options);
                    resolve(address);
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'XRP':
                try {
                    const tx = await xrp.send_tx(options);
                    resolve(tx);
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'XLM':
                try {
                    let tx = await xlm.generateAddress(userId);
                    resolve(tx);
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
    sendTx: sendTx
}