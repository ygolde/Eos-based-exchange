const request = require('node-fetch')
const USERS = require('../models/User')
const SYSTEM = require('../models/system')
const Wallets = require('../models/wallets')
const bip32 = require('bip32')
const bip39 = require('bip39')
const { encodeDecode } = require('./encrypt')
const dashcore = require('@dashevo/dashcore-lib')
const derivePath = `m/44'/1'`
var dash = {
    accountIndex: 0,
    chainIndex: 0,
    addressIndex: 0
}

// Use coinType 1 for testnet
// Use coinType 5 for livenet


const networks = {
    livenet: {
        messagePrefix: 'unused',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x4c,
        scriptHash: 0x10,
        wif: 0xcc,
        network: dashcore.Networks.livenet
    },
    testnet: {
        messagePrefix: 'unused',
        bip32: {
            public: 0x043587cf,
            private: 0x04358394
        },
        pubKeyHash: 0x8c,
        scriptHash: 0x13,
        wif: 0xef,
        network: dashcore.Networks.testnet
    }
}

function generate_address(pub) {
    const cmp = dashcore.PublicKey(pub, { network: networks.testnet['network'] })
    const address = cmp.toAddress().toString()
    return address
}

const check_wallet_initialization = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const { load } = system[0]['dash']
        if (load)
            return resolve(true)
        return resolve(false)
    })
}

const encrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const dash_wallet = system[0]['dash'];
            if (dash_wallet['isSecure'])
                return resolve(true);
            system[0]['dash']['mnemonic'] = await encodeDecode(dash_wallet['mnemonic'], 'e');
            system[0]['dash']['root']['Xpub'] = await encodeDecode(dash_wallet['root']['Xpub'], 'e');
            system[0]['dash']['root']['Xpriv'] = await encodeDecode(dash_wallet['root']['Xpriv'], 'e');
            system[0]['dash']['account']['Xpub'] = await encodeDecode(dash_wallet['account']['Xpub'], 'e');
            system[0]['dash']['account']['Xpriv'] = await encodeDecode(dash_wallet['account']['Xpriv'], 'e');
            system[0]['dash']['bip32']['Xpriv'] = await encodeDecode(dash_wallet['bip32']['Xpriv'], 'e');
            system[0]['dash']['bip32']['Xpub'] = await encodeDecode(dash_wallet['bip32']['Xpub'], 'e');
            system[0]['dash']['isSecure'] = true
            await system[0].save()
            return resolve(true);
        } catch (error) {
            console.log(error)
            return resolve(false);
        }
    })
}

const decrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const dash_wallet = system[0]['dash'];
            if (!dash_wallet['isSecure'])
                return resolve(true);
            system[0]['dash']['mnemonic'] = await encodeDecode(dash_wallet['mnemonic'], 'd');
            system[0]['dash']['root']['Xpub'] = await encodeDecode(dash_wallet['root']['Xpub'], 'd');
            system[0]['dash']['root']['Xpriv'] = await encodeDecode(dash_wallet['root']['Xpriv'], 'd');
            system[0]['dash']['account']['Xpub'] = await encodeDecode(dash_wallet['account']['Xpub'], 'd');
            system[0]['dash']['account']['Xpriv'] = await encodeDecode(dash_wallet['account']['Xpriv'], 'd');
            system[0]['dash']['bip32']['Xpriv'] = await encodeDecode(dash_wallet['bip32']['Xpriv'], 'd');
            system[0]['dash']['bip32']['Xpub'] = await encodeDecode(dash_wallet['bip32']['Xpub'], 'd');
            system[0]['dash']['isSecure'] = false
            await system[0].save()
            return resolve(true);
        } catch (error) {
            return resolve(false);
        }
    })
}

const get_dash_wallet = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find();
        const { load, isSecure, mnemonic, logo } = system[0]['dash'];
        return resolve({ load, logo, isSecure, mnemonic, type: 'DASH' })
    })
}

var initialize_dash_wallet = async (mnemonic) => {
    return new Promise(async (resolve, reject) => {
        try {
            const isLoaded = await check_wallet_initialization()
            if (isLoaded)
                return reject(Error('Wallet already loaded'))

            if (!bip39.validateMnemonic(mnemonic))
                return reject(Error('Invalid mnemonic'))
            const seed = bip39.mnemonicToSeedSync(mnemonic);

            const root = bip32.fromSeed(seed, networks.testnet);
            const rootXPub = root.neutered().toBase58()
            const rootXPriv = root.toBase58(root.privateKey)


            const accountpath = `${derivePath}/${dash.accountIndex}'`;
            const account = root.derivePath(accountpath);
            const accountXPub = account.neutered().toBase58();
            const accountXPriv = account.toBase58(account.privateKey)


            const bip32path = `${derivePath}/${dash.accountIndex}'/${dash.chainIndex}`;
            const bip32Account = root.derivePath(bip32path);
            const bip32XPub = bip32Account.neutered().toBase58();
            const bip32XPriv = bip32Account.toBase58(bip32Account.privateKey)


            var system = await SYSTEM.find()
            system[0]['dash']['mnemonic'] = mnemonic
            system[0]['dash']['load'] = true
            system[0]['dash']['account']['accountpath'] = accountpath

            system[0]['dash']['root']['Xpub'] = rootXPub
            system[0]['dash']['root']['Xpriv'] = rootXPriv

            system[0]['dash']['account']['Xpub'] = accountXPub
            system[0]['dash']['account']['Xpriv'] = accountXPriv

            system[0]['dash']['bip32']['bip32path'] = bip32path
            system[0]['dash']['bip32']['Xpub'] = bip32XPub
            system[0]['dash']['bip32']['Xpriv'] = bip32XPriv

            await system[0].save()
            resolve()
        } catch (error) {
            console.log(error)
            reject(Error(error.message))
        }
    })
}

var generateAddress = async (userId) => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find()
            const Xpub = system[0]['dash']['root']['Xpriv']
            var child = bip32.fromBase58(Xpub, networks.testnet);
            const addresspath = `${derivePath}/${dash['accountIndex']}'/${dash['chainIndex']}/${dash['addressIndex']}`
            var account = child.derivePath(addresspath)
            // console.log(account.publicKey.toString('hex'))
            // console.log(account.toWIF())
            const address = generate_address(account.publicKey.toString('hex'))
            console.log(address)
            var user = await USERS.findOne({ _id: userId }).exec()
            user['wallets']['DASH']['address'] = `dash:${address}`
            user['wallets']['DASH']['accountIndex'] = dash.accountIndex
            user['wallets']['DASH']['chainIndex'] = dash.chainIndex
            user['wallets']['DASH']['addressIndex'] = dash.addressIndex
            await user.save()
            await Wallets.create({
                userId,
                name: 'DASH',
                coin: 1,
                accountIndex: dash.accountIndex,
                chainIndex: dash.chainIndex,
                addressIndex: dash.addressIndex
            })
            dash.addressIndex++
            return resolve(true)
        } catch (error) {
            console.log(error)
            return resolve(false)
        }
    })
}

var get_dash_address = async (userId) => {
    var user = await USERS.findOne({ _id: userId }).exec()
    const address = user['wallets']['DASH']['address']
    return address
}

var is_dash_address_generated = async (userId) => {
    return new Promise(async (resolve) => {
        var user = await USERS.findOne({ _id: userId }).exec()
        const address = user['wallets']['DASH']['address']
        if (address)
            return resolve(true)
        return resolve(false)
    })
}

var get_dash_balance = async (userId) => {
    return new Promise(async (resolve) => {
        const user = await USERS.findOne({ _id: userId }).exec()
        if (!user['wallets']['DASH']['address'])
            return resolve({ confirmed_balance: 0.00, unconfirmed_balance: 0.00 })
        const address = user['wallets']['DASH']['address'].split(':')[1]
        const dash_network = 'DASHTEST'
        try {
            request(`https://sochain.com/api/v2/get_address_balance/${dash_network}/${address}`)
                .then(res => res.json())
                .then(body => {
                    if (body['status'] === 'fail')
                        return resolve({ confirmed_balance: 0.00, unconfirmed_balance: 0.00 })
                    return resolve(body['data'])
                })
        } catch (error) {
            resolve({ confirmed_balance: 0.00, unconfirmed_balance: 0.00 })
        }

    })
}

var send_tx = async (options) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { private, public } = await get_keys(options['userId'])
            const transaction = {
                amount: options['amount'],
                from: public,
                to: options['to'],
            }
            const unit = dashcore.Unit;
            const dash_network = 'DASHTEST'
            const transactionAmount = unit.fromMilis(transaction.amount).toSatoshis();
            const minerFee = unit.fromMilis(0.00067).toSatoshis(); //cost of transaction in satoshis (minerfee)
            console.log(transactionAmount)
            request(`https://sochain.com/api/v2/get_tx_unspent/${dash_network}/${transaction.from}`)
                .then(res => res.json())
                .then(async body => {
                    if (body['status'] == 'success') {
                        if (body['data']['txs'].length == 0)
                            return reject(Error("You don't have enough Satoshis to cover the miner fee."));
                        const utxos = await UnspentOutputs(body['data']['txs'])
                        const balance = await calculate_total_balance(body['data']['txs'])
                        if (balance - transactionAmount > 0) {
                            try {
                                let dashcore_transaction = new dashcore.Transaction()
                                    .from(utxos)
                                    .to(transaction.to, parseInt(transactionAmount))
                                    .change(transaction.from)

                                dashcore_transaction = dashcore_transaction.fee(minerFee)
                                dashcore_transaction = dashcore_transaction.sign(private)
                                const tx = dashcore_transaction.serialize(true)
                                console.log(tx)
                                const tx_response = await broadcastTx(tx)
                                console.log(tx_response)
                                if (tx_response['status'] === 'success')
                                    return resolve({ success: true, txId: tx_response['data']['txid'] })
                                return reject(Error("You must have valid balance in your wallet"))
                            } catch (error) {
                                return reject(Error(error.message));
                            }
                        }
                        else {
                            return reject(Error("You don't have enough Satoshis to cover the miner fee."));
                        }

                    }
                    else {
                        return reject(Error("You don't have enough Satoshis to cover the miner fee."))
                    }

                })
        } catch (error) {
            reject(Error(error.message))
        }
    })
}

const calculate_total_balance = async (utxos) => {
    return new Promise((resolve) => {
        const unit = dashcore.Unit
        let balance = unit.fromSatoshis(0).toSatoshis();
        for (var i = 0; i < utxos.length; i++) {
            balance += unit.fromSatoshis(parseFloat(utxos[i]['value']) * 10000000).toSatoshis();
        }
        resolve(balance)
    })
}

const get_keys = async (userId) => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const user = await USERS.findOne({ _id: userId }).exec()
        const wallet = user['wallets']['DASH']
        const Xpub = system[0]['dash']['root']['Xpriv']
        var child = bip32.fromBase58(Xpub, networks.testnet);
        const addresspath = `${derivePath}/${wallet['accountIndex']}'/${wallet['chainIndex']}/${wallet['addressIndex']}`
        var account = child.derivePath(addresspath)
        var private = account.toWIF();
        resolve({ private, public: user['wallets']['DASH']['address'].split(':')[1] })
    })
}

const UnspentOutputs = async (utxos) => {
    return new Promise((resolve) => {
        var utxs = []
        for (let i = 0; i < utxos.length; i++) {
            utxs.push({
                txId: utxos[i]['txid'],
                outputIndex: utxos[i]['output_no'],
                script: utxos[i]['script_hex'],
                satoshis: parseInt(parseFloat(utxos[i]['value']) * 10000000),
            })
        }
        resolve(utxs)
    })
}

const broadcastTx = async (tx) => {
    return new Promise((resolve) => {
        request(`https://sochain.com/api/v2/send_tx/DASHTEST/`, {
            method: 'post',
            body: JSON.stringify({ tx_hex: tx }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => resolve(json))
    })
}

module.exports = {
    is_dash_address_generated,
    initialize_dash_wallet,
    generateAddress,
    get_dash_address,
    get_dash_balance,
    encrypt_wallet,
    decrypt_wallet,
    get_dash_wallet,
    send_tx
}
