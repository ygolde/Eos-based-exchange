
const express = require('express');
const fetch = require('node-fetch')
var router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

var moneris = require('moneris-node')({
    app_name: 'Zipcoin Exchange',
    store_id: 'gwca027677',
    api_token: 'J7FeahhoddRPJZitBqlG',
    crypt_type: '7',
    test: false
})


router.post('/pay', async (req, res) => {
    console.log(req.body)
    const { creditCard, cvc, expirationDate, amount } = req.body
    moneris.send()
    moneris.pay({
        amount: amount,
        card: creditCard,
        expiry: expirationDate,
        description: 'Zipcoin Exchange Deposit',
        //forceDecline: true,
    }).then((result) => {
        result.raw = undefined;
        console.log('--');
        console.log('Clean Response (passed):');
        console.log(result)
        return res.send({ success: true, message: result })
    })
        .catch((err) => {
            // err.raw = undefined;
            console.log('--');
            console.log('Clean Response (failed):');
            console.log(err);
            //console.log(err.raw);
            return res.send({ success: false, message: err['msg'] })
        })
})

router.post('/approved',(req,res)=>{
    console.log(req.body)
})

router.post('/decline', (req, res) => {
    console.log(req.body)
})

module.exports = router;