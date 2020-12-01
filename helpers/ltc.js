const request = require('node-fetch')
const USERS = require('../models/User')
const SYSTEM = require('../models/system')
const Wallets = require('../models/wallets')
const bip32 = require('bip32')
const bip39 = require('bip39')
const bitcoin = require('bitcoinjs-lib')
const litecoin = require('litecore-lib')
const { encodeDecode } = require('./encrypt')
litecoin.Networks.testnet
const derivePath = `m/44'/2'`
var ltc = {
    accountIndex: 0,
    chainIndex: 0,
    addressIndex: 0
}

const ltc_network = 'LTCTEST'

var networks = {
    litecoinXprv: {
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4,
        },
        pubKeyHash: 0x30,
        scriptHash: 0x32,
        wif: 0xb0
    },
    litecointestnet: {
        messagePrefix: '\x18Litecoin Signed Message:\n',
        bip32: {
            public: 0x043587cf,
            private: 0x04358394,
        },
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef,
    },
    litecoin_p2wpkh: {
        baseNetwork: "litecoin",
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bech32: 'ltc',
        bip32: {
            public: 0x04b24746,
            private: 0x04b2430c
        },
        pubKeyHash: 0x30,
        scriptHash: 0x32,
        wif: 0xb0
    },
    litecoin_p2wpkhInP2sh: {
        baseNetwork: "litecoin",
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bech32: 'ltc',
        bip32: {
            public: 0x01b26ef6,
            private: 0x01b26792
        },
        pubKeyHash: 0x30,
        scriptHash: 0x32,
        wif: 0xb0
    },
    litecointestnet_p2wpkh: {
        baseNetwork: "litecointestnet",
        messagePrefix: '\x18Litecoin Signed Message:\n',
        bech32: 'litecointestnet',
        bip32: {
            public: 0x043587cf,
            private: 0x04358394
        },
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef
    },
    litecointestnet_p2wpkhInP2sh: {
        baseNetwork: "litecointestnet",
        messagePrefix: '\x18Litecoin Signed Message:\n',
        bech32: 'litecointestnet',
        bip32: {
            public: 0x043587cf,
            private: 0x04358394
        },
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        wif: 0xef
    }
}

// Segwit          => prefix = M  => p2sh
// Segwit(bech32)  => prefix = ltc1 => p2wsh
// Lagacy          => prefix = L  => p2pkh
// mainnet depricated          => prefix = 3  => p2sh
// mainnet          => prefix = M  => p2sh
// testnet depricated          => prefix = 2  => p2sh
// testnet          => prefix = Q  => p2sh

function generate_address(node, network, type = 'segwit') {
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network })
    const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network })

    switch (type) {
        case 'segwit':
            return p2sh.address

        case 'segwit_bech32':
            const p2wsh = bitcoin.payments.p2wsh({ redeem: p2wpkh, network })
            return p2wsh.address

        case 'lagacy':
            return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network }).address;

        case 'mainnet_dep':
            return bitcoin.address.toBase58Check(bitcoin.address.fromBase58Check(p2sh.address)['hash'], 5)

        case 'mainnet':
            return bitcoin.address.toBase58Check(bitcoin.address.fromBase58Check(p2sh.address)['hash'], 50)

        case 'testnet_dep':
            return bitcoin.address.toBase58Check(bitcoin.address.fromBase58Check(p2sh.address)['hash'], 196)

        case 'testnet':

            return bitcoin.address.toBase58Check(bitcoin.address.fromBase58Check(p2sh.address)['hash'], 58)
    }
}

const check_wallet_initialization = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const { load } = system[0]['ltc']
        if (load)
            return resolve(true)
        return resolve(false)
    })
}

const encrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const ltc_wallet = system[0]['ltc'];
            if (ltc_wallet['isSecure'])
                return resolve(true);
            system[0]['ltc']['mnemonic'] = await encodeDecode(ltc_wallet['mnemonic'], 'e');
            system[0]['ltc']['root']['Xpub'] = await encodeDecode(ltc_wallet['root']['Xpub'], 'e');
            system[0]['ltc']['root']['Xpriv'] = await encodeDecode(ltc_wallet['root']['Xpriv'], 'e');
            system[0]['ltc']['account']['Xpub'] = await encodeDecode(ltc_wallet['account']['Xpub'], 'e');
            system[0]['ltc']['account']['Xpriv'] = await encodeDecode(ltc_wallet['account']['Xpriv'], 'e');
            system[0]['ltc']['bip32']['Xpriv'] = await encodeDecode(ltc_wallet['bip32']['Xpriv'], 'e');
            system[0]['ltc']['bip32']['Xpub'] = await encodeDecode(ltc_wallet['bip32']['Xpub'], 'e');
            system[0]['ltc']['isSecure'] = true
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
            const ltc_wallet = system[0]['ltc'];
            if (!ltc_wallet['isSecure'])
                return resolve(true);
            system[0]['ltc']['mnemonic'] = await encodeDecode(ltc_wallet['mnemonic'], 'd');
            system[0]['ltc']['root']['Xpub'] = await encodeDecode(ltc_wallet['root']['Xpub'], 'd');
            system[0]['ltc']['root']['Xpriv'] = await encodeDecode(ltc_wallet['root']['Xpriv'], 'd');
            system[0]['ltc']['account']['Xpub'] = await encodeDecode(ltc_wallet['account']['Xpub'], 'd');
            system[0]['ltc']['account']['Xpriv'] = await encodeDecode(ltc_wallet['account']['Xpriv'], 'd');
            system[0]['ltc']['bip32']['Xpriv'] = await encodeDecode(ltc_wallet['bip32']['Xpriv'], 'd');
            system[0]['ltc']['bip32']['Xpub'] = await encodeDecode(ltc_wallet['bip32']['Xpub'], 'd');
            system[0]['ltc']['isSecure'] = false
            await system[0].save()
            return resolve(true);
        } catch (error) {
            return resolve(false);
        }
    })
}

const get_ltc_wallet = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find();
        const { load, isSecure, mnemonic, logo } = system[0]['ltc'];
        return resolve({ load, logo, isSecure, mnemonic, type: 'LTC' })
    })
}

var initialize_ltc_wallet = async (mnemonic) => {
    return new Promise(async (resolve, reject) => {
        try {
            const isLoaded = await check_wallet_initialization()
            if (isLoaded)
                return reject(Error('Wallet already loaded'))

            if (!bip39.validateMnemonic(mnemonic))
                return reject(Error('Invalid mnemonic'))
            const seed = bip39.mnemonicToSeedSync(mnemonic);

            const root = bip32.fromSeed(seed, networks.litecointestnet);
            const rootXPub = root.neutered().toBase58()
            const rootXPriv = root.toBase58(root.privateKey)

            const accountpath = `${derivePath}/${ltc.accountIndex}'`;
            const account = root.derivePath(accountpath);
            const accountXPub = account.neutered().toBase58();
            const accountXPriv = account.toBase58(account.privateKey)

            const bip32path = `${derivePath}/${ltc.accountIndex}'/${ltc.chainIndex}`;
            const bip32Account = root.derivePath(bip32path);
            const bip32XPub = bip32Account.neutered().toBase58();
            const bip32XPriv = bip32Account.toBase58(bip32Account.privateKey)


            var system = await SYSTEM.find()
            system[0]['ltc']['mnemonic'] = mnemonic
            system[0]['ltc']['load'] = true
            system[0]['ltc']['account']['accountpath'] = accountpath

            system[0]['ltc']['root']['Xpub'] = rootXPub
            system[0]['ltc']['root']['Xpriv'] = rootXPriv

            system[0]['ltc']['account']['Xpub'] = accountXPub
            system[0]['ltc']['account']['Xpriv'] = accountXPriv

            system[0]['ltc']['bip32']['bip32path'] = bip32path
            system[0]['ltc']['bip32']['Xpub'] = bip32XPub
            system[0]['ltc']['bip32']['Xpriv'] = bip32XPriv

            await system[0].save()
            resolve()
        } catch (error) {
            console.log(error)
            reject(Error(error.meesage))
        }
    })
}

var generateAddress = async (userId) => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find()
            const Xpub = system[0]['ltc']['root']['Xpriv']
            var child = bip32.fromBase58(Xpub, networks.litecointestnet);
            const addresspath = `${derivePath}/${ltc['accountIndex']}'/${ltc['chainIndex']}/${ltc['addressIndex']}`
            var account = child.derivePath(addresspath)
            const address = generate_address(account, networks.litecointestnet, 'lagacy')
            var user = await USERS.findOne({ _id: userId }).exec()
            user['wallets']['LTC']['address'] = `litecoin:${address}`
            user['wallets']['LTC']['accountIndex'] = ltc.accountIndex
            user['wallets']['LTC']['chainIndex'] = ltc.chainIndex
            user['wallets']['LTC']['addressIndex'] = ltc.addressIndex
            await user.save()
            await Wallets.create({
                userId,
                name: 'LTC',
                coin: 2,
                accountIndex: ltc.accountIndex,
                chainIndex: ltc.chainIndex,
                addressIndex: ltc.addressIndex
            })
            ltc.addressIndex++
            return resolve(true)
        } catch (error) {
            console.log(error)
            return resolve(false)
        }
    })
}

var get_ltc_address = async (userId) => {
    var user = await USERS.findOne({ _id: userId }).exec()
    const address = user['wallets']['LTC']['address']
    return address
}

var is_ltc_address_generated = async (userId) => {
    return new Promise(async (resolve) => {
        var user = await USERS.findOne({ _id: userId }).exec()
        const address = user['wallets']['LTC']['address']
        if (address)
            return resolve(true)
        return resolve(false)
    })
}

var get_ltc_balance = async (userId) => {
    return new Promise(async (resolve) => {
        const user = await USERS.findOne({ _id: userId }).exec()
        if (!user['wallets']['LTC']['address'])
            return resolve({ confirmed_balance: 0.00, unconfirmed_balance: 0.00 })
        const address = user['wallets']['LTC']['address'].split(':')[1]
        const ltc_network = 'LTCTEST'
        try {
            request(`https://sochain.com/api/v2/get_address_balance/${ltc_network}/${address}`)
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
            const unit = litecoin.Unit;
            const transactionAmount = unit.fromMilis(transaction.amount).toSatoshis();
            const minerFee = unit.fromMilis(0.00669).toSatoshis(); //cost of transaction in satoshis (minerfee)

            request(`https://sochain.com/api/v2/get_tx_unspent/${ltc_network}/${transaction.from}`)
                .then(res => res.json())
                .then(async body => {
                    console.log(body)
                    if (body['status'] == 'success') {
                        if (body['data']['txs'].length == 0)
                            return reject(Error("You don't have enough Satoshis to cover the miner fee."));
                        const utxos = await UnspentOutputs(body['data']['txs'])
                        const balance = await calculate_total_balance(body['data']['txs'])

                        if (balance - transactionAmount > 0) {

                            try {

                                let litecoin_transaction = new litecoin.Transaction()
                                    .from(utxos)
                                    .to(transaction.to, parseInt(transactionAmount))
                                    .change(transaction.from)
                                litecoin_transaction = litecoin_transaction.fee(litecoin_transaction.getFee())
                                litecoin_transaction = litecoin_transaction.sign(private)
                                const tx = litecoin_transaction.serialize({ disableMoreOutputThanInput:true})
                                console.log(tx)
                                const tx_response = await broadcastTx(tx)
                                console.log(tx_response)
                                if (tx_response['status'] === 'success')
                                    return resolve({ success: true, txId: tx_response['data']['txid'] })
                                return reject(Error("You must have valid balance in your wallet"))

                            } catch (error) {
                                console.log(error.message)
                                if (error.message.includes('Fee is too small'))
                                    return reject(Error('You don\'t have enough balance to cover miner fee'))
                                return reject(Error(error.message));
                            }
                        }

                        else {
                            return reject(Error("You don't have enough balance to cover the miner fee."));
                        }

                    }
                    else {
                        return reject(Error("You don't have enough balance to cover the miner fee."))
                    }

                }).catch(err => {
                    console.log(err)
                    return reject(Error('Please check your internet connection'))
                })
        } catch (error) {
            console.log(error)
            return reject(error)
        }
    })
}

const calculate_total_balance = async (utxos) => {
    return new Promise((resolve) => {
        const unit = litecoin.Unit
        let balance = unit.fromSatoshis(0).toSatoshis();
        for (var i = 0; i < utxos.length; i++) {
            balance += unit.fromSatoshis(parseFloat(utxos[i]['value']) * 10000000).toSatoshis();
        }
        resolve(balance)
    })
}

const get_keys = async (userId) => {
    return new Promise(async (resolve, reject) => {
        const system = await SYSTEM.find()
        const user = await USERS.findOne({ _id: userId }).exec()
        if (!user['wallets']['LTC']['address'])
            return reject('Please generate wallet address')
        const wallet = user['wallets']['LTC']
        const Xpub = system[0]['ltc']['root']['Xpriv']
        var child = bip32.fromBase58(Xpub, networks.litecointestnet);
        const addresspath = `${derivePath}/${wallet['accountIndex']}'/${wallet['chainIndex']}/${wallet['addressIndex']}`
        var account = child.derivePath(addresspath)
        var privateKey = new litecoin.PrivateKey(account.toWIF());
        resolve({ private: privateKey, public: user['wallets']['LTC']['address'].split(':')[1] })
    })
}

const UnspentOutputs = async (utxos) => {
    return new Promise((resolve) => {
        var utxs = []
        for (let i = 0; i < utxos.length; i++) {
            utxs.push({
                address: utxos[i]['address'],
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
        request(`https://sochain.com/api/v2/send_tx/${ltc_network}/`, {
            method: 'post',
            body: JSON.stringify({ tx_hex: tx }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => resolve(json));
    })
}


module.exports = {
    is_ltc_address_generated,
    initialize_ltc_wallet,
    generateAddress,
    get_ltc_address,
    get_ltc_balance,
    encrypt_wallet,
    decrypt_wallet,
    get_ltc_wallet,
    send_tx
}
