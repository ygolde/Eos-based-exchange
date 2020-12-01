const SYSTEM = require('../models/system')
const bip32 = require('bip32')
const bip39 = require('bip39')
const { encodeDecode } = require('./encrypt')
const redshift = require('@stellar-fox/redshift')

var xlm = {
    accountIndex: 0
}


const check_wallet_initialization = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find()
        const { load } = system[0]['xlm']
        if (load)
            return resolve(true)
        return resolve(false)
    })
}

const encrypt_wallet = async () => {
    return new Promise(async (resolve) => {
        try {
            const system = await SYSTEM.find();
            const xlm_wallet = system[0]['xlm'];
            if (xlm_wallet['isSecure'])
                return resolve(true);
            system[0]['xlm']['mnemonic'] = await encodeDecode(xlm_wallet['mnemonic'], 'e');
            system[0]['xlm']['seed'] = await encodeDecode(xlm_wallet['seed'], 'e');
            system[0]['xlm']['passphrase'] = await encodeDecode(xlm_wallet['passphrase'], 'e');
            system[0]['xlm']['publicKey'] = await encodeDecode(xlm_wallet['publicKey'], 'e');
            system[0]['xlm']['memo'] = await encodeDecode(xlm_wallet['memo'], 'e');
            system[0]['xlm']['isSecure'] = true
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
            const xlm_wallet = system[0]['xlm'];
            if (!xlm_wallet['isSecure'])
                return resolve(true);
            system[0]['xlm']['mnemonic'] = await encodeDecode(xlm_wallet['mnemonic'], 'd');
            system[0]['xlm']['seed'] = await encodeDecode(xlm_wallet['seed'], 'd');
            system[0]['xlm']['passphrase'] = await encodeDecode(xlm_wallet['passphrase'], 'd');
            system[0]['xlm']['publicKey'] = await encodeDecode(xlm_wallet['publicKey'], 'd');
            system[0]['xlm']['memo'] = await encodeDecode(xlm_wallet['memo'], 'd');
            system[0]['xrp']['isSecure'] = false
            await system[0].save()
            return resolve(true);
        } catch (error) {
            return resolve(false);
        }
    })
}

const get_xlm_wallet = async () => {
    return new Promise(async (resolve) => {
        const system = await SYSTEM.find();
        const { load, isSecure, mnemonic, logo } = system[0]['xlm'];
        return resolve({ load, logo, isSecure, mnemonic, type: 'XLM' })
    })
}

var initialize_xlm_wallet = async (mnemonic, passphrase, memo) => {
    return new Promise(async (resolve, reject) => {
        try {
            const isLoaded = await check_wallet_initialization()
            if (isLoaded)
                return reject(Error('Wallet already loaded'))

            if (!bip39.validateMnemonic(mnemonic))
                return reject(Error('Invalid mnemonic'))
            const seed = redshift.mnemonicToSeedHex(mnemonic)
            const kp = redshift.genKeypair(seed, 0)

            var system = await SYSTEM.find()
            system[0]['xlm']['mnemonic'] = mnemonic
            system[0]['xlm']['load'] = true
            system[0]['xlm']['passphrase'] = passphrase
            system[0]['xlm']['seed'] = seed
            system[0]['xlm']['publicKey'] = kp.publicKey()
            system[0]['xlm']['memo'] = memo

            await system[0].save()
            resolve()
        } catch (error) {
            console.log(error)
            reject(Error(error.meesage))
        }
    })
}



var get_xlm_address = async () => {
    var system = await SYSTEM.find()
    const address = system[0]['xlm']['publicKey']
    return address
}

var is_xlm_address_generated = async (userId) => {
    return new Promise(async (resolve) => {
        var system = await SYSTEM.find()
        const address = system[0]['xlm']['publicKey']
        if (address)
            return resolve(true)
        return resolve(false)
    })
}

module.exports = {
    is_xlm_address_generated,
    initialize_xlm_wallet,
    encrypt_wallet,
    decrypt_wallet,
    get_xlm_wallet,
    get_xlm_address
}
