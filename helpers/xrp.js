const xrp_keypair = require('ripple-keypairs')
const xrp_address_utils = require('ripple-address-codec')
const { XrplNetwork, Wallet, XrpClient, TransactionStatus} = require("xpring-js");
const USERS = require('../models/User')
const SYSTEM = require('../models/system')
const Wallets = require('../models/wallets')
const bip32 = require('bip32')
const bip39 = require('bip39')
const bigInt = require('bignumber.js')
const { encodeDecode } = require('./encrypt')

const grpcURL = "test.xrp.xpring.io:50051";
const xrpClient = new XrpClient(grpcURL, XrplNetwork.Test)

const derivePath = `m/44'/144'`
var xrp = {
    accountIndex: 0,
    chainIndex: 0,
    addressIndex: 0
}


//salmanbao$xpring.money
//ssbaVEyJvK2tf2JoNFjMD3G81QEDb
//TVp9MDMF9vkd9LapJbHoArMz61Uvwqfip2wDwaD7axd4ush
//rU4qCE3tM3zbeQhrv1qPxryJ2Z65gFXxaU


function generate_address(publicKey, tag) {
    const address = xrp_keypair.deriveAddress(publicKey)
    const Xaddress = xrp_address_utils.classicAddressToXAddress(address, tag, true)
    return { address, Xaddress }
}

const check_wallet_initialization = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const { load } = system[0]['xrp']
        if (load)
            return resolve(true)
        return resolve(false)
    })
}

const encrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const xrp_wallet = system[0]['xrp'];
            if (xrp_wallet['isSecure'])
                return resolve(true);
            system[0]['xrp']['mnemonic'] = await encodeDecode(xrp_wallet['mnemonic'], 'e');
            system[0]['xrp']['root']['Xpub'] = await encodeDecode(xrp_wallet['root']['Xpub'], 'e');
            system[0]['xrp']['root']['Xpriv'] = await encodeDecode(xrp_wallet['root']['Xpriv'], 'e');
            system[0]['xrp']['account']['Xpub'] = await encodeDecode(xrp_wallet['account']['Xpub'], 'e');
            system[0]['xrp']['account']['Xpriv'] = await encodeDecode(xrp_wallet['account']['Xpriv'], 'e');
            system[0]['xrp']['bip32']['Xpriv'] = await encodeDecode(xrp_wallet['bip32']['Xpriv'], 'e');
            system[0]['xrp']['bip32']['Xpub'] = await encodeDecode(xrp_wallet['bip32']['Xpub'], 'e');
            system[0]['xrp']['isSecure'] = true
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
            const xrp_wallet = system[0]['xrp'];
            if (!xrp_wallet['isSecure'])
                return resolve(true);
            system[0]['xrp']['mnemonic'] = await encodeDecode(xrp_wallet['mnemonic'], 'd');
            system[0]['xrp']['root']['Xpub'] = await encodeDecode(xrp_wallet['root']['Xpub'], 'd');
            system[0]['xrp']['root']['Xpriv'] = await encodeDecode(xrp_wallet['root']['Xpriv'], 'd');
            system[0]['xrp']['account']['Xpub'] = await encodeDecode(xrp_wallet['account']['Xpub'], 'd');
            system[0]['xrp']['account']['Xpriv'] = await encodeDecode(xrp_wallet['account']['Xpriv'], 'd');
            system[0]['xrp']['bip32']['Xpriv'] = await encodeDecode(xrp_wallet['bip32']['Xpriv'], 'd');
            system[0]['xrp']['bip32']['Xpub'] = await encodeDecode(xrp_wallet['bip32']['Xpub'], 'd');
            system[0]['xrp']['isSecure'] = false
            await system[0].save()
            return resolve(true);
        } catch (error) {
            return resolve(false);
        }
    })
}

const get_xrp_wallet = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find();
        const { load, isSecure, mnemonic, logo } = system[0]['xrp'];
        return resolve({ load, logo, isSecure, mnemonic, type: 'XRP' })
    })
}

var initialize_xrp_wallet = async (mnemonic) => {
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

            const accountpath = `${derivePath}/${xrp.accountIndex}'`;
            const account = root.derivePath(accountpath);
            const accountXPub = account.neutered().toBase58();
            const accountXPriv = account.toBase58(account.privateKey)

            console.log(accountXPub)
            console.log(accountXPriv)

            const bip32path = `${derivePath}/${xrp.accountIndex}'/${xrp.chainIndex}`;
            const bip32Account = root.derivePath(bip32path);
            const bip32XPub = bip32Account.neutered().toBase58();
            const bip32XPriv = bip32Account.toBase58(bip32Account.privateKey)

            console.log(bip32XPub)
            console.log(bip32XPriv)

            var system = await SYSTEM.find()
            system[0]['xrp']['mnemonic'] = mnemonic
            system[0]['xrp']['load'] = true
            system[0]['xrp']['account']['accountpath'] = accountpath

            system[0]['xrp']['root']['Xpub'] = rootXPub
            system[0]['xrp']['root']['Xpriv'] = rootXPriv

            system[0]['xrp']['account']['Xpub'] = accountXPub
            system[0]['xrp']['account']['Xpriv'] = accountXPriv

            system[0]['xrp']['bip32']['bip32path'] = bip32path
            system[0]['xrp']['bip32']['Xpub'] = bip32XPub
            system[0]['xrp']['bip32']['Xpriv'] = bip32XPriv

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
            var user = await USERS.findOne({ _id: userId }).exec()
            const Xpub = system[0]['xrp']['root']['Xpriv']
            var child = bip32.fromBase58(Xpub);
            const addresspath = `${derivePath}/${xrp['accountIndex']}'/${xrp['chainIndex']}/${xrp['addressIndex']}`
            var account = child.derivePath(addresspath)
            // console.log(account.publicKey.toString('hex'))
            // console.log(account.privateKey.toString('hex'))
            const { address, Xaddress } = generate_address(account.publicKey.toString('hex'), user['wallets']['XRP']['tag'])
            user['wallets']['XRP']['address'] = `ripple:${address}`
            user['wallets']['XRP']['Xaddress'] = `ripple:${Xaddress}`
            user['wallets']['XRP']['accountIndex'] = xrp.accountIndex
            user['wallets']['XRP']['chainIndex'] = xrp.chainIndex
            user['wallets']['XRP']['addressIndex'] = xrp.addressIndex
            await user.save()
            await Wallets.create({
                userId,
                name: 'XRP',
                coin: 5,
                accountIndex: xrp.accountIndex,
                chainIndex: xrp.chainIndex,
                addressIndex: xrp.addressIndex
            })
            xrp.addressIndex++
            await encrypt_wallet()
            return resolve(true)
        } catch (error) {
            console.log(error)
            return resolve(false)
        }
    })
}

var get_xrp_address = async (userId) => {
    var user = await USERS.findOne({ _id: userId }).exec()
    const address = user['wallets']['XRP']['address']
    const Xaddress = user['wallets']['XRP']['Xaddress']
    return { address, Xaddress }
}

var is_xrp_address_generated = async (userId) => {
    return new Promise(async (resolve) => {
        var user = await USERS.findOne({ _id: userId }).exec()
        const address = user['wallets']['XRP']['address']
        if (address)
            return resolve(true)
        return resolve(false)
    })
}

var get_xrp_balance = async (userId) => {
    return new Promise(async (resolve) => {
        const user = await USERS.findOne({ _id: userId }).exec()
        if (!user['wallets']['XRP']['Xaddress'])
            return resolve({ balance: 0.00 })
        const address = user['wallets']['XRP']['Xaddress'].split(':')[1]
        try {
            const balance = await xrpClient.getBalance(address)
            if (balance['value'] > 0)
                return resolve({ balance: balance['value'] / 1000000 })
            return resolve({ balance: 0.00 })
        } catch (error) {
            resolve({ balance: 0.00 })
        }

    })
}

function statusCodeToString(status) {
    switch (status) {
        case TransactionStatus.Succeeded:
            return "SUCCEEDED"
        case TransactionStatus.Failed:
            return "FAILED"
        case TransactionStatus.Pending:
            return "PENDING"
        case TransactionStatus.Unknown:
        default:
            return "UNKNOWN"
    }
}

var send_tx = async (options) => {
    return new Promise(async (resolve, reject) => {
        try {
            await decrypt_wallet()
            const { publicKey, privateKey } = await get_keys(options['userId'])
            const xrpWallet = new Wallet(publicKey, privateKey, true)
            let amount = new bigInt(options['amount'])
            amount = amount.times(100000).toString()
            const transaction = {
                amount,
                to: xrp_address_utils.classicAddressToXAddress(options['to'], false, true),
            }
            const transactionHash = await xrpClient.send(transaction.amount, transaction.to, xrpWallet);
            const transactionStatus = await xrpClient.getPaymentStatus(transactionHash)
            await encrypt_wallet()
            if (transactionStatus === 0)
                return resolve({ success: false, status: statusCodeToString(transactionStatus), message: 'Transaction faild,please try again' })
            if (transactionStatus === 1)
                return resolve({ success: true, status: statusCodeToString(transactionStatus), txId: transactionHash })
            if (transactionStatus === 2)
                return resolve({ success: true, status: statusCodeToString(transactionStatus), txId: transactionHash })
        } catch (error) {
            await encrypt_wallet()
            console.log(error)
            return reject(error)
        }
    })
}

const get_keys = async (userId) => {
    return new Promise(async (resolve, reject) => {
        const system = await SYSTEM.find()
        const user = await USERS.findOne({ _id: userId }).exec()
        if (!user['wallets']['XRP']['address'])
            return reject('Please generate wallet address')
        const wallet = user['wallets']['XRP']
        const Xpub = system[0]['xrp']['root']['Xpriv']
        var child = bip32.fromBase58(Xpub);
        const addresspath = `${derivePath}/${wallet['accountIndex']}'/${wallet['chainIndex']}/${wallet['addressIndex']}`
        var account = child.derivePath(addresspath)
        resolve({ privateKey: account.privateKey.toString('hex'), publicKey: account.publicKey.toString('hex') })
    })
}


module.exports = {
    is_xrp_address_generated,
    initialize_xrp_wallet,
    generateAddress,
    get_xrp_address,
    get_xrp_balance,
    encrypt_wallet,
    decrypt_wallet,
    get_xrp_wallet,
    send_tx
}
