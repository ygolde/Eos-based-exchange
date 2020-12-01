const Eth = require('ethjs');
const bip32 = require('bip32')
const bip39 = require('bip39')
const request = require('node-fetch');
const USERS = require('../models/User')
const SYSTEM = require('../models/system')
const Wallets = require('../models/wallets')
const { publicToAddress } = require('ethereumjs-util')
const { encodeDecode } = require('./encrypt')
const EthereumTx = require('ethereumjs-tx')
const Withdraws = require('../models/withdraws')
const etc_rpc = new Eth(new Eth.HttpProvider('https://www.ethercluster.com/kotti'));
const derivePath = `m/44'/61'`
var etc = {
    accountIndex: 0,
    chainIndex: 0,
    addressIndex: 1
}


function generate_address(publicKey) {
    const address = publicToAddress(publicKey, true)
    return '0x' + address.toString('hex')
}

const check_wallet_initialization = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const { load } = system[0]['etc']
        if (load)
            return resolve(true)
        return resolve(false)
    })
}

const encrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const etc_wallet = system[0]['etc'];
            if (etc_wallet['isSecure'])
                return resolve(true);
            system[0]['etc']['mnemonic'] = await encodeDecode(etc_wallet['mnemonic'], 'e');
            system[0]['etc']['root']['Xpub'] = await encodeDecode(etc_wallet['root']['Xpub'], 'e');
            system[0]['etc']['root']['Xpriv'] = await encodeDecode(etc_wallet['root']['Xpriv'], 'e');
            system[0]['etc']['account']['Xpub'] = await encodeDecode(etc_wallet['account']['Xpub'], 'e');
            system[0]['etc']['account']['Xpriv'] = await encodeDecode(etc_wallet['account']['Xpriv'], 'e');
            system[0]['etc']['bip32']['Xpriv'] = await encodeDecode(etc_wallet['bip32']['Xpriv'], 'e');
            system[0]['etc']['bip32']['Xpub'] = await encodeDecode(etc_wallet['bip32']['Xpub'], 'e');
            system[0]['etc']['isSecure'] = true
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
            const etc_wallet = system[0]['etc'];
            if (!etc_wallet['isSecure'])
                return resolve(true);
            system[0]['etc']['mnemonic'] = await encodeDecode(etc_wallet['mnemonic'], 'd');
            system[0]['etc']['root']['Xpub'] = await encodeDecode(etc_wallet['root']['Xpub'], 'd');
            system[0]['etc']['root']['Xpriv'] = await encodeDecode(etc_wallet['root']['Xpriv'], 'd');
            system[0]['etc']['account']['Xpub'] = await encodeDecode(etc_wallet['account']['Xpub'], 'd');
            system[0]['etc']['account']['Xpriv'] = await encodeDecode(etc_wallet['account']['Xpriv'], 'd');
            system[0]['etc']['bip32']['Xpriv'] = await encodeDecode(etc_wallet['bip32']['Xpriv'], 'd');
            system[0]['etc']['bip32']['Xpub'] = await encodeDecode(etc_wallet['bip32']['Xpub'], 'd');
            system[0]['etc']['isSecure'] = false
            await system[0].save()
            return resolve(true);
        } catch (error) {
            return resolve(false);
        }
    })
}

const get_etc_wallet = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find();
        const { load, isSecure, mnemonic, logo } = system[0]['etc'];
        return resolve({ load, logo, isSecure, mnemonic, type: 'ETC' })
    })
}

var initialize_etc_wallet = async (mnemonic) => {
    return new Promise(async (resolve, reject) => {
        try {
            const isLoaded = await check_wallet_initialization()
            if (isLoaded)
                return reject(Error('Wallet already loaded'))

            if (!bip39.validateMnemonic(mnemonic))
                return reject(Error('Invalid mnemonic'))
            const seed = bip39.mnemonicToSeedSync(mnemonic);

            const root = bip32.fromSeed(seed);
            const rootXPub = root.neutered().toBase58()
            const rootXPriv = root.toBase58(root.privateKey)

            console.log(rootXPub)
            console.log(rootXPriv)

            const accountpath = `${derivePath}/${etc.accountIndex}'`;
            const account = root.derivePath(accountpath);
            const accountXPub = account.neutered().toBase58();
            const accountXPriv = account.toBase58(account.privateKey)

            console.log(accountXPub)
            console.log(accountXPriv)

            const bip32path = `${derivePath}/${etc.accountIndex}'/${etc.chainIndex}`;
            const bip32Account = root.derivePath(bip32path);
            const bip32XPub = bip32Account.neutered().toBase58();
            const bip32XPriv = bip32Account.toBase58(bip32Account.privateKey)

            console.log(bip32XPub)
            console.log(bip32XPriv)

            var system = await SYSTEM.find()
            system[0]['etc']['mnemonic'] = mnemonic
            system[0]['etc']['load'] = true
            system[0]['etc']['account']['accountpath'] = accountpath

            system[0]['etc']['root']['Xpub'] = rootXPub
            system[0]['etc']['root']['Xpriv'] = rootXPriv

            system[0]['etc']['account']['Xpub'] = accountXPub
            system[0]['etc']['account']['Xpriv'] = accountXPriv

            system[0]['etc']['bip32']['bip32path'] = bip32path
            system[0]['etc']['bip32']['Xpub'] = bip32XPub
            system[0]['etc']['bip32']['Xpriv'] = bip32XPriv

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
            await decrypt_wallet()
            const system = await SYSTEM.find()
            const Xpub = system[0]['etc']['root']['Xpriv']
            var child = bip32.fromBase58(Xpub);
            const addresspath = `${derivePath}/${etc['accountIndex']}'/${etc['chainIndex']}/${etc['addressIndex']}`
            var account = child.derivePath(addresspath)
            console.log('0x' + account.publicKey.toString('hex'))
            console.log('0x' + account.privateKey.toString('hex'))
            const address = generate_address(account.publicKey)
            var user = await USERS.findOne({ _id: userId }).exec()
            user['wallets']['ETC']['address'] = `ethereum:${address}`
            user['wallets']['ETC']['accountIndex'] = etc.accountIndex
            user['wallets']['ETC']['chainIndex'] = etc.chainIndex
            user['wallets']['ETC']['addressIndex'] = etc.addressIndex
            await user.save()
            await Wallets.create({
                userId,
                name: 'ETC',
                coin: 61,
                accountIndex: etc.accountIndex,
                chainIndex: etc.chainIndex,
                addressIndex: etc.addressIndex
            })
            etc.addressIndex++
            await encrypt_wallet()
            return resolve(true)
        } catch (error) {
            console.log(error)
            return resolve(false)
        }
    })
}

var get_etc_address = async (userId) => {
    var user = await USERS.findOne({ _id: userId }).exec()
    const address = user['wallets']['ETC']['address']
    return address
}

var is_etc_address_generated = async (userId) => {
    return new Promise(async (resolve) => {
        var user = await USERS.findOne({ _id: userId }).exec()
        const address = user['wallets']['ETC']['address']
        if (address)
            return resolve(true)
        return resolve(false)
    })
}

var get_etc_balance = async (userId) => {
    return new Promise(async (resolve) => {
        const user = await USERS.findOne({ _id: userId }).exec()
        if (!user['wallets']['ETC']['address'])
            return resolve({ balance: 0.00 })
        const address = user['wallets']['ETC']['address'].split(':')[1]
        try {
            etc_rpc.getBalance(address, 'latest')
                .then(res => {
                    resolve({ balance: Eth.fromWei(res, 'ether') })
                }, err => {
                    resolve({ balance: 0.00 })
                })
        } catch (error) {
            resolve({ balance: 0.00 })
        }

    })
}

var send_tx = async (options) => {
    return new Promise(async (resolve, reject) => {
        try {
            await decrypt_wallet()
            const { private, public } = await get_keys(options['userId'])
            const transaction = {
                amount: options['amount'],
                from: public,
                to: options['to'],
            }
            const { balance } = await get_etc_balance(options['userId'])

            if (balance < options['amount']) {
                await encrypt_wallet()
                return reject(Error('Insufficient funds'));
            }
            const gasPrices = await getCurrentGasPrices()
            const nonce = await getTxCount(transaction.from)

            let txParams = {
                nonce: nonce,
                gasPrice: gasPrices.high * 1000000000,
                gasLimit: '0x2710',
                to: transaction.to,
                from: transaction.from,
                value: '0x' + Eth.toWei(transaction.amount, 'ether').toString('hex')
            }

            const estimatedGas = await estimateGas(txParams)
            txParams.gasLimit = estimatedGas
            const fee = Eth.fromWei((gasPrices.high * 1000000000) * estimatedGas.toString(10), 'ether')
            const tx = new EthereumTx(txParams, { 'chain': 'kotti' })
            const privateKey = private.split('0x')
            tx.sign(Buffer.from(privateKey[1], 'hex'))
            const serializedTransaction = tx.serialize()

            etc_rpc.sendRawTransaction('0x' + serializedTransaction.toString('hex'))
                .then(async res => {
                    await logWithdrawRequest({
                        userId: options['userId'],
                        currency: 'ETC',
                        amount: options['amount'],
                        fee: fee,
                        txId: res,
                        state: 'APPROVED',
                        destination: options['to'],
                        type: 'CRYPTO'
                    })
                    const url = `http://kotti.etccoopexplorer.com/tx/${res}/internal_transactions`;
                    await encrypt_wallet()
                    resolve({ success: true, message: url })
                })
                .catch(async err => {
                    await encrypt_wallet()
                    reject(err)
                })
        } catch (error) {
            // console.log(error)
            await encrypt_wallet()
            reject(error)
        }
    })
}

var get_keys = async (userId) => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const user = await USERS.findOne({ _id: userId }).exec()
        const wallet = user['wallets']['ETC']
        const Xpub = system[0]['etc']['root']['Xpriv']
        var child = bip32.fromBase58(Xpub);
        const addresspath = `${derivePath}/${wallet['accountIndex']}'/${wallet['chainIndex']}/${wallet['addressIndex']}`
        var account = child.derivePath(addresspath)
        resolve({ private: '0x' + account.privateKey.toString('hex'), public: user['wallets']['ETC']['address'].split(':')[1] })
    })
}

var getTxCount = async (address) => {
    return new Promise(resolve => {
        etc_rpc.getTransactionCount(address, 'latest')
            .then(res => {
                resolve('0x' + res.toString('hex'))
            })
    })
}

var getCurrentGasPrices = async () => {
    return new Promise(resolve => {
        request('https://ethgasstation.info/json/ethgasAPI.json')
            .then(res => res.json())
            .then(json => {
                let prices = {
                    low: json.safeLow / 10,
                    medium: json.average / 10,
                    high: json.fast / 10
                };
                return resolve(prices);
            })
    })
}

var estimateGas = (tx) => {
    return new Promise(resolve => {
        const { from, to } = tx
        etc_rpc.estimateGas({ from, to })
            .then(res => {
                resolve('0x' + res.toString('hex'))
            })
    })
}

var getEstimatedNetworkFees = async () => {
    return new Promise(async (resolve) => {
        try {
            const gasPrices = await getCurrentGasPrices()
            const estimatedGas = await estimateGas({ from: '0xc49926c4124cee1cba0ea94ea31a6c12318df947' })
            const fee = Ethjs.fromWei((gasPrices.high * 1000000000) * estimatedGas.toString(10), 'ether')
            resolve({ success: true, fee })
        } catch (error) {
            resolve({ success: false, message: 'Please contact our support team for network fee' })
        }
    })
}

var logWithdrawRequest = async (data) => {
    return new Promise(async resolve => {
        await Withdraws.create(data)
        resolve()
    })
}

module.exports = {
    is_etc_address_generated,
    initialize_etc_wallet,
    generateAddress,
    get_etc_address,
    get_etc_balance,
    encrypt_wallet,
    decrypt_wallet,
    get_etc_wallet,
    send_tx
}
