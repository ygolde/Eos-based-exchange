const BigNumber = require('bignumber.js');
const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
require('dotenv').config()
const VerifyToken = require('../auth/VerifyToken')
const User = require('../models/User')
const Balance = require('../models/balance')
const EOSTX = require('../models/eos-transactions')
const BalanceLog = require('../models/balance-log')
const Withdraw = require('../models/withdraws')
const balanceFactory = require('../fatory/balance')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const stripe = require('stripe')('sk_test_U2XH3Vs6dojEgLUQhuSeUwMW00VZgBGng5');
const PERCENTAGE = 100
const MINIMUM_WITHDRAW = 10;
BigNumber.config({
    DECIMAL_PLACES: 2,
    ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN,
    DECIMAL_PLACES: 2
})

router.get('/get-user-balance', VerifyToken, async (req, res) => {
    try {
        const userId = req.userId
        const currency = req.query.currency || 'usd'
        const response = await get_user_balance(userId, currency)
        res.send({ success: true, balance: response })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.post('/stripe-withdraw-request', VerifyToken, async (req, res) => {
    const userId = req.userId
    const { amount, destination } = req.body
    if (amount < MINIMUM_WITHDRAW)
        return res.send({ success: false, message: 'Minimum withdraw limit is 10$' })
    if (amount == NaN || !amount)
        return res.send({ success: false, message: 'Please provide withdraw amount' })
    const percent = new BigNumber(parseFloat((4.5 / PERCENTAGE).toPrecision(2)))
    let fees = new BigNumber(amount * percent).toNumber().toFixed(2);
    var withdraw_amount = new BigNumber(amount - fees).toNumber().toFixed(2)
    withdraw_amount = parseFloat(withdraw_amount) * PERCENTAGE
    const currency = 'usd'
    try {
        await check_linked_accounts(userId)
        await check_verification_tiers(userId)
        await check_user_balance(userId, withdraw_amount)
        const response = await stripe_withdraw_request(userId, withdraw_amount, currency)
        await Withdraw.create({
            userId: userId,
            currency,
            withdraw_amount,
            state: 'pending',
            type: 'fiat',
            destination,
            fee: fees
        })
        res.send(response)
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

router.post('/add_deposit_balance', VerifyToken, async (req, res) => {
    const userId = req.userId
    console.log(req.body)
    const { amount, currency } = req.body
    try {
        const response = await add_deposit_balance(userId, amount, currency)
        res.send({ success: true })
    } catch (error) {
        res.send({ success: false })
    }
})

router.get('/get-user-eos-balance', VerifyToken, async (req, res) => {
    try {
        const userId = req.userId
        const response = await get_user_eos_balance(userId)
        res.send({ balance: response })
    } catch (err) {
        res.send({ balance: 0.00 })
    }
})


router.get('/get-crypto-balance', VerifyToken, async (req, res) => {
    try {
        const response = await balanceFactory.getBalance(req)
        res.send(response)
    } catch (err) {
        res.send({ balance: 0.00 })
    }
})

module.exports = router;

const add_deposit_balance = async (userId, amount, currency) => {
    return new Promise(async (resolve, reject) => {
        var balance;
        try {
            console.log(amount)
            const user_balance = await Balance.findOne({ userId, currency }).exec()
            if (user_balance) {
                await user_balance.updateOne({ $inc: { balance: amount } }).exec()
                console.log(user_balance)
            }
            else {
                balance = await Balance.create({
                    userId,
                    currency,
                    balance: amount
                })
            }
            resolve()
        } catch (error) {
            reject(error)
        }

    })
}

const check_linked_accounts = async (userId) => {
    return new Promise(async (resolve, reject) => {
        const user = await User.findOne({ _id: userId }).exec()
        if (!user['stripe']['connects']['accountId'] || !user['stripe']['connects']['bankId'] || !user['stripe']['connects']['bankId'])
            return reject(Error('Please add linked accounts to withdraw your funds'))
        return resolve()
    })
}

const stripe_withdraw_request = async (userId, amount, currency) => {
    console.log('Stripe Witdraw Request')
    return new Promise(async (resolve, reject) => {
        try {
            var data = {}
            var user = await User.findOne({ _id: userId }).exec()
            data['amount'] = amount
            data['currency'] = currency
            data['accountId'] = user['stripe']['connects']['accountId']
            await transfer(data)
            await deduct_withdraw_balance(userId, amount, currency)
            resolve({ success: true, message: 'You will be notify when funds will be ready' })
        } catch (error) {
            reject(error)
        }
    })
}

var transfer = async (data) => {
    return new Promise((resolve, reject) => {
        console.log('Reject')
        stripe.transfers.create(
            {
                amount: data['amount'],
                currency: data['currency'],
                destination: data['accountId'],
                transfer_group: 'zipcx',
            },
            function (err, transfer) {
                if (err)
                    return reject(err)
                resolve(transfer)
            }
        );
    })
}

const deduct_withdraw_balance = async (userId, amount, currency) => {
    console.log('Deduct Withdraw Balance')
    return new Promise(async (resolve, reject) => {
        try {
            var user = await Balance.findOne({ userId }).exec()
            user['balance'] = user['balance'] - amount
            await user.save()
            await BalanceLog.create({
                userId: userId,
                currency,
                amount
            })
            resolve()
        } catch (error) {
            reject(error)
        }

    })
}

const check_user_balance = async (userId, amount) => {
    console.log('Check User Balance')
    console.log(`Amount =>${amount}`)
    return new Promise(async (resolve, reject) => {
        const user_balance = await Balance.findOne({ userId }).exec()
        const balance = user_balance['balance']
        if (balance < amount)
            return reject(Error('Insufficient balance'))
        return resolve()
    })
}

var check_verification_tiers = async (userId) => {
    console.log('Check Verification Tiers')
    return new Promise(async (resolve, reject) => {
        let user = await User.findOne({ _id: userId }).exec()
        if (!user['emailStatus'] || !user['mobileStatus'])
            return reject(Error('Please complete your verification Teir-1'))
        if (!user['kyc']['front']['status'] || !user['kyc']['back']['status'] || !user['kyc']['signature']['status'] || !user['kyc']['selfie']['status'])
            return reject(Error('Please complete your verification Tier-2'))
        if (user['kyc']['detail']['status'] !== 'APPROVED' || !user['kyc']['utility_bill']['status'])
            return reject(Error('Please complete your verification Tier-3'))
        resolve()
    })
}

var get_user_balance = async (userId, currency = 'usd') => {
    return new Promise(async (resolve, reject) => {
        try {

            const user = await Balance.findOne({ userId: userId, currency }).exec()
            if (!user)
                return resolve(0)
            return resolve(user['balance'])
        } catch (error) {
            reject(error)
        }

    })
}

var get_user_eos_balance = async (userId) => {
    return new Promise(async (resolve) => {
        try {
            var user = await User.findOne({ _id: userId }).exec()
            const memoId = user['wallets']['EOS']['memo']
            const txs = await EOSTX.find({ memo: memoId }).exec()
            if (!txs.length)
                return resolve({ balance: 0.00 })
            var initial_value = 0;
            const total = txs.reduce(reducer, initial_value)
            var balance = await Balance.findOneAndUpdate({ userId: userId, currency: 'eos' }, { balance: total}).exec()
            if (!balance) {
                await Balance.create({ userId, currency: 'eos', balance: total })
                return resolve({ balance: total })
            }
            const available = total - balance['useBalance']
            return resolve({ balance: available })
        } catch (error) {
            resolve({ balance: 0.00 })
        }
    })
}

const reducer = (accumulator, item) => {
    return accumulator + item['amount'];
};
