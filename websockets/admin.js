const System = require('../models/system')
const { encodeDecode } = require('../helpers/encrypt')
var Admin = function (app, socket) {
    this.app = app;
    this.socket = socket;

    this.handler = {
        makerFees: makerFees.bind(this),
        encryptWallet: encryptWallet.bind(this),
        decryptWallet: decryptWallet.bind(this)
    };
}

const makerFees = async (data) => {
    const settings = await System.find({})
    var setting = settings[0]
    switch (data['type']) {
        case 'maker':
            setting['fees']['quicktrade']['maker'] = data['fee']
            await setting.save()
            break;
        case 'taker':
            setting['fees']['quicktrade']['taker'] = data['fee']
            await setting.save()
            break;
        case 'deposit':
            setting['fees']['others']['deposit'] = data['fee']
            await setting.save()
            break;
        case 'withdrawl':
            setting['fees']['others']['withdrawl'] = data['fee']
            await setting.save()
            break;
        case 'transferFrom':
            setting['fees']['others']['transferFrom'] = data['fee']
            await setting.save()
            break;
        case 'transferTo':
            setting['fees']['others']['transferTo'] = data['fee']
            await setting.save()
            break;
        case 'marginfx':
            setting['fees']['others']['marginfx'] = data['fee']
            await setting.save()
            break;
        case 'zipcxfee':
            setting['fees']['others']['zipcxfee'] = data['fee']
            await setting.save()
            break;
    }
    // this.app.allSockets.emit('message', data);
};

async function decryptWallet(data) {
    let decryptedMnemonic;
    const system = await System.find();
    switch (data['wallet']) {
        case 'BTC':
            const btc_wallet = system[0]['btc'];
            if (!data['isSecure'])
                return true;
            decryptedMnemonic = await encodeDecode(btc_wallet['mnemonic'], 'd');
            this.socket.emit('decryptedMnemonic', { mnemonic: decryptedMnemonic });
            break;
        case 'ETH':
            const eth_wallet = system[0]['eth'];
            if (!data['isSecure'])
                return true;
            decryptedMnemonic = await encodeDecode(eth_wallet['mnemonic'], 'd');
            this.socket.emit('decryptedMnemonic', { mnemonic: decryptedMnemonic });
            break;
        case 'ETC':
            const etc_wallet = system[0]['etc'];
            if (!data['isSecure'])
                return true;
            decryptedMnemonic = await encodeDecode(etc_wallet['mnemonic'], 'd');
            this.socket.emit('decryptedMnemonic', { mnemonic: decryptedMnemonic });
            break;
        case 'LTC':
            const ltc_wallet = system[0]['ltc'];
            if (!data['isSecure'])
                return true;
            decryptedMnemonic = await encodeDecode(ltc_wallet['mnemonic'], 'd');
            this.socket.emit('decryptedMnemonic', { mnemonic: decryptedMnemonic });
            break;
        case 'DASH':
            const dash_wallet = system[0]['dash'];
            if (!data['isSecure'])
                return true;
            decryptedMnemonic = await encodeDecode(dash_wallet['mnemonic'], 'd');
            this.socket.emit('decryptedMnemonic', { mnemonic: decryptedMnemonic });
            break;
        case 'XRP':
            const xrp_wallet = system[0]['xrp'];
            if (!data['isSecure'])
                return true;
            decryptedMnemonic = await encodeDecode(xrp_wallet['mnemonic'], 'd');
            this.socket.emit('decryptedMnemonic', { mnemonic: decryptedMnemonic });
            break;
        case 'XLM':
            const xlm_wallet = system[0]['xlm'];
            if (!data['isSecure'])
                return true;
            decryptedMnemonic = await encodeDecode(xlm_wallet['mnemonic'], 'd');
            this.socket.emit('decryptedMnemonic', { mnemonic: decryptedMnemonic });
            break;

        default:
            break;
    }
};

async function encryptWallet(data) {
    let encryptedMnemonic;
    const system = await System.find();
    switch (data['wallet']) {
        case 'BTC':
            const btc_wallet = system[0]['btc'];
            if (data['isSecure'])
                return true;
            encryptedMnemonic = await encodeDecode(btc_wallet['mnemonic'], 'e');
            this.socket.emit('encryptedMnemonic', { mnemonic: encryptedMnemonic });
            break;
        case 'ETH':
            const eth_wallet = system[0]['eth'];
            if (data['isSecure'])
                return true;
            encryptedMnemonic = await encodeDecode(eth_wallet['mnemonic'], 'e');
            this.socket.emit('encryptedMnemonic', { mnemonic: encryptedMnemonic });
            break;
        case 'ETC':
            const etc_wallet = system[0]['etc'];
            if (data['isSecure'])
                return true;
            encryptedMnemonic = await encodeDecode(etc_wallet['mnemonic'], 'e');
            this.socket.emit('encryptedMnemonic', { mnemonic: encryptedMnemonic });
            break;
        case 'LTC':
            const ltc_wallet = system[0]['ltc'];
            if (data['isSecure'])
                return true;
            encryptedMnemonic = await encodeDecode(ltc_wallet['mnemonic'], 'e');
            this.socket.emit('encryptedMnemonic', { mnemonic: encryptedMnemonic });
            break;
        case 'DASH':
            const dash_wallet = system[0]['dash'];
            if (data['isSecure'])
                return true;
            encryptedMnemonic = await encodeDecode(dash_wallet['mnemonic'], 'e');
            this.socket.emit('encryptedMnemonic', { mnemonic: encryptedMnemonic });
            break;
        case 'XRP':
            const xrp_wallet = system[0]['xrp'];
            if (data['isSecure'])
                return true;
            encryptedMnemonic = await encodeDecode(xrp_wallet['mnemonic'], 'e');
            this.socket.emit('encryptedMnemonic', { mnemonic: encryptedMnemonic });
            break;
        case 'XLM':
            const xlm_wallet = system[0]['xlm'];
            if (data['isSecure'])
                return true;
            encryptedMnemonic = await encodeDecode(xlm_wallet['mnemonic'], 'e');
            this.socket.emit('encryptedMnemonic', { mnemonic: encryptedMnemonic });
            break;

        default:
            break;
    }
};

module.exports = Admin;