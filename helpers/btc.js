const request = require('node-fetch')
const USERS = require('../models/User')
const SYSTEM = require('../models/system')
const Wallets = require('../models/wallets')
const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcoin = require('bitcoinjs-lib')
const bitcore = require('bitcore-lib')
const derivepath = "m/44'/1'"
const { encodeDecode } = require('./encrypt')
const network = bitcoin.networks.testnet

var btc = {
    accountIndex: 0,
    chainIndex: 0,
    addressIndex: 1
}

// Segwit(bech32)  => prefix = bc1 => p2wsh
// Segwit          => prefix = 3  => p2sh
// Lagacy          => prefix = 1  => p2pkh


function generate_address(node, network, type = 'segwit') {

    switch (type) {
        case 'segwit':
            const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network })
            const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network })
            return p2sh.address
        case 'segwit_bech32':
            const _p2wpkh = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network })
            const p2wsh = bitcoin.payments.p2wsh({ redeem: _p2wpkh, network })
            return p2wsh.address

        case 'lagacy':
            return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address;
    }
}

const check_wallet_initialization = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const { load } = system[0]['btc']
        if (load)
            return resolve(true)
        return resolve(false)
    })
}

const encrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const btc_wallet = system[0]['btc'];
            if (btc_wallet['isSecure'])
                return resolve(true);
            system[0]['btc']['mnemonic'] = await encodeDecode(btc_wallet['mnemonic'], 'e');
            system[0]['btc']['root']['Xpub'] = await encodeDecode(btc_wallet['root']['Xpub'], 'e');
            system[0]['btc']['root']['Xpriv'] = await encodeDecode(btc_wallet['root']['Xpriv'], 'e');
            system[0]['btc']['account']['Xpub'] = await encodeDecode(btc_wallet['account']['Xpub'], 'e');
            system[0]['btc']['account']['Xpriv'] = await encodeDecode(btc_wallet['account']['Xpriv'], 'e');
            system[0]['btc']['change']['Xpub'] = await encodeDecode(btc_wallet['change']['Xpub'], 'e');
            system[0]['btc']['change']['Xpriv'] = await encodeDecode(btc_wallet['change']['Xpriv'], 'e');
            system[0]['btc']['isSecure'] = true
            await system[0].save()
            return resolve(true);
        } catch (error) {
            return resolve(false);
        }
    })
}

const decrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const btc_wallet = system[0]['btc'];
            if (!btc_wallet['isSecure'])
                return resolve(true);
            system[0]['btc']['mnemonic'] = await encodeDecode(btc_wallet['mnemonic'], 'd');
            system[0]['btc']['root']['Xpub'] = await encodeDecode(btc_wallet['root']['Xpub'], 'd');
            system[0]['btc']['root']['Xpriv'] = await encodeDecode(btc_wallet['root']['Xpriv'], 'd');
            system[0]['btc']['account']['Xpub'] = await encodeDecode(btc_wallet['account']['Xpub'], 'd');
            system[0]['btc']['account']['Xpriv'] = await encodeDecode(btc_wallet['account']['Xpriv'], 'd');
            system[0]['btc']['change']['Xpub'] = await encodeDecode(btc_wallet['change']['Xpub'], 'd');
            system[0]['btc']['change']['Xpriv'] = await encodeDecode(btc_wallet['change']['Xpriv'], 'd');
            system[0]['btc']['isSecure'] = false
            await system[0].save()
            return resolve(true);
        } catch (error) {
            return resolve(false);
        }
    })
}

const get_btc_wallet = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find();
        const { load, isSecure, mnemonic, logo } = system[0]['btc'];
        return resolve({ load, logo, isSecure, mnemonic, type: 'BTC' })
    })
}

var initialize_btc_wallet = async (mnemonic) => {
    return new Promise(async (resolve, reject) => {
        try {
            const isLoaded = await check_wallet_initialization()
            if (isLoaded)
                return reject(Error('Wallet already loaded'))

            if (!bip39.validateMnemonic(mnemonic))
                return reject(Error('Invalid mnemonic'))
            const seed = bip39.mnemonicToSeedSync(mnemonic);

            const root = bip32.fromSeed(seed, network);
            const rootXPub = root.neutered().toBase58()
            const rootXPriv = root.toBase58(root.privateKey)

            const accountpath = `${derivepath}/${btc.accountIndex}'`;
            const account = root.derivePath(accountpath);
            const accountXPub = account.neutered().toBase58();
            const accountXPriv = account.toBase58(account.privateKey)

            const changepath = `${derivepath}/0'/${btc.chainIndex}`
            const changeaccount = root.derivePath(changepath);
            const changeXPub = changeaccount.neutered().toBase58()
            const changeXPriv = changeaccount.toBase58(changeaccount.privatekey)

            var system = await SYSTEM.find()
            system[0]['btc']['mnemonic'] = mnemonic
            system[0]['btc']['load'] = true
            system[0]['btc']['account']['accountpath'] = accountpath

            system[0]['btc']['root']['Xpub'] = rootXPub
            system[0]['btc']['root']['Xpriv'] = rootXPriv

            system[0]['btc']['account']['Xpub'] = accountXPub
            system[0]['btc']['account']['Xpriv'] = accountXPriv

            system[0]['btc']['change']['accountpath'] = changepath
            system[0]['btc']['change']['Xpub'] = changeXPub
            system[0]['btc']['change']['Xpriv'] = changeXPriv

            await system[0].save()
            resolve()
        } catch (error) {
            reject(Error(error.meesage))
        }
    })
}

var generateAddress = async (userId) => {
    return new Promise(async (resolve) => {
        try {
            await decrypt_wallet()
            const system = await SYSTEM.find()

            const Xpub = system[0]['btc']['root']['Xpriv']
            var child = bip32.fromBase58(Xpub, network);
            const addresspath = `${derivepath}/${btc['accountIndex']}'/${btc['chainIndex']}/${btc['addressIndex']}`
            var account = child.derivePath(addresspath)
            const address = generate_address(account, network, 'lagacy')
            var user = await USERS.findOne({ _id: userId }).exec()
            user['wallets']['BTC']['address'] = `bitcoin:${address}`
            user['wallets']['BTC']['accountIndex'] = btc.accountIndex
            user['wallets']['BTC']['chainIndex'] = btc.chainIndex
            user['wallets']['BTC']['addressIndex'] = btc.addressIndex
            user['wallets']['BTC']['type'] = 'lagacy'
            await user.save()
            await Wallets.create({
                userId,
                name: 'BTC',
                coin: 0,
                accountIndex: btc.accountIndex,
                chainIndex: btc.chainIndex,
                addressIndex: btc.addressIndex
            })
            btc.addressIndex++
            await encrypt_wallet()
            return resolve(true)
        } catch (error) {
            return resolve(false)
        }
    })
}

var get_btc_address = async (userId) => {
    var user = await USERS.findOne({ _id: userId }).exec()
    const address = user['wallets']['BTC']['address']
    return address 
}

var is_btc_address_generated = async (userId) => {
    return new Promise(async (resolve) => {
        var user = await USERS.findOne({ _id: userId }).exec()
        const address = user['wallets']['BTC']['address']
        if (address)
            return resolve(true)
        return resolve(false)
    })
}

var get_btc_balance = async (userId) => {
    return new Promise(async (resolve) => {
        const user = await USERS.findOne({ _id: userId }).exec()
        if (!user['wallets']['BTC']['address'])
            return resolve({ confirmed_balance: 0.00, unconfirmed_balance: 0.00 })
        const address = user['wallets']['BTC']['address'].split(':')[1]
        const btc_network = 'BTCTEST'
        try {
            request(`https://sochain.com/api/v2/get_address_balance/${btc_network}/${address}`)
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
                type: 'fastest'
            }
            console.log(transaction)
            const unit = bitcore.Unit;
            const btc_network = 'BTCTEST'
            const minerFee = unit.fromMilis(0.00561).toSatoshis(); //cost of transaction in satoshis (minerfee)
            const transactionAmount = unit.fromMilis(transaction.amount).toSatoshis();

            request(`https://sochain.com/api/v2/get_tx_unspent/${btc_network}/${transaction.from}`)
                .then(res => res.json())
                .then(async body => {
                    if (body['status'] == 'success') {
                        if (body['data']['txs'].length == 0)
                            return reject("You don't have enough Satoshis to cover the miner fee.");
                        const utxos = await UnspentOutputs(body['data']['txs'])
                        const balance = await calculate_total_balance(body['data']['txs'])

                        if (balance - transactionAmount - minerFee > 0) {
                            try {
                                let bitcore_transaction = new bitcore.Transaction()
                                    .from(utxos)
                                    .to(transaction.to, parseInt(transactionAmount))
                                    .fee(minerFee)
                                    .change(transaction.from)
                                    .sign(private)
                                const tx = bitcore_transaction.serialize({ disableDustOutputs: true })
                                const tx_response = await broadcastTx(tx)
                                if (tx_response['status'] === 'success')
                                    return resolve({ success: true, txId: tx_response['data']['txid'] })
                            } catch (error) {
                                return reject(error.message);
                            }
                        }
                        else {
                            return reject("You don't have enough Satoshis to cover the miner fee.");
                        }

                    }
                    else {
                        return reject("You don't have enough Satoshis to cover the miner fee.")
                    }

                })
        } catch (error) {
            reject(error.message)
        }
    })
}

const calculate_total_balance = async (utxos) => {
    return new Promise((resolve) => {
        const unit = bitcore.Unit
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
        const wallet = user['wallets']['BTC']
        const Xpub = system[0]['btc']['root']['Xpriv']
        console.log(Xpub)
        var child = bip32.fromBase58(Xpub, network);
        const addresspath = `${derivepath}/${wallet['accountIndex']}'/${wallet['chainIndex']}/${wallet['addressIndex']}`
        var account = child.derivePath(addresspath)
        resolve({ private: account.toWIF(), public: user['wallets']['BTC']['address'].split(':')[1] })
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
        request(`https://sochain.com/api/v2/send_tx/BTCTEST/`, {
            method: 'post',
            body: JSON.stringify({ tx_hex: tx }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => resolve(json));
    })
}

module.exports = {
    is_btc_address_generated,
    initialize_btc_wallet,
    generateAddress,
    get_btc_address,
    get_btc_balance,
    encrypt_wallet,
    get_btc_wallet,
    decrypt_wallet,
    send_tx,
}
