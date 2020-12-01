const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('util');
const ecc = require('eosjs-ecc')
const USERS = require('../models/User')
const SYSTEM = require('../models/system')
const EOSTX = require('../models/eos-transactions')
const Balance = require('../models/balance')
const COINS = require('../models/coins')
const { Types } = require('mongoose');
var getAddress = async () => {
    return new Promise(async (resolve) => {
        let privateKey = await ecc.randomKey()
        let publicKey = ecc.privateToPublic(privateKey)
        return resolve({ privateKey, publicKey })
    })
}

var sendTx = async (options) => {
    return new Promise(async (resolve) => {
        try {
            const { coin, userId, to, amount } = options
            let _amount = parseFloat(Number(amount).toFixed(4))
            let currency = coin.toLowerCase()
            await Balance.updateOne({ userId: userId, currency }, { $inc: { useBalance: _amount, balance: -_amount } }, { upsert: true }).exec()
            const toBalance = await Balance.findOneAndUpdate({ userId: to, currency }, { $inc: { balance: _amount } }, {
                new: true,
                upsert: true
            }).exec()
            if (!toBalance) {
                const coin = await COINS.findOne({ tikcer: coin }).exec()
                await Balance.create({
                    userId: to,
                    coinId: coin['_id'],
                    currency,
                    balance: _amount
                })
            }
            resolve(true)
        } catch (error) {
            resolve(false)
        }

    })
}

var reverseTx = async (options) => {
    return new Promise(async (resolve) => {
        const { coin, userId, to, amount } = options
        await sendTx({
            coin,
            userId: to,
            to: userId,
            amount
        })
        resolve()
    })
}

var getPublicKey = async (privateKey) => {
    return new Promise(async (resolve) => {
        if (!ecc.isValidPrivate(privateKey))
            return resolve({ success: false, message: 'Please provide a valid private key' })
        let publicKey = ecc.privateToPublic(privateKey)
        return resolve({ privateKey, publicKey })
    })
}

var get_user_eos_balance = async (userId) => {
    return new Promise(async (resolve) => {
        try {
            var user = await USERS.findOne({ _id: userId }).exec()
            const memoId = user['wallets']['EOS']['memo']
            const txs = await EOSTX.find({ memo: memoId }).exec()
            if (!txs.length)
                return resolve({ success: true, balance: 0.00 })
            var initial_value = 0;
            const total = txs.reduce(reducer, initial_value)
            var balance = await Balance.findOne({ userId: userId, currency: 'eos' }).exec()
            if (!balance) {
                await Balance.create({ userId, currency: 'eos', deposited: total, balance: total })
                return resolve({ success: true, balance: total })
            }
            return resolve({ success: true, balance: parseFloat(Number(balance['balance']).toFixed(4)) })
        } catch (error) {
            resolve({ success: true, balance: 0.00 })
        }
    })
}

var get_user_zipco_balance = async (userId) => {
    return new Promise(async (resolve) => {
        try {
            var balance = await Balance.findOne({ userId: Types.ObjectId(userId), currency: 'zipco' }).exec()
            if (!balance) {
                return resolve({ success: true, balance: 0.00 })
            }
            return resolve({ success: true, balance: parseFloat(Number(balance['balance']).toFixed(4)) })
        } catch (error) {
            resolve({ success: true, balance: 0.00 })
        }
    })
}

const reducer = (accumulator, item) => {
    return accumulator + item['amount'];
};

var getAccountName = async (publicKey) => {
    return new Promise(async (resolve) => {
        if (!ecc.isValidPublic(publicKey))
            return resolve({ success: false, message: 'Please provide valid public key' })
        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']
        fetch('http://api.eossweden.se/v1/history/get_key_accounts', {
            method: 'post',
            body: JSON.stringify({ public_key: publicKey }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                if (!res.ok)
                    return resolve({ success: false, message: 'Please provide a valid account name' })
                let json = await res.json()
                return resolve({ success: true, message: json })
            })
    })
}

var getAccount = async (name) => {
    return new Promise(async (resolve) => {
        if (typeof name != 'string')
            return resolve({ success: false, message: 'Please provide a valid string' })
        if (name.trim() == '')
            return resolve({ success: false, message: 'Please provide account name' })
        let settings = await SYSTEM.find()
        settings = settings[0]
        let network = settings['eos_settings']['nodeUrl']
        fetch(`${network}/v1/chain/get_account`, {
            method: 'post',
            body: JSON.stringify({ account_name: name }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                if (!res.ok)
                    return resolve({ success: false, message: 'Please provide valid account name' })
                let json = await res.json()
                let response = {};

                response['balance'] = parseFloat(json['core_liquid_balance']) + parseFloat(json['voter_info']['staked']) / 10000
                if (json['refund_request'])
                    response['balance'] += parseFloat(json['refund_request']['net_amount']) + parseFloat(json['refund_request']['cpu_amount'])
                response['unstaked'] = parseFloat(json['core_liquid_balance'])
                response['staked'] = parseFloat(json['voter_info']['staked']) / 10000
                response['net_weight'] = (parseFloat(json['total_resources']['net_weight']) + parseFloat(json['self_delegated_bandwidth']['net_weight'])).toFixed(4)
                response['cpu_weight'] = (parseFloat(json['total_resources']['cpu_weight']) + parseFloat(json['self_delegated_bandwidth']['cpu_weight'])).toFixed(4)
                response['net_limit'] = (parseInt(json['net_limit']['used']) / parseInt(json['net_limit']['available'])) * 100
                response['cpu_limit'] = (parseInt(json['cpu_limit']['used']) / parseInt(json['cpu_limit']['available'])) * 100
                response['net_used'] = (parseFloat(json['net_limit']['used']) / 1024).toPrecision(4)
                response['net_total'] = (parseFloat(json['net_limit']['available']) / 1024).toPrecision(4)
                response['cpu_used'] = (parseFloat(json['cpu_limit']['used']) / 1024).toPrecision(4)
                response['cpu_total'] = (parseFloat(json['cpu_limit']['available']) / 1024).toPrecision(4)
                response['ram_usage'] = (parseFloat(json['ram_usage']) / parseFloat(json['ram_quota']) * 100).toPrecision(2)
                response['ram_used'] = (parseFloat(json['ram_usage']) / 1024).toPrecision(4)
                response['ram_total'] = (parseFloat(json['ram_quota']) / 1024).toPrecision(4)
                return resolve({ success: true, message: response })
            })
    })
}

var getAccountBalance = async (options) => {
    return new Promise(async (resolve) => {
        try {
            let { name, token, contract } = options;
            if (!name) {
                var user = await USERS.findOne({ _id: options['userId'] }).exec()
                if (!user || !user['wallets']['ZIPCO']['account']) {
                    return resolve({ balance: 0.00 })
                }
            }
            let settings = await SYSTEM.find()
            settings = settings[0]
            const network = settings['eos_settings']['nodeUrl']
            fetch(`${network}/v1/chain/get_currency_balance`, {
                method: 'post',
                body: JSON.stringify(
                    {
                        code: contract,
                        account: name || user['wallets']['ZIPCO']['account'],
                        symbol: token
                    }),
                headers: { 'Content-Type': 'application/json' },
            })
                .then(async res => {
                    if (!res.ok)
                        return resolve({ success: false, message: 'Contract does not exist' })
                    let json = await res.json()
                    return resolve({ balance: parseInt(json) })
                })
        } catch (error) {
            console.log(error)
            return resolve({ balance: 0.00 })
        }

    })
}

var transfer = async (options) => {
    return new Promise(async (resolve) => {
        let {
            sender,
            receiver,
            amount,
            token,
            memo
        } = options
        let isValid = await validateTransfer(options);
        if (!isValid['success'])
            return resolve(isValid)
        let contracts = {
            "EOS": { name: "eosio.token" },
            "LIBRA": { name: "usdcoinchain" },
            "ZIPCO": { name: "zipcointoken" }
        }
        const contract = contracts[token]['name']
        if (!contract)
            return resolve({ success: false, message: 'Contract not found' })

        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']
        const defaultPrivateKey = settings['eos_settings']['privatekey']
        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        const rpc = new JsonRpc(`${network}`, { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
            chainId: settings['eos_settings']['chainId']
        });
        try {
            const result = await api.transact({
                actions: [{
                    account: contract,
                    name: 'transfer',
                    authorization: [{
                        actor: sender,
                        permission: 'active'
                    }],
                    data: {
                        from: sender,
                        to: receiver,
                        quantity: `${amount} ${token}`,
                        memo: memo
                    }
                }]
            }, {
                broadcast: true,
                blocksBehind: 3,
                sign: true,
                expireSeconds: 30,
            })
            return resolve({ success: true, message: result })

        } catch (e) {
            console.log('\nCaught exception: ' + e);
            if (e instanceof RpcError)
                return resolve({ success: false, message: JSON.stringify(e.json) });
            return resolve({ success: false, message: e.message })
        }

    })
}

var createAccount = async (options) => {
    return new Promise(async (resolve) => {
        const { new_account } = options;
        const isValid = await validateAccountCreation(options)
        if (!isValid['success']) return resolve(isValid)
        let settings = await SYSTEM.find({})
        settings = settings[0]
        const defaultPrivateKey = settings['eos_settings']['privatekey']
        const network = settings['eos_settings']['nodeUrl']
        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        const rpc = new JsonRpc(`${network}`, { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
            chainId: settings['eos_settings']['chainId']
        });
        const keypair = await getAddress()
        const config = await buildAccountObject(new_account, settings['eos_settings']['eos_account'], keypair['publicKey'])
        try {
            let result = await api.transact(config, {
                blocksBehind: 3,
                expireSeconds: 30,
            })
            return resolve({ success: true, message: result, keypair })
        } catch (e) {
            console.log('\nCaught exception: ' + e);
            return resolve({ success: false, message: e });
        }
    })
}

var validateTransfer = async (options) => {
    return new Promise(async (resolve) => {
        let {
            sender,
            receiver,
            amount,
            token,
            memo
        } = options
        if (!sender || !receiver || !amount || !token || !memo)
            return resolve({ success: false, message: 'Please provide required parameters' })

        if (typeof sender != 'string' || sender.length != 12)
            return resolve({ success: false, message: 'sender must be a 12 characters valid string' })
        if (typeof receiver != 'string' || receiver.length != 12)
            return resolve({ success: false, message: 'receiver must be a 12 characters valid string' })
        if (typeof amount != 'string')
            return resolve({ success: false, message: 'Please provide valid amount' })
        if (typeof memo != 'string')
            return resolve({ success: false, message: 'memo must be a valid string' })
        return resolve({ success: true })
    })
}

var ramPrice = async () => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']
        const rpc = new JsonRpc(`${network}`, { fetch });
        const res = await rpc.get_table_rows({
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'rammarket',
            limit: 1,
        });
        const price = parseFloat(res.rows[0].quote.balance);
        return resolve({ success: true, price })
    })
}

var getRamFee = async () => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']
        const rpc = new JsonRpc(`${network}`, { fetch });
        const res = await rpc.get_table_rows({
            json: true,
            code: 'eosio',
            scope: 'eosio',
            table: 'rammarket',
            limit: 1,
        });
        const quoteBalance = parseFloat(res.rows[0].quote.balance);
        const baseBalance = parseFloat(res.rows[0].base.balance);
        const fee = (quoteBalance / baseBalance);
        return resolve({ success: true, fee })
    })
}

var ramInfo = async () => {
    return new Promise(async (resolve) => {

    })
}

var buyRam = async (options) => {
    return new Promise(async (resolve) => {
        const { payer, receiver, rambyte } = options

        if (!receiver || !rambyte)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof receiver != 'string')
            return resolve({ success: false, message: 'receiver account name must be a string' })
        if (rambyte < 1)
            return resolve({ success: false, message: 'Ram bytes should be greater than 0' })
        if (receiver.length != 12)
            return resolve({ success: false, message: 'Account name must be 12 characters long' })

        const { price } = await getRamFee()
        const ramPrice = price * rambyte;
        if (ramPrice < 0.0001)
            return resolve({ success: false, message: 'You can\'t buy, Please increase your bytes amount' })

        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']

        const defaultPrivateKey = settings['eos_settings']['privatekey']
        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        const rpc = new JsonRpc(`${network}`, { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
            chainId: settings['eos_settings']['chainId']
        });

        try {
            const result = await api.transact({
                actions: [{
                    account: 'eosio',
                    name: 'buyrambytes',
                    authorization: [{
                        actor: payer,
                        permission: 'active',
                    }],
                    data: {
                        payer: payer,
                        receiver: receiver,
                        bytes: parseInt(rambyte),
                    },
                }]
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            });

            return resolve({ success: true, message: result })
        }
        catch (e) {
            console.log('\nCaught exception: ' + e);
            if (e.message.includes('must purchase a positive amount'))
                return resolve({ success: false, message: 'Please increase yout ram bytes' })
            if (e instanceof RpcError)
                return resolve({ success: false, message: e.message });
            return resolve({ success: false, message: e.message })
        }
    })
}

var sellRam = async (options) => {
    return new Promise(async (resolve) => {
        const { seller, rambyte } = options

        if (!seller || !rambyte)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof seller != 'string')
            return resolve({ success: false, message: 'seller account name must be a string' })
        if (rambyte < 1)
            return resolve({ success: false, message: 'Ram bytes should be greater than 0' })
        if (seller.length != 12)
            return resolve({ success: false, message: 'Account name must be 12 characters long' })

        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']

        const defaultPrivateKey = settings['eos_settings']['privatekey']
        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        const rpc = new JsonRpc(`${network}`, { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
            chainId: settings['eos_settings']['chainId']
        });
        const result = await api.transact({
            actions: [{
                account: 'eosio',
                name: 'sellram',
                authorization: [{
                    actor: seller,
                    permission: 'active',
                }],
                data: {
                    account: seller,
                    bytes: parseInt(rambyte),
                },
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        }).catch(e => {
            console.log(`Message :${e.message}`)
            return resolve({ success: false, message: e.message })
        })
        return resolve({ success: true, message: result })
    })
}

var stake = async (options) => {
    return new Promise(async (resolve) => {
        let { payer, to, netstake, cpustake } = options
        if (!payer || !to || !netstake || !cpustake)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof payer != 'string')
            return resolve({ success: false, message: 'payer account must be a valid string' })
        if (typeof to != 'string')
            return resolve({ success: false, message: 'receiving account must be a string' })
        if (to.length != 12)
            return resolve({ success: false, message: 'Recipient account should be 12 characters long' })
        if (typeof netstake != 'string')
            return resolve({ success: false, message: 'netstake must me a string' })
        if (typeof cpustake != 'string')
            return resolve({ success: false, message: 'cpustake must be a string' })
        netstake = parseFloat(netstake).toFixed(4)
        cpustake = parseFloat(cpustake).toFixed(4)
        if (netstake < 0.0001)
            return resolve({ success: false, message: 'NET stake should greater than 0.0001 EOS' })
        if (cpustake < 0.0001)
            return resolve({ success: false, message: 'CPU stake should greater than 0.0001 EOS' })

        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']
        const defaultPrivateKey = settings['eos_settings']['privatekey']

        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        const rpc = new JsonRpc(`${network}`, { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
            chainId: settings['eos_settings']['chainId']
        });
        const result = await api.transact({
            actions: [{
                account: 'eosio',
                name: 'delegatebw',
                authorization: [{
                    actor: payer,
                    permission: 'active',
                }],
                data: {
                    from: payer,
                    receiver: to,
                    stake_net_quantity: `${netstake} EOS`,
                    stake_cpu_quantity: `${cpustake} EOS`,
                    transfer: false,
                }
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        }).catch(e => {
            return resolve({ success: false, message: e.message })
        })
        return resolve({ success: true, message: result })
    })
}

var unstake = async (options) => {
    return new Promise(async (resolve) => {
        let { payer, to, netstake, cpustake } = options
        if (!payer || !to || !netstake || !cpustake)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof payer != 'string')
            return resolve({ success: false, message: 'payer account must be a valid string' })
        if (typeof to != 'string')
            return resolve({ success: false, message: 'receiving account must be a string' })
        if (typeof netstake != 'string')
            return resolve({ success: false, message: 'netstake must me a string' })
        if (typeof cpustake != 'string')
            return resolve({ success: false, message: 'cpustake must be a string' })
        if (payer.length != 12)
            return resolve({ success: false, message: 'payer account length should be 12 character length' })
        if (to.length != 12)
            return resolve({ success: false, message: 'receiving account length should be 12 character length' })
        netstake = parseFloat(netstake).toFixed(4).toString()
        cpustake = parseFloat(cpustake).toFixed(4).toString()

        let settings = await SYSTEM.find()
        settings = settings[0]
        const network = settings['eos_settings']['nodeUrl']
        const defaultPrivateKey = settings['eos_settings']['privatekey']
        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        const rpc = new JsonRpc(`${network}`, { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
            chainId: settings['eos_settings']['chainId']
        });
        const result = await api.transact({
            actions: [{
                account: 'eosio',
                name: 'undelegatebw',
                authorization: [{
                    actor: payer,
                    permission: 'active',
                }],
                data: {
                    from: payer,
                    receiver: to,
                    unstake_net_quantity: `${netstake} EOS`,
                    unstake_cpu_quantity: `${cpustake} EOS`,
                    transfer: false,
                }
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        }).catch(e => {
            return resolve({ success: false, message: e.message })
        })
        return resolve({ success: true, message: result })
    })
}

var getProducers = async (options) => {
    return new Promise(async (resolve) => {
        const { limit, lower_bound } = options
        if (!limit || !lower_bound)
            return resolve({ success: false, message: 'Please provide required parameters' })
        fetch('http://104.225.217.141:8888/v1/chain/get_producers', {
            method: 'post',
            body: JSON.stringify(
                {
                    num: num,
                    lower_bound: lower_bound,
                }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => {
                return resolve({ success: true, message: json })
            })
    })
}

var voteProducer = async (options) => {
    return new Promise(async (resolve) => {
        const { from, producer, } = options
        if (!from || !producer)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof from != 'string')
            return resolve({ success: false, message: 'payer account must be a valid string' })
        if (typeof producer != 'string')
            return resolve({ success: false, message: 'receiving account must be a string' })
        const user = await getAdmin()
        const { eos_settings } = await SYSTEM.findOne({}).exec()
        const defaultPrivateKey = user['admin']['wallets']['EOS']['addresses']['privatekey']
        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        const rpc = new JsonRpc('http://104.225.217.141:8888', { fetch });
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder(),
            chainId: eos_settings['chainId'] || defaultChainId
        });
        const result = await api.transact({
            actions: [{
                account: 'eosio',
                name: 'voteproducer',
                authorization: [{
                    actor: from,
                    permission: 'active',
                }],
                data: {
                    voter: from,
                    producers: producer,
                    proxy: ""
                }
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        return resolve({ success: true, message: result })
    })
}

var validateAccountCreation = async (options) => {
    return new Promise(async (resolve) => {
        let { new_account, userId } = options
        if (!new_account)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof new_account != 'string')
            return resolve({ success: false, message: 'new_account must a valid string' })
        if (new_account.length != 12)
            return resolve({ success: false, message: 'account name must be a 12 characters long' })
        return resolve({ success: true })
    })
}

var getAdmin = async () => {
    return new Promise(async (resolve) => {
        let admins = await USERS.find({ type: 'admin', isBlock: false }).exec()
        if (admins.length)
            return resolve({ success: false, message: 'Please contact our support for account creation' })
        let index = admins.forEach((admin, index) => {
            if (admin['wallets']['EOS']['address']['privatekey'])
                return index;
        })
        if (index == undefined || !index)
            return resolve({ success: false, message: 'Please contact our support for account creation' })
        return resolve({ success: true, admin: admins[index] })
    })
}

var buildAccountObject = async (new_account, creator, publickey) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find({})
        settings = settings[0]
        return resolve({
            actions: [{
                account: 'eosio',
                name: 'newaccount',
                authorization: [{
                    actor: creator,
                    permission: 'active',
                }],
                data: {
                    creator: creator,
                    name: new_account,
                    owner: {
                        threshold: 1,
                        keys: [{
                            key: publickey,
                            weight: 1
                        }],
                        accounts: [],
                        waits: []
                    },
                    active: {
                        threshold: 1,
                        keys: [{
                            key: publickey,
                            weight: 1
                        }],
                        accounts: [],
                        waits: []
                    },
                },
            },
            {
                account: 'eosio',
                name: 'buyrambytes',
                authorization: [{
                    actor: creator,
                    permission: 'active',
                }],
                data: {
                    payer: creator,
                    receiver: new_account,
                    bytes: 5000,
                },
            },
            {
                account: 'eosio',
                name: 'delegatebw',
                authorization: [{
                    actor: creator,
                    permission: 'active',
                }],
                data: {
                    from: creator,
                    receiver: new_account,
                    stake_net_quantity: settings['eos_settings']['netstake'],
                    stake_cpu_quantity: settings['eos_settings']['cpustake'],
                    transfer: false,
                }
            }]
        })
    })
}

var info = async () => {
    return new Promise(async (resolve) => {
        const { eos_setting } = await SYSTEM.findOne({}).exec()
        fetch(`${eos_setting['nodeUrl']}/v1/chain/get_info`, {
            method: 'post',
            body: JSON.stringify(
                {}),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => {
                return resolve({ success: true, message: json })
            })
    })
}

var getActions = async (options) => {
    return new Promise(async (resolve) => {
        const { name, startOffset, endOffset } = options
        const { eos_setting } = await SYSTEM.findOne({}).exec()
        node_fetch(`${eos_setting['nodeUrl']}/v1/history/get_actions`, {
            method: 'post',
            body: JSON.stringify(
                {
                    account_name: name,
                    pos: parseInt(startOffset),
                    offset: parseInt(endOffset)
                }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => {
                return resolve({ success: true, message: json })
            })
    })
}

var getKeyAccounts = async (options) => {
    return new Promise(async (resolve) => {
        const { pubkey } = options
        const { eos_setting } = await SYSTEM.findOne({}).exec()
        node_fetch(`${eos_setting['nodeUrl']}/v1/history/get_key_accounts`, {
            method: 'post',
            body: JSON.stringify(
                {
                    public_key: pubkey
                }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => {
                return resolve({ success: true, message: json })
            })
    })
}

var getTransaction = async (id) => {
    return new Promise(async (resolve) => {
        const rpc = new JsonRpc('http://localhost:8888', { fetch });
        const res = await rpc.history_get_transaction(id)
        return resolve({ success: true, message: res })
    })
}


var getNodeSize = async () => {
    return new Promise(async (resolve) => {
        const { eos_setting } = await SYSTEM.findOne({}).exec()
        fetch(`${eos_setting['nodeUrl']}/v1/db_size/get`, {
            method: 'get',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => res.json())
            .then(json => {
                return resolve({ success: true, message: json })
            })
    })
}

var createWallet = async (name) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/create`, {
            method: 'POST',
            body: `"${name}"`,
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async (res) => {
                let text = await res.text()
                text = JSON.parse(text)
                if (!res.ok) {
                    return resolve({ success: res.ok, message: text['error']['what'] })
                }
                return resolve({ success: res.ok, message: text })
            }
            )
            .catch(e => {
                return resolve({ success: false, message: 'Please contact our support for any problem' })
            })
    })
}

var openWallet = async (name) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/open`, {
            method: 'POST',
            body: `"${name}"`,
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                text = JSON.parse(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: 'Wallet opened successfully' })
                if (text['error']['name'] == 'wallet_nonexistent_exception')
                    return resolve({ success: res.ok, message: 'Wallet does exist' })
                if (text['error']['name'] == 'parse_error_exception')
                    return resolve({ success: res.ok, message: 'Invalid parameter format' })
                return resolve({ success: res.ok, message: text['error']['what'] })
            })
    })
}

var lockWallet = async (name) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/lock`, {
            method: 'POST',
            body: `"${name}"`,
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                text = JSON.parse(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: 'Wallet locked successfully' })
                if (text['error']['name'] == 'wallet_nonexistent_exception')
                    return resolve({ success: res.ok, message: 'Wallet does exist' })
                if (text['error']['name'] == 'parse_error_exception')
                    return resolve({ success: res.ok, message: 'Invalid parameter format' })
                return resolve({ success: res.ok, message: text['error']['what'] })
            })
    })
}

var lock_allWallets = async (name) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/lock_all`, {
            method: 'POST',
            body: `"${name}"`,
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                text = JSON.parse(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: 'Wallets locked successfully' })
                if (text['error']['name'] == 'wallet_nonexistent_exception')
                    return resolve({ success: res.ok, message: 'Wallet does exist' })
                if (text['error']['name'] == 'parse_error_exception')
                    return resolve({ success: res.ok, message: 'Invalid parameter format' })
                return resolve({ success: res.ok, message: text['error']['what'] })
            })
    })
}

var unlockWallet = async (name, password) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/unlock`, {
            method: 'post',
            body: `["${name}","${password}"]`,
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                text = JSON.parse(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: 'Wallet unlocked successfully' })
                if (text['error']['name'] == 'wallet_nonexistent_exception')
                    return resolve({ success: res.ok, message: 'Wallet does exist' })
                if (text['error']['name'] == 'parse_error_exception')
                    return resolve({ success: res.ok, message: 'Invalid parameter format' })
                return resolve({ success: res.ok, message: text['error']['what'] })
            })
    })
}

var importWallet = async (name, privatekey) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/import_key`, {
            method: 'POST',
            body: `["${name}","${privatekey}"]`,
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                text = JSON.parse(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: 'Wallet imported successfully' })
                if (text['error']['name'] == 'wallet_nonexistent_exception')
                    return resolve({ success: res.ok, message: 'Wallet does exist' })
                if (text['error']['name'] == 'parse_error_exception')
                    return resolve({ success: res.ok, message: 'Invalid parameter format' })
                if (text['error']['name'] == 'assert_exception')
                    return resolve({ success: res.ok, message: 'Invalid private key format' })
                return resolve({ success: res.ok, message: text['error']['what'] })
            })
    })
}

var listWallets = async () => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/list_wallets`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                text = JSON.parse(text)
                console.log(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: text })
                return resolve({ success: res.ok, message: text['error']['what'] })
            })
            .catch(e => {
                return resolve({ success: false, message: 'There mmight be server problem' })
            })
    })
}

var publicKeys = async () => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/get_public_keys`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                console.log(text)
                text = JSON.parse(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: text })
                return resolve({ success: res.ok, message: text['error']['what'] })
            }).catch(e => {
                return resolve({ success: false, message: 'There might be a server error' })
            })
    })
}

var removeWalletKey = async (publickey, name, password) => {
    return new Promise(async (resolve) => {
        let settings = await SYSTEM.find()
        settings = settings[0]
        const walletUrl = settings['eos_settings']['walletUrl']
        fetch(`${walletUrl}/v1/wallet/remove_key`, {
            method: 'POST',
            body: `["${name}","${password}","${publickey}"]`,
            headers: { 'Content-Type': 'application/json' },
        })
            .then(async res => {
                let text = await res.text()
                text = JSON.parse(text)
                if (res.ok)
                    return resolve({ success: res.ok, message: 'Key successfully removed' })
                if (text['error']['name'] == 'wallet_nonexistent_exception')
                    return resolve({ success: res.ok, message: 'Wallet does exist' })
                if (text['error']['name'] == 'parse_error_exception')
                    return resolve({ success: res.ok, message: 'Invalid parameter format' })
                if (text['error']['name'] == 'assert_exception')
                    return resolve({ success: res.ok, message: 'Invalid public key format' })
                return resolve({ success: res.ok, message: text['error']['what'] })
            })
    })
}

module.exports = {
    get_user_zipco_balance: get_user_zipco_balance,
    get_user_eos_balance: get_user_eos_balance,
    getAccountBalance: getAccountBalance,
    lock_allWallets: lock_allWallets,
    removeWalletKey: removeWalletKey,
    getAccountName: getAccountName,
    getKeyAccounts: getKeyAccounts,
    getTransaction: getTransaction,
    createAccount: createAccount,
    getPublicKey: getPublicKey,
    voteProducer: voteProducer,
    getProducers: getProducers,
    createWallet: createWallet,
    unlockWallet: unlockWallet,
    importWallet: importWallet,
    getNodeSize: getNodeSize,
    listWallets: listWallets,
    publicKeys: publicKeys,
    openWallet: openWallet,
    getAddress: getAddress,
    getAccount: getAccount,
    getActions: getActions,
    lockWallet: lockWallet,
    getRamFee: getRamFee,
    reverseTx: reverseTx,
    ramPrice: ramPrice,
    transfer: transfer,
    unstake: unstake,
    ramInfo: ramInfo,
    sellRam: sellRam,
    buyRam: buyRam,
    sendTx: sendTx,
    stake: stake,
    info: info,
}