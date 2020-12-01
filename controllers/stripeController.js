const BigNumber = require('bignumber.js');
const express = require('express');
var router = express.Router();
const fs = require('fs');
require('dotenv').config()
const bodyParser = require('body-parser');
const User = require('../models/User')
const Deposit = require('../models/deposites')
const VerifyToken = require('../auth/VerifyToken')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const stripe = require('stripe')('sk_live_8K05uXtbFRznx1EXhsXqeZj1');

const PERCENTAGE = 100
BigNumber.config({
    DECIMAL_PLACES: 2,
    ROUNDING_MODE: BigNumber.ROUND_HALF_DOWN,
    DECIMAL_PLACES: 2
})


router.get('/config', async (req, res) => {
    res.send({
        publicKey: 'pk_test_Gt2aUqToEzMVILcSLVfnyQrx00pSV49NUL',
        unitAmount: 20,
        currency: 'usd',
    });
});



router.post('/webhooks', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    console.log('calling webhooks')
    let data;
    let eventType;

    data = req.body.data;
    eventType = req.body.type;

    switch (eventType) {
        case 'charge.succeeded':
            console.log('Charge Succed')
            const charge = data.object
            const pi = charge['payment_intent']
            const txId = charge['balance_transaction']
            const receipt_url = charge['receipt_url']
            var deposit = await Deposit.findOne({ paymentId: pi }).exec()
            deposit['state'] = 'confirmed'
            deposit['txId'] = txId
            deposit['receipt_url'] = receipt_url
            await deposit.save()
            console.log(charge)
            break;
        case 'payment_intent.created':
            const paymentIntent = data.object;
            // console.log(paymentIntent)
            // Then define and call a method to handle the successful payment intent.
            // handlePaymentIntentSucceeded(paymentIntent);
            break;
        case 'payment_intent.succeeded':
            console.log('payment intent succeed')
            // const paymentIntent = data.object;
            // console.log(paymentIntent)
            // Then define and call a method to handle the successful payment intent.
            // handlePaymentIntentSucceeded(paymentIntent);
            break;
        case 'payment_method.attached':
            const paymentMethod = data.object;
            // Then define and call a method to handle the successful attachment of a PaymentMethod.
            // handlePaymentMethodAttached(paymentMethod);
            break;
        case 'transfer.paid':
            const tansfer = data.object
        // ... handle other event types
        default:
            // Unexpected event type
            return res.status(400).end();
    }

    res.sendStatus(200);
});

//==================== Connected Accounts ===============



var create_account = async (userId, req) => {
    console.log('Creating Connects Account')
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findOne({ _id: userId }).exec()
            const dob = new Date(user['personalInfo']['dob'])
            const day = dob.getDate()
            const month = dob.getMonth()
            const year = dob.getFullYear()
            console.log(`${dob}|| ${day}|| ${month} || ${year}`)
            stripe.accounts.create(
                {
                    type: 'custom',
                    country: 'US',
                    email: user['email'],
                    business_type: 'individual',
                    requested_capabilities: [
                        'card_payments',
                        'transfers',
                    ],
                    individual: {
                        first_name: user['personalInfo']['fname'],
                        last_name: user['personalInfo']['lname'],
                        email: user['email'],
                        ssn_last_4: user['personalInfo']['ssn_last_4'],
                        phone: user['mobile']['internationalNumber'],
                        address: {
                            city: user['personalInfo']['city'],
                            country: 'US',
                            line1: user['personalInfo']['address'],
                            postal_code: user['personalInfo']['postal_code'],
                            state: user['personalInfo']['province']
                        },
                        dob: {
                            day,
                            month,
                            year
                        }
                    },
                    business_profile: {
                        mcc: '5734',
                        url: 'https://test.zipcoin.exchange'
                    },
                },
                async function (err, account) {
                    if (err)
                        return reject(err)
                    const frontId = await upload_documents(userId, 'front')
                    const backId = await upload_documents(userId, 'back')
                    const updated_account = await stripe.accounts.update(
                        account['id'],
                        {
                            individual: {
                                verification: {
                                    document: {
                                        front: frontId['id'],
                                        back: backId['id']
                                    }
                                }
                            }
                        }
                    );
                    activate_capabilities(account['id'], req)
                    return resolve(account)
                }
            );
        } catch (error) {
            reject(error)
        }
    })
}

router.get('/account', async (req, res) => {
    try {
        const response = await create_account()
        console.log(response)
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }

})

router.get('/delete-account', async (req, res) => {
    const accountId = req.query.accountId
    stripe.accounts.del(
        accountId,
        function (err, confirmation) {
            if (err)
                return res.send({ success: false, message: err.message })
            res.send({ success: true, message: 'Account deleted successfully' })
        }
    );
})

var activate_capabilities = async (accountId, req) => {
    return new Promise(async (resolve, reject) => {
        try {
            const account = await stripe.accounts.update(
                accountId,
                {
                    tos_acceptance: {
                        date: Math.floor(Date.now() / 1000),
                        ip: req.connection.remoteAddress, // Assumes you're not using a proxy
                    }
                }
            );
            resolve(account)
        } catch (error) {
            reject(error)
        }
    })
}

router.get('/activate_capabilities', async (req, res) => {
    try {
        const response = await activate_capabilities('acct_1Gq1NDGQW9LaGwKY', req)
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }

})

var upload_documents = async (userId, side) => {
    console.log(`Uploading ${side} side`)
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findOne({ _id: userId }).exec()
            const image = user['kyc'][`${side}`]['image'].split('=')[1]
            const file = await stripe.files.create({
                purpose: 'identity_document',
                file: {
                    data: fs.readFileSync(`${process.cwd()}/uploads/${image}`),
                    name: 'file_name.jpeg',
                    type: 'application/octet-stream',
                },
            }, {
                stripeAccount: user['stripe']['connects']['accountId'],
            });
            resolve(file)
        } catch (error) {
            reject(error)
        }
    })
}

router.get('/upload-documents', async (req, res) => {
    try {
        const frontId = await upload_documents('acct_1GpJOLGmQq5qZiig', 'front')
        const backId = await upload_documents('acct_1GpJOLGmQq5qZiig', 'front')
        const account = await stripe.accounts.update(
            'acct_1GpJOLGmQq5qZiig',
            {
                individual: {
                    verification: {
                        document: {
                            front: frontId['id'],
                            back: backId['id']
                        }
                    }
                }

            }
        );
        res.send(account)
    } catch (error) {
        console.log(error)
        res.send(error.message)
    }

})

var add_bank_account = async (accountId, data) => {
    return new Promise((resolve, reject) => {
        stripe.accounts.createExternalAccount(
            accountId,
            {
                external_account: {
                    object: 'bank_account',
                    country: 'US',
                    currency: 'usd',
                    account_holder_name: data['name'],
                    routing_number: data['routing_number'],
                    account_number: data['account_number']
                },
            },
            function (err, bankAccount) {
                if (err)
                    return reject(err)
                resolve(bankAccount)
            }
        );
    })
}

router.post('/add-bank-account', VerifyToken, async (req, res) => {
    const userId = req.userId
    const { name, account_number, routing_number } = req.body
    try {
        await check_verification_tiers(userId)
        const user = await User.findOne({ _id: userId }).exec()
        if (!user)
            return res.send({ success: false, message: 'User not found' })
        if (!user['stripe']['connects']['accountId']) {
            const account = await create_account(userId, req)
            user['stripe']['connects']['accountId'] = account['id']
            await user.save()
        }
        const accountId = user['stripe']['connects']['accountId']
        const response = await add_bank_account(accountId, { name, account_number, routing_number })
        user['stripe']['connects']['bankId'] = response['id']
        await user.save()
        res.send({ success: true, message: 'Please wait for approval' })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }

})

router.get('/delete-connect-bank', VerifyToken, async (req, res) => {
    const userId = req.userId
    const user = await User.findOne({ _id: userId }).exec()
    const accountId = user['stripe']['connects']['accountId']
    const bankId = req.query.bankId
    stripe.accounts.deleteExternalAccount(
        accountId,
        bankId,
        function (err, confirmation) {
            if (err)
                res.send({ success: false, message: err.message })
            res.send({ success: true, message: 'Bank account removed successfully' })
        }
    );
})

var add_debit_card = async (userId, token) => {
    return new Promise(async (resolve, reject) => {
        const user = await User.findOne({ _id: userId }).exec()
        stripe.accounts.createExternalAccount(
            user['stripe']['connects']['accountId'],
            { external_account: token.id },
            async function (err, card) {
                if (err)
                    return reject(err)
                user['stripe']['connects']['cardId'] = card['id']
                await user.save()
                resolve({ success: true, message: 'Your card has been added' })
            }
        );
    })
}

router.post('/add-debit-card', VerifyToken, async (req, res) => {
    const userId = req.userId
    const token = req.body
    try {
        const response = await add_debit_card(userId, token)
        res.send(response)
    } catch (error) {
        res.send({ success: false, message: error.message })
    }

})

var get_bank_account = async (accountId, bankId) => {
    return new Promise((resolve, reject) => {
        stripe.accounts.retrieveExternalAccount(
            accountId,
            bankId,
            function (err, bankAccount) {
                if (err)
                    return reject(err)
                resolve(bankAccount)
            }
        );
    })
}

router.get('/get-bank-account', VerifyToken, async (req, res) => {
    const userId = req.userId
    const user = await User.findOne({ _id: userId }).exec()
    if (!user['stripe']['connects']['accountId'] || !user['stripe']['connects']['bankId'])
        return res.send({ success: false, message: '' })
    try {
        const response = await get_bank_account(user['stripe']['connects']['accountId'], user['stripe']['connects']['bankId'])
        res.send({ success: true, message: response })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

var get_card = async (accountId, cardId) => {
    return new Promise((resolve, reject) => {
        stripe.accounts.retrieveExternalAccount(
            accountId,
            cardId,
            function (err, card) {
                if (err)
                    return reject(err)
                resolve(card)
            }
        );
    })
}

router.get('/get-card', VerifyToken, async (req, res) => {
    const userId = req.userId
    try {
        const user = await User.findOne({ _id: userId }).exec()
        if (!user['stripe']['connects']['accountId'] || !user['stripe']['connects']['cardId'])
            return res.send({ success: false, message: '' })
        const response = await get_card(user['stripe']['connects']['accountId'], user['stripe']['connects']['cardId'])
        res.send({ success: true, message: response })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }
})

var transfer = async (accountId) => {
    return new Promise((resolve, reject) => {
        stripe.transfers.create(
            {
                amount: 400,
                currency: 'usd',
                destination: accountId,
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

router.get('/transfer', async (req, res) => {
    try {
        const response = await transfer('acct_1GpJOLGmQq5qZiig')
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }
})

var payout = async (accountId, source) => {
    return new Promise(async (resolve, reject) => {
        try {
            const payout = await stripe.payouts.create({
                amount: 30,
                currency: 'usd',
                source_type: source
            }, {
                stripeAccount: accountId,
            });
            resolve(payout)
        } catch (error) {
            reject(error)
        }
    })
}

router.get('/payout', async (req, res) => {
    try {
        const response = await payout('acct_1GpJOLGmQq5qZiig', 'card')
        res.send(response)
    } catch (error) {
        res.send(error)
    }
})

var get_account_balance = async (accountId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const balance = await stripe.balance.retrieve({
                stripeAccount: accountId
            });
            resolve(balance)
        } catch (error) {
            reject(err)
        }
    })
}

router.get('/get-balance', async (req, res) => {
    try {
        const response = await get_account_balance('acct_1GpJOLGmQq5qZiig')
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }
})

router.post("/create-payment-intent", VerifyToken, async (req, res) => {
    const userId = req.userId
    const { amount, currency, description } = req.body;
    const final_amount = Math.round(amount * 100);
    console.log(req.body)
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: final_amount,
            currency,
            description: 'Zipcoin Exchange',
            payment_method_types: ['card'],
            metadata: { integration_check: 'accept_a_payment' },
        })
        const percent = new BigNumber(parseFloat((4.5 / PERCENTAGE).toPrecision(2)))
        let fees = new BigNumber(amount * percent).toNumber().toFixed(2);
        console.log(`Fees =>${fees}`)
        var deposit_amount = new BigNumber(amount - fees).toNumber().toFixed(2)
        console.log(`withdrawamount=>${deposit_amount}`)
        deposit_amount = (parseFloat(deposit_amount) * PERCENTAGE).toFixed(2)
        console.log(deposit_amount)
        console.log('Creating depositing slip')
        await Deposit.create({
            state: 'pending',
            userId: userId,
            paymentId: paymentIntent['id'],
            currency,
            amount,
            fee:fees,
            type: 'fait'
        })
        return res.send({
            publishableKey: 'sk_live_8K05uXtbFRznx1EXhsXqeZj1',
            clientSecret: paymentIntent.client_secret
        });

    } catch (e) {
        console.log(e)
        return res.send({ success: false, message: e.message })
    }
});

router.get('/get-account-balance', VerifyToken, async (req, res) => {
    const userId = req.userId
    const user = await User.findOne({ _id: userId }).exec()
    const accountId = user['stripe']['connects']['accountId']
    const balance = await stripe.balance.retrieve({
        stripeAccount: accountId
    });
    console.log(balance)
    res.send({ balance: balance['instant_available'] })
})
//========================== CUSTOMERS APIS =============================

var create_customer = async () => {
    return new Promise(async (resolve, reject) => {
        // let user = await User.findOne({ _id: userId }).exec()
        try {
            stripe.customers.create(
                {
                    name: 'Muhammmad Faisal',
                    email: 'pawot92250@qortu.com',
                    description: 'Zipcoin Exchange',
                    phone: '+923124277841'
                },
                async function (err, customer) {
                    if (err)
                        return reject(error)
                    // user['stripe']['customerId'] = customer['id']
                    // await user.save()
                    return resolve({ success: true })
                }
            );
            // await create_bank_account(user['stripe']['customerId'])
        } catch (error) {
            reject(error)
        }

    })
}

router.get('/create-customer', async (req, res) => {
    try {
        const response = await create_customer()
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }
})

var card_token = async () => {
    return new Promise((resolve, reject) => {
        stripe.tokens.create(
            {
                card: {
                    name: 'Muhammad Faisal',
                    number: '4000056655665556',
                    exp_month: 8,
                    exp_year: 2021,
                    cvc: '314',
                    currency: 'usd'
                },
            },
            function (err, token) {
                if (err)
                    return reject(err)
                resolve(token)
            }
        );
    })
}

var add_card = async () => {
    return new Promise(async (resolve, reject) => {
        // let user = await User.findOne({ _id: userId }).exec()
        const token = await card_token()
        stripe.customers.createSource(
            'cus_HOdPl9cI7UPbRV',
            {
                source: token.id
            },
            function (err, card) {
                console.log(err)
                if (err)
                    return reject(err)
                return resolve(card)
            }
        );
    })
}

router.get('/addcard', async (req, res) => {
    try {
        const response = await add_card()
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }
})

var bank_token = async () => {
    return new Promise(async (resolve, reject) => {
        stripe.tokens.create(
            {
                bank_account: {
                    country: 'US',
                    currency: 'usd',
                    account_holder_name: 'Muhammad Faisal',
                    account_holder_type: 'individual',
                    routing_number: '110000000',
                    account_number: '000123456789',
                },
            },
            function (err, token) {
                if (err)
                    return reject(err)
                return resolve(token)
            }
        );
    })
}

var add_ach_debit_bank = async () => {
    return new Promise(async (resolve, reject) => {
        const token = await bank_token()
        stripe.customers.createSource(
            'cus_HOdPl9cI7UPbRV',
            { source: token.id },
            function (err, bankAccount) {
                if (err)
                    return reject(err)
                return resolve(bankAccount)
            }
        );
    })
}

router.get('/add_bank_account', async (req, res) => {
    try {
        const response = await add_ach_debit_bank()
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }
})

var verify_bank_account = async () => {
    return new Promise((resolve, reject) => {
        stripe.customers.verifySource(
            'cus_HOdPl9cI7UPbRV',
            'ba_1GpqDtCIw1ih7BiZOPihWLVN',
            { amounts: [32, 45] },
            function (err, bankAccount) {
                if (err)
                    return reject(err)
                return resolve(bankAccount)
            }
        );
    })
}

router.get('/verify_bank', async (req, res) => {
    try {
        const response = await verify_bank_account()
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }

})

var charge_customers = async () => {
    return new Promise((resolve, reject) => {
        stripe.charges.create(
            {
                amount: 200,
                currency: 'usd',
                customer: 'cus_HOdPl9cI7UPbRV',
                source: 'ba_1GpqDtCIw1ih7BiZOPihWLVN',
                description: 'My First Test Charge (created for API docs)',
            },
            function (err, charge) {
                console.log(err)
                if (err)
                    return reject(err)
                return resolve(charge)
            }
        );
    })
}

router.get('/charge', async (req, res) => {
    try {
        const response = await charge_customers()
        res.send(response)
    } catch (error) {
        res.send(error.message)
    }

})

var check_verification_tiers = async (userId) => {
    return new Promise(async (resolve, reject) => {
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['utility_bill']['status'] = true
        await user.save()
        console.log(user)
        if (!user['emailStatus'] || !user['mobileStatus'])
            return reject(Error('Please complete your verification Teir-1'))
        if (!user['kyc']['front']['status'] || !user['kyc']['back']['status'] || !user['kyc']['signature']['status'] || !user['kyc']['selfie']['status'])
            return reject(Error('Please complete your verification Tier-2'))
        if (user['kyc']['detail']['status'] !== 'APPROVED' || !user['kyc']['utility_bill']['status'])
            return reject(Error('Please complete your verification Tier-3'))
        resolve()
    })
}

module.exports = router;
