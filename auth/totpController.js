const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const router = express.Router();
const bodyParser = require('body-parser')
const User = require('../models/User.js')
const VerifyToken = require('./VerifyToken')
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/tfa/setup', VerifyToken, async (req, res) => {
    console.log(`DEBUG: Received TFA setup request`);
    var user = await User.findById({ _id: req.userId })
    if (user.TFA)
        return res.send({
            message: 'TFA Auth needs to be verified',
            tempSecret: user.TFA['secret'],
            dataURL: user.TFA['dataURL'],
            tfaURL: user.TFA['tfaURL']
        })  
    const secret = speakeasy.generateSecret({
        length: 10,
        name: user.username,
        issuer: 'Zipcoin Exchange'
    });
    var url = speakeasy.otpauthURL({
        secret: secret.base32,
        label: user.username,
        issuer: 'Zipcoin Exchange',
        encoding: 'base32'
    });
    QRCode.toDataURL(url, async (err, dataURL) => {
        user.TFA = {
            secret: '',
            tempSecret: secret.base32,
            dataURL,
            tfaURL: url
        };
        await user.save()
        return res.send({
            message: 'TFA Auth needs to be verified',
            tempSecret: secret.base32,
            dataURL: dataURL,
            tfaURL: secret.otpauth_url
        });
    });
});

router.get('/tfa/setup', VerifyToken, async (req, res) => {
    console.log(`DEBUG: Received FETCH TFA request`);
    const { userId } = req;
    let user = await User.findOne({ _id: userId })
    return res.send({ tfa: user.TFA, isOTP: user.isOTP })
});

router.delete('/tfa/setup', VerifyToken, async (req, res) => {
    var user = await User.findById({ _id: req.userId })
    user.TFA = {};
    user.isOTP = false;
    await user.save()
    res.send({
        "status": 200,
        "message": "success"
    });
});

router.post('/tfa/verify', VerifyToken, async (req, res) => {
    console.log(`DEBUG: Received TFA Verify request`);
    var user = await User.findById({ _id: req.userId })
    let isVerified = speakeasy.totp.verify({
        secret: user.TFA.tempSecret,
        encoding: 'base32',
        token: req.body.token
    });

    if (isVerified) {
        console.log(`DEBUG: TFA is verified to be enabled`);
        user.TFA['secret'] = user.TFA.tempSecret;
        user.isOTP = true;
        await user.save()
        return res.send({
            "status": 200,
            "message": "Two-factor Auth is enabled successfully"
        });
    }

    console.log(`ERROR: TFA is verified to be wrong`);

    return res.send({
        "status": 403,
        "message": "Invalid Auth Code, verification failed. Please verify the system Date and Time"
    });
});

module.exports = router;