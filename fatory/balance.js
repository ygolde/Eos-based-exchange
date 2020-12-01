const COINS = require('../models/coins')
const eos = require('../helpers/eos')
const btc = require('../helpers/btc')
const eth = require('../helpers/eth')
const etc = require('../helpers/etc')
const ltc = require('../helpers/ltc')
const dash = require('../helpers/dash')
const xrp = require('../helpers/xrp')
const xlm = require('../helpers/xlm')

var getBalance = async (req) => {
    return new Promise(async (resolve) => {
        let coin = req.query.coin
        let userId = req.userId
        if (!coin)
            return resolve({ success: false, message: 'Please provide registered coin' })
        switch (coin) {
            case 'EOS':
                try {
                    let balance = await eos.get_user_eos_balance(userId)
                    return resolve(balance)

                } catch (error) {
                    return resolve({ success: false, message: 'Please try again to get an address' });
                }
            case 'ZIPCO':
                try {
                    let balance = await eos.get_user_zipco_balance(userId)
                    return resolve(balance)

                } catch (error) {
                    return resolve({ success: false, message: 'Please try again to get an address' });
                }
            case 'BTC':
                try {
                    let balance = await btc.get_btc_balance(userId)
                    resolve({ balance: balance['confirmed_balance'], pending: balance['unconfirmed_balance'] });
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'ETH':
                try {
                    let balance = await eth.get_eth_balance(userId);
                    resolve(balance)
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'ETC':
                try {
                    let balance = await etc.get_etc_balance(userId);
                    resolve(balance)
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'LTC':
                try {
                    let balance = await ltc.get_ltc_balance(userId)
                    resolve({ balance: balance['confirmed_balance'], pending: balance['unconfirmed_balance'] })
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'DASH':
                try {
                    let balance = await dash.get_dash_balance(userId);
                    resolve({ balance: balance['confirmed_balance'], pending: balance['unconfirmed_balance'] });
                } catch (err) {
                    resolve({ success: false, error: err.message })
                }
                break;
            case 'XRP':
                try {
                    let balance = await xrp.get_xrp_balance(userId);
                    resolve(balance);
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
    getBalance: getBalance
}