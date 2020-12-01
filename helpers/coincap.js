const fetch = require('node-fetch');
var API_KEY = ""
var io; 

set_params = (api_key,_io) => {
    API_KEY = api_key;
    io = _io
}
get_prices = (currency, amount = 1, convert = 'USD') => {
    fetch(`https://pro-api.coinmarketcap.com/v1/tools/price-conversion?symbol=${currency}&amount=${amount}&convert=${convert}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CMC_PRO_API_KEY': API_KEY
        }
    }).then(async res => {
        console.log(res)
        if (!res.ok)
            io.sockets.emit('price', { success: false, message: 'API call error' })
        let json = await res.json()
        io.sockets.emit('price', { success: true, message: json['data'] })
    })
}


proccess_coincap_prices = () => {
    console.log("Process coin cap prices")
    let pairs = ['BTC', 'ETH','EOS','LTC','CAD','GBP','EUR']
    pairs.forEach(pair => {
        setTimeout(get_prices, 2000, pair)
    })
    console.log("called get prices")
    setTimeout(proccess_coincap_prices, 7200000)
}
//7200000

module.exports = {
    set_params:set_params,
    get_prices:get_prices,
    proccess_coincap_prices:proccess_coincap_prices
};