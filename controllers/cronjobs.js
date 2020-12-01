var cron = require('node-cron');
require('../helpers/db')
var ORDER = require('../models/orders')
const PAIRS = require('../models/pairs')
const RATES = require('../models/currency-rate')
const LOGS = require('../models/error-logs')
const EOSTX = require('../models/eos-transactions')
const { ProcessExchange } = require('./matchingController')
const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();

const { JsonRpc } = require("@eoscafe/hyperion")
const fetch = require("isomorphic-fetch")
const endpoint = "https://api.eossweden.org"
const rpc = new JsonRpc(endpoint, { fetch })

// var task = cron.schedule('0 0 */1 * *', getMarket24);

/*
cron.schedule('* * * * *', async () => {
    return new Promise(async (resolve) => {
        let data = await CoinGeckoClient.simple.price({
            ids: ['bitcoin', 'ethereum', 'eos', 'litecoin', 'dash', 'ethereum-classic', 'stellar', 'ripple'],
            vs_currencies: ['eur', 'usd', 'cad'],
            include_market_cap: false,
            include_24hr_vol: false,
            include_24hr_change: false,
            include_last_updated_at: false
        });
        await RATES.create({ rate: data['data'] })
            .catch(async err => {
                await LOGS.create({
                    type: 'COINGECKO API',
                    detail: err
                })
            })
        console.log(data)
        resolve()
    })
});

*/


/*
var getMarket24 = async () => {
    return new Promise(async (resolve) => {
        let pairs = await PAIRS.find({}, { _id: 1 });
        let now = new Date()
        let end = new Date()
        let day = new Date()
        let firstday = new Date(day.setDate(day.getDate() - day.getDay()));
        var lastday = new Date(day.setDate(day.getDate() - day.getDay() + 6));
        now.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        pairs.forEach(async (pair) => {
            let max = await ORDER.find({ created_at: { $gte: now }, pairId: pair['_id'] }).sort({ "price": -1 }).limit(1);
            let min = await ORDER.find({ created_at: { $gte: now }, pairId: pair['_id'] }).sort({ "price": 1 }).limit(1);
            let openDay = await ORDER.find({ created_at: { $gte: firstday }, pairId: pair['_id'] }).sort({ 'created_at': 1 }).limit(1)
            let closeDay = await ORDER.find({ created_at: { $lte: lastday }, pairId: pair['_id'] }).sort({ 'created_at': -1 }).limit(1)

            let high = max[0]['price'] || 0;
            let low = min[0]['price'] || 0;
            let open = openDay[0]['price'] || 0;
            let close = closeDay[0]['price'] || 0;
            await MARKET.create({ pairId: pair['_id'], high, low, open, close })
        })
        resolve({ success: true })
    })
}

var after = new Date()
after.setFullYear(2020, 5, 1)
after = after.toISOString()
var before = new Date()
// before.setHours(before.getHours() + 1)
before = before.toISOString()
var options = {
    to: "coordinators",
    symbol: 'EOS',
    contract: 'eosio.token',
    after: after,
    before: before
}
cron.schedule('* * * * *', async () => {
    const { actions } = await rpc.get_transfers(options);
    if (actions.length) {
        var txs = actions.map(action => {
            action.act.data['txId'] = action.trx_id
            return action.act.data
        })
        var filtered = txs.filter(tx => {
            return tx.memo.split('-')[0] === 'ZIPCX'
        })
        console.log(filtered)
        if (filtered.length) {
            filtered.forEach(async action => {
                var is_exist = await EOSTX.find({ txId: action.txId })
                if (!is_exist.length) {
                    await EOSTX.create(action)
                }
            })
        }
    }
    // after = before
    options.before = new Date()
    options.before.setHours(options.before.getHours() + 1)
    options.before = options.before.toISOString()
})
*/

cron.schedule('* * * * *', ProcessExchange)