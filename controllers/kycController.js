const express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
var fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config()
const multer = require('multer');
const fetch = require('node-fetch')
var voucher_codes = require('voucher-code-generator');
const LOGS = require('../models/error-logs')
const User = require('../models/User.js')
const SYSTEM = require('../models/system')
var VerifyToken = require('../auth/VerifyToken');
const { MESSAGE } = require('../helpers/messages')
const TwoFactor = new (require('2factor'))('d03ce752-7c1e-11e9-ade6-0200cd936042')
const OTP_API = 'd03ce752-7c1e-11e9-ade6-0200cd936042'
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const server = 'https://dev.zipcoin.exchange'
// const server = 'http://localhost:4000'

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})
var limits = {
    files: 1,
    fileSize: 2 * 1024 * 1024,
};

var fileFilter = function (req, file, cb) {
    // supported image file mimetypes
    var allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png'];

    if (allowedMimes.includes(file.mimetype)) {
        // allow supported image files
        cb(null, true);
    } else {
        // throw error for invalid files
        cb(new Error('Invalid file type. Only jpg and png image files are allowed.'));
    }
};

var upload = multer({
    storage,
    limits,
    fileFilter
}).single('file')

var document_upload = multer({
    storage,
    limits,
    fileFilter
}).single('UploadFiles')

var uploadImage = async (req, res) => {
    return new Promise((resolve) => {
        upload(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                return resolve({ success: false, message: err.message })
            } else if (err) {
                return resolve({ success: false, message: err.message })
            }
            const file = req.file
            let image = {
                name: file.filename,
                contentType: req.file.mimetype,
                image: `${server}/api/kyc/getImageByName?name=` + file.filename
            }
            return resolve({ success: true, image })
        })
    })
}

router.post('/user_kyc_status', async (req, res) => {
    const { username, status } = req.body
    var user = await User.findOne({ username }).exec()
    user['kyc']['detail']['status'] = status
    await user.save()
    res.send({ success: true, message: 'KYC status updated successfully' })
})

router.post('/user_account_status', async (req, res) => {
    const { username, status } = req.body
    var user = await User.findOne({ username }).exec()
    user['status'] = status
    await user.save()
    res.send({ success: true, message: 'status updated successfully' })
})

router.post('/general', VerifyToken, async (req, res) => {
    const userId = req.userId;
    let user = await User.findOne({ _id: userId }).exec()
    if (user) {
        user.personalInfo = req.body;
        await user.save();
        return res.send({ success: true, message: MESSAGE.M_PROFILEUPDATE })
    }
    return res.send({ success: false, message: MESSAGE.M_USRNOTFOUND })
})

router.post('/identity', VerifyToken, async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.send({ success: false, message: err.message })
        } else if (err) {
            return res.send({ success: false, message: err.message })
        }
        const { username, document } = req.body;
        const file = req.file
        if (!file)
            return res.send({ success: false, message: MESSAGE.M_IDPROOFS })
        var img = fs.readFileSync(file.path);
        var encode_image = img.toString('base64');
        let image = {
            contentType: req.file.mimetype,
            image: new Buffer(encode_image, 'base64')
        }
        let user = await User.findOne({ username }).exec()
        if (user.kyc.front.image === "") {
            if (!document) return res.send({ success: false, message: MESSAGE.M_PROVIDEDOC })
            user.kyc.front = image;
            if (!user.kyc.detail.documentType) return res.send({ success: false, message: MESSAGE.M_DOCTYPE })
            user.kyc.detail.documentType = document.documentType;
            if (!user.kyc.detail.documentNumber) return res.send({ success: false, message: MESSAGE.M_DOCNUM })
            user.kyc.detail.documentNumber = document.documentNumber;
            if (!user.kyc.detail.issueDate) return res.send({ success: false, message: MESSAGE.M_DOCISSUE })
            user.kyc.detail.issueDate = document.issueDate;
            if (!user.kyc.detail.expiryDate) return res.send({ success: false, message: MESSAGE.M_DOCEXPIRY })
            user.kyc.detail.expiryDate = document.expiryDate;
            if (!user.kyc.detail.expireCheck) return res.send({ success: false, message: MESSAGE.M_DOCCHECK })
            user.kyc.detail.expireCheck = document.expireCheck
            if (!user.kyc.detail.address) return res.send({ success: false, message: MESSAGE.DOCADDR })
            user.kyc.detail.address = document.address
            await user.save();
            return res.send({ success: true, message: "Image uploaded" })
        }
        if (user.kyc.back.image === "") {
            if (user.kyc.front.image === "") return res.send({ success: false, message: MESSAGE.M_FRONTDATA })
            user.kyc.back = image;
            await user.save()
            return res.send({ success: true, message: "Image uploaded" })
        }
        return res.send({ success: true, message: MESSAGE.M_PROOFEXIST })
    })
})

router.post('/proofs', VerifyToken, async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.send({ success: false, message: err.message })
        } else if (err) {
            return res.send({ success: false, message: err.message })
        }
        const type = req.body.type;
        console.log(type)
        const username = req.body.username
        if (!type || typeof type != 'string')
            return res.send({ success: false, message: MESSAGE.M_VALIDTYPE })
        if (!username || typeof username != 'string')
            return res.send({ success: false, message: MESSAGE.M_USERERR })

        const file = req.file
        if (!file)
            return res.send({ success: false, message: MESSAGE.M_ATTACHPROOF })
        var img = fs.readFileSync(file.path);
        var encode_image = img.toString('base64');
        let image = {
            contentType: req.file.mimetype,
            image: new Buffer(encode_image, 'base64')
        }
        let user = await User.findOne({ username }).exec()

        switch (type) {
            case 'signature':
                user.kyc.signature = image;
                user.save()
                return res.send({ success: true, message: MESSAGE.M_SIGN })
            case 'selfie':
                user.kyc.selfie = image;
                user.save()
                return res.send({ success: true, message: MESSAGE.M_SELFIE })
            default:
                return res.send({ success: false, message: `${type} type of document not supported` })
        }
    })
})

router.post('/uploadProfileImage', VerifyToken, async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.send({ success: false, message: err.message })
        } else if (err) {
            return res.send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        // console.log(file)
        let image = {
            contentType: req.file.mimetype,
            image: `${server}/api/kyc/getImageByName?name=` + file.filename
        }
        // console.log(image)
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user.image = image;
        console.log(user)
        await user.save()
        return res.send({ success: true, message: "Upload successfully" })
    })
})

router.post('/set-wallet-withdraw-address', VerifyToken, async (req, res) => {
    console.log(req.body)
    const { address, coin, username } = req.body
    if (!address)
        return res.send({ success: false, message: 'Please provide required parameter' })
    if (typeof address != 'string')
        return res.send({ success: false, message: 'Address must be a valid string' })
    let user = await User.findOne({ username }).exec()
    if (!user)
        return res.send({ success: false, message: 'User does not exist' })
    user['wallets'][`${coin}`]['withdrawAddress'] = address
    await user.save()
    res.send({ success: true, message: "Withdraw address successfully added" })
})

router.post('/set-eos-setting', VerifyToken, async (req, res) => {
    const { nodeUrl, walletUrl, netstake, cpustake, chainId, privatekey, eos_account } = req.body;
    let oldSettings = await SYSTEM.find({})
    if (!oldSettings.length) {
        await SYSTEM.create({
            "eos_settings": {
                nodeUrl,
                walletUrl,
                netstake,
                cpustake,
                chainId,
                privatekey,
                eos_account
            }
        })
        return res.send({ success: true, message: 'Setting successfully updated' })

    }

    oldSettings[0]['eos_settings']['nodeUrl'] = nodeUrl || oldSettings[0]['eos_settings']['nodeUrl']
    oldSettings[0]['eos_settings']['walletUrl'] = walletUrl || oldSettings[0]['eos_settings']['walletUrl']
    oldSettings[0]['eos_settings']['netstake'] = netstake + ' EOS' || oldSettings[0]['eos_settings']['netstake']
    oldSettings[0]['eos_settings']['cpustake'] = cpustake + ' EOS' || oldSettings[0]['eos_settings']['spustake']
    oldSettings[0]['eos_settings']['chainId'] = chainId || oldSettings[0]['eos_settings']['chainId']
    oldSettings[0]['eos_settings']['privatekey'] = privatekey || oldSettings[0]['eos_settings']['privatekey']
    oldSettings[0]['eos_settings']['eos_account'] = eos_account || oldSettings[0]['eos_settings']['eos_account']

    await oldSettings[0].save()
    res.send({ success: true, message: 'Setting successfully updated' })
})

router.get('/get-eos-settings', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    let settings = await SYSTEM.find({})
    settings = settings[0]
    return res.send({ success: true, settings: settings['eos_settings'] })

})

router.post('/set-social-settings', VerifyToken, async (req, res) => {
    const { facebook, twitter, instagram, linkedin,
        showFacebook, showTwitter, showInstagram, showLinkedin
    } = req.body;
    let oldSettings = await SYSTEM.find({})
    if (!oldSettings.length) {
        await SYSTEM.create({
            "socialLinks": {
                facebook,
                twitter,
                instagram,
                linkedin,
                showFacebook,
                showTwitter,
                showInstagram,
                showLinkedin
            }
        })
        return res.send({ success: true, message: 'Setting successfully updated' })
    }

    oldSettings[0]['socialLinks']['facebook'] = facebook || oldSettings[0]['socialLinks']['facebook']
    oldSettings[0]['socialLinks']['twitter'] = twitter || oldSettings[0]['socialLinks']['twitter']
    oldSettings[0]['socialLinks']['instagram'] = instagram || oldSettings[0]['socialLinks']['instagram']
    oldSettings[0]['socialLinks']['linkedin'] = linkedin || oldSettings[0]['socialLinks']['linkedin']
    oldSettings[0]['socialLinks']['showFacebook'] = showFacebook
    oldSettings[0]['socialLinks']['showTwitter'] = showTwitter
    oldSettings[0]['socialLinks']['showInstagram'] = showInstagram
    oldSettings[0]['socialLinks']['showLinkedin'] = showLinkedin
    await oldSettings[0].save()
    res.send({ success: true, message: 'Setting successfully updated' })
})

router.get('/get-social-settings', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    let settings = await SYSTEM.find({})
    settings = settings[0]
    return res.send({ success: true, settings: settings['socialLinks'] })
})

router.post('/set-contact-settings', VerifyToken, async (req, res) => {
    const { contactPhone, contactEmail, contactAddress,
        showContactPhone, showContactEmail, showContactAddress
    } = req.body;
    let oldSettings = await SYSTEM.find({})
    if (!oldSettings.length) {
        await SYSTEM.create({
            "contact_settings": {
                contactPhone,
                contactEmail,
                contactAddress,
                showContactPhone,
                showContactEmail,
                showContactAddress
            }
        })
        return res.send({ success: true, message: 'Setting successfully updated' })
    }

    oldSettings[0]['contact_settings']['contactPhone'] = contactPhone || oldSettings[0]['contact_settings']['contactPhone']
    oldSettings[0]['contact_settings']['contactEmail'] = contactEmail || oldSettings[0]['contact_settings']['contactEmail']
    oldSettings[0]['contact_settings']['contactAddress'] = contactAddress || oldSettings[0]['contact_settings']['contactAddress']
    oldSettings[0]['contact_settings']['showContactPhone'] = showContactPhone
    oldSettings[0]['contact_settings']['showContactEmail'] = showContactEmail
    oldSettings[0]['contact_settings']['showContactAddress'] = showContactAddress
    await oldSettings[0].save()
    res.send({ success: true, message: 'Setting successfully updated' })
})

router.get('/get-contact-settings', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    let settings = await SYSTEM.find({})
    settings = settings[0]
    return res.send({ success: true, settings: settings['contact_settings'] })
})

router.post('/set-general-settings', VerifyToken, async (req, res) => {
    const { websiteTitle, emailVerification, smsVerification, phoneVerification } = req.body
    let oldSettings = await SYSTEM.find({})
    if (!oldSettings.length) {
        await SYSTEM.create({
            "general_settings": {
                websiteTitle,
                emailVerification,
                smsVerification,
                phoneVerification
            }
        })
        return res.send({ success: true, message: 'Setting successfully updated' })
    }

    oldSettings[0]['general_settings']['websiteTitle'] = websiteTitle || oldSettings[0]['general_settings']['websiteTitle']
    oldSettings[0]['general_settings']['emailVerification'] = emailVerification || oldSettings[0]['general_settings']['emailVerification']
    oldSettings[0]['general_settings']['smsVerification'] = smsVerification || oldSettings[0]['general_settings']['smsVerification']
    oldSettings[0]['general_settings']['phoneVerification'] = phoneVerification || oldSettings[0]['general_settings']['phoneVerification']
    await oldSettings[0].save()
    res.send({ success: true, message: 'Setting successfully updated' })
})

router.get('/get-general-settings', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    let settings = await SYSTEM.find({})
    settings = settings[0]
    return res.send({ success: true, settings: settings['general_settings'] })
})

router.post('/set-save-logo-image', VerifyToken, async (req, res) => {
    let response = await uploadImage(req, res)
    if (!response['success'])
        return res.send(response)
    let oldSettings = await SYSTEM.find({})
    oldSettings[0]['general_settings']['websiteLogo']['name'] = response['image']['name']
    oldSettings[0]['general_settings']['websiteLogo']['image'] = response['image']['image']
    oldSettings[0]['general_settings']['websiteLogo']['contentType'] = response['image']['contentType']
    await oldSettings[0].save()
    res.send({ success: true, message: 'Setting successfully updated' })
})

router.post('/set-save-favicon-image', VerifyToken, async (req, res) => {
    let response = await uploadImage(req, res)
    if (!response['success'])
        return res.send(response)
    let oldSettings = await SYSTEM.find({})
    oldSettings[0]['general_settings']['websiteFavicon']['name'] = response['image']['name']
    oldSettings[0]['general_settings']['websiteFavicon']['image'] = response['image']['image']
    oldSettings[0]['general_settings']['websiteFavicon']['contentType'] = response['image']['contentType']
    await oldSettings[0].save()
    res.send({ success: true, message: 'Setting successfully updated' })
})

router.post('/websiteSettings', async (req, res) => {
    const { title, logo, favicon, emailVerification,
        smsVerification, phoneVerification } = req.body
    if (!title || !logo || !favicon || !emailVerification
        || !smsVerification || !phoneVerification)
        return res.send({ success: false, message: 'Please provide required parameters' })
    if (typeof title != 'string')
        return res.send({ success: false, message: 'Title must be a valid string' })
    if (typeof smsVerification != 'boolean')
        return res.send({ success: false, message: 'smsVerification must a boolean' })
    if (typeof emailVerification != 'boolean')
        return res.send({ success: false, message: 'emailVerification must be a boolean' })
    if (typeof phoneVerification != 'boolean')
        return res.send({ success: false, message: 'phoneVerification must be a boolean' })

})

router.post('/set-withdraw-address/:coin', async (req, res) => {
    const { address } = req.body
    const { coin } = req.params
    if (!address || !coin)
        return res.send({ success: false, message: 'Please provide required parameters' })
    if (typeof address != 'string')
        return res.send({ success: false, message: 'Address must be a string' })
    if (typeof coin != 'string')
        return res.send({ success: false, message: 'Coin must be a string' })
    let oldSettings = await SYSTEM.find({})
    oldSettings[0]['withdrawAddress'][`${coin}`] = address
    await oldSettings[0].save()
    res.send({ success: true, message: 'Setting successfully updated' })
})

router.get('/get-withdraw-address', async (req, res) => {
    let oldSettings = await SYSTEM.find({})
    res.send({ success: true, message: oldSettings[0]['withdrawAddress'] })
})

router.get('/getDummyImage', async (req, res) => {
    console.log('---------------GetDummyImage-----------------')
    res.setHeader('Content-Type', 'image/png');
    fs.createReadStream(`uploads/dummy.png`).pipe(res);
})

router.get('/getProfileImage', async (req, res) => {
    console.log('-------------GettProfileImage-------------')
    let Id = req.userId;
    if (req.query.userId)
        Id = req.query.userId;

    let user = await User.findOne({ _id: Id }).exec()
    res.setHeader('Content-Type', user.image['contentType']);
    fs.createReadStream(user.image['image']).pipe(res);
})

router.get('/getImageByName', async (req, res) => {
    console.log('------------------GetImageByName---------------------')
    console.log(req.query.name)
    res.setHeader('Content-Type', 'image/png');
    fs.createReadStream('uploads/' + req.query.name).pipe(res);
})

router.get('/getUnverifiedUser', VerifyToken, VerifyToken, async (req, res) => {
    console.log('-----------------------getUnverifiedUser')
    let users = await User.find({ $or: [{ "kyc.detail.verified": false }, { "kyc.signature.verified": false }, { "kyc.selfie.verified": false }] })
    if (!users.length)
        return res.send({ success: true, message: "No record found" })
    return res.send({ success: true, message: users })
})




//======================================== USER KYC APIS =============================================

router.get('/get_user_basic_info', VerifyToken, async (req, res) => {
    console.log('get_user_basic_info')
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    console.log(userId)
    let user = await User.findOne({ _id: userId })
    let { email, personalInfo, mobile, username, image, account, refferral_code, isOTP, isTFA, mobileStatus } = user
    personalInfo['country'] = code_to_name[`${personalInfo['country']}`]
    return res.send({ success: true, info: { username, email, image, personalInfo, account, refferral_code, isOTP, isTFA, mobileStatus, mobile: mobile['internationalNumber'] } })
})

router.post('/update_user_password', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })

    const { current, password, confirm_password } = req.body
    if (password !== confirm_password)
        return res.send({ success: false, message: 'Please match your password' })

    var user = await User.findOne({ _id: userId }).exec()
    const previous_password = user['password']
    const previous_hashed_password = bcrypt.hashSync(current, bcrypt.genSaltSync(8), null);
    if (previous_password !== previous_hashed_password)
        return res.send({ success: false, message: 'Password is incorrect' })

    const re = [/[0-9]/, /[a-z]/, /[A-Z]/]
    if (password.length < 8)
        return res.send({ success: false, message: MESSAGE.M_PASSLEN })
    if (!re[0].test(password))
        return res.send({ success: false, message: MESSAGE.M_PASSNUM })
    if (!re[1].test(password))
        return res.send({ success: false, message: MESSAGE.M_PASSSM })
    if (!re[2].test(password))
        return res.send({ success: false, message: MESSAGE.M_PASSCAP })

    const hashed_password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    user['password'] = hashed_password
    await user.save()
    res.send({ success: true, message: 'Password successfully changed' })
})

router.post('/save_user_document', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const { type, number, address, issue_date, expiry_date, bill_expiry_date } = req.body
    const issue = new Date(issue_date)
    const expire = new Date(expiry_date)
    const total = (expire.getFullYear() - issue.getFullYear()) * 12 + (expire.getMonth() - issue.getMonth())
    if (total < 9)
        return res.send({ success: false, message: 'Document must have expiry date more than 9 months' })
    var user = await User.findOne({ _id: userId }).exec()
    user['kyc']['detail']['documentType'] = type
    user['kyc']['detail']['documentNumber'] = number
    user['kyc']['detail']['issueDate'] = issue_date
    user['kyc']['detail']['expiryDate'] = expiry_date
    user['kyc']['detail']['documentAddress'] = address
    user['kyc']['utility_bill']['expiry_date'] = bill_expiry_date
    user['kyc']['detail']['expireCheck'] = false
    await user.save()

    res.send({ success: true, message: 'Document Details successfully updated' })

})

router.get('/get-user-document', VerifyToken, async (req, res) => {
    const userId = req.userId
    const user = await User.findOne({ _id: userId }).exec()
    res.send({ id: user['kyc']['detail'], bill: user['kyc']['utility_bill'] })
})

router.post('/save-selfie-side', VerifyToken, (req, res) => {
    console.log('save-selfie-side')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'SAVE SELFIE DOCUMENT',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        let image = {
            contentType: req.file.mimetype,
            image: `${server}/api/kyc/getImageByName?name=` + file.filename
        }
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['selfie']['image'] = image['image'];
        user['kyc']['selfie']['contentType'] = image['contentType'];
        await user.save()
        return res.end()
    })
})

router.post('/remove-selfie-side', VerifyToken, (req, res) => {
    console.log('remove-selfie-side')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'REMOVE SELFIE DOCUMENT',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['selfie']['image'] = '';
        user['kyc']['selfie']['contentType'] = '';
        user['kyc']['selfie']['status'] = false;
        user['kyc']['selfie']['reason'] = '';
        await user.save()
        return res.end()
    })
})

router.post('/save-front-side', VerifyToken, (req, res) => {
    console.log('save-front-side')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'SAVE FRONT SIDE',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        let image = {
            contentType: req.file.mimetype,
            image: `${server}/api/kyc/getImageByName?name=` + file.filename
        }
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['front']['image'] = image['image'];
        user['kyc']['front']['contentType'] = image['contentType'];
        await user.save()
        return res.end()
    })
})

router.post('/remove-front-side', VerifyToken, (req, res) => {
    console.log('remove-front-side')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'REMOVE FRONT SIDE DOCUMENT',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['front']['image'] = '';
        user['kyc']['front']['contentType'] = '';
        user['kyc']['front']['status'] = false;
        user['kyc']['front']['reason'] = '';
        await user.save()
        return res.end()
    })
})

router.post('/save-back-side', VerifyToken, (req, res) => {
    console.log('save-back-side')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'SAVE BACK SIDE',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        let image = {
            contentType: req.file.mimetype,
            image: `${server}/api/kyc/getImageByName?name=` + file.filename
        }
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['back']['image'] = image['image'];
        user['kyc']['back']['contentType'] = image['contentType'];
        await user.save()
        return res.end()
    })
})

router.post('/remove-back-side', VerifyToken, (req, res) => {
    console.log('remove-back-side')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'REMOVE BACK SIDE DOCUMENT',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['back']['image'] = '';
        user['kyc']['back']['contentType'] = '';
        user['kyc']['back']['status'] = false;
        user['kyc']['back']['reason'] = '';
        await user.save()
        return res.end()
    })
})

router.post('/save-profile', VerifyToken, (req, res) => {
    console.log('save-profile-image')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'SAVE PROFILE IMAGE',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        let image = {
            contentType: req.file.mimetype,
            image: `${server}/api/kyc/getImageByName?name=` + file.filename
        }
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['image']['image'] = image['image'];
        user['image']['contentType'] = image['contentType'];
        await user.save()
        return res.end()
    })
})

router.post('/remove-profile', VerifyToken, (req, res) => {
    console.log('remove-profile')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'REMOVE PROFILE IMAGE',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['image']['image'] = '';
        user['image']['contentType'] = '';
        await user.save()
        return res.end()
    })
})

router.post('/save-utility-bill', VerifyToken, (req, res) => {
    console.log('save-utility-bill')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'SAVE UTILITY BILL',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        const file = req.file
        let image = {
            contentType: req.file.mimetype,
            image: `${server}/api/kyc/getImageByName?name=` + file.filename
        }
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['utility_bill']['image'] = image['image'];
        user['kyc']['utility_bill']['contentType'] = image['contentType'];
        await user.save()
        return res.end()
    })
})

router.post('/remove-utility-bill', VerifyToken, (req, res) => {
    console.log('remove-utility-bill')
    document_upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            await LOGS.create({
                type: 'REMOVE UTILITY BILL',
                detail: err
            })
            return res.status(400).send({ success: false, message: err.message })
        } else if (err) {
            return res.status(400).send({ success: false, message: err.message })
        }
        const userId = req.userId;
        console.log(userId)
        let user = await User.findOne({ _id: userId }).exec()
        user['kyc']['utility_bill']['image'] = '';
        user['kyc']['utility_bill']['contentType'] = '';
        await user.save()
        return res.end()
    })
})

router.post('/change-email', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const { email } = req.body
    let user = await User.findOne({ _id: userId }).exec()
    const previous_email = user['email']
    if (previous_email === email)
        return res.send({ success: false, message: 'Please enter a new email address' })
    user['email'] = email
    user['emailStatus'] = false
    await user.save()
    res.send({ success: true, message: 'Email successfully updated' })
})

router.get('/remove-mobile', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const user = await User.findOne({ _id: userId }).exec()
    user['mobile']['number'] = ''
    user['mobile']['internationalNumber'] = ''
    user['mobile']['nationalNumber'] = ''
    user['mobile']['dialCode'] = ''
    user['mobile']['countryCode'] = ''
    user['mobile']['id'] = ''
    await user.save()
    res.send({ success: true, message: 'Mobile number successfully removed' })
})

router.get('/send-sms-otp', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const user = await User.findOne({ _id: userId }).exec()
    if (!user['mobile']['internationalNumber'])
        return res.send({ isNumber: false })
    try {
        const number = user['mobile']['internationalNumber'].replace(/ /g, '')
        fetch(`http://2factor.in/API/V1/${OTP_API}/SMS/${number}/AUTOGEN`, {
            method: 'get',
            headers: { "content-type": "application/x-www-form-urlencoded" },
        })
            .then(res => res.json())
            .then(async json => {
                console.log(json['Details'])
                user['phone_code'] = json['Details']
                await user.save()
                res.send({ success: true, message: 'SMS sent to your number' })
            })
    } catch (error) {
        res.send({ success: false, message: error.message })
    }

})

router.get('/toggle-otp-authentication', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const user = await User.findOne({ _id: userId }).exec()
    user['isOTP'] = !user['isOTP']
    if (user['isOTP'])
        user['isTFA'] = false
    await user.save()
    res.send({ success: true, message: 'Verification method has been updated' })
})

router.get('/toggle-tfa-authentication', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const user = await User.findOne({ _id: userId }).exec()
    user['isTFA'] = !user['isTFA']
    if (user['isTFA'])
        user['isOTP'] = false
    await user.save()
    res.send({ success: true, message: 'Verification method has been updated' })
})

router.get('/get-otp-sessionId', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const user = await User.findOne({ _id: userId }).exec()
    return res.send({ sessionId: user['phone_code'] })
})

router.post('/verify-otp', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    const { otp } = req.body
    const user = await User.findOne({ _id: userId }).exec()
    const sessionId = user['phone_code']
    fetch(`http://2factor.in/API/V1/${OTP_API}/SMS/VERIFY/${sessionId}/${otp}`, {
        method: 'get',
        headers: { "content-type": "application/x-www-form-urlencoded" },
    })
        .then(res => res.json())
        .then(async json => {
            console.log(json)
            if (json['Status'] === 'Success') {
                user['mobileStatus'] = true
                await user.save()
                return res.send({ success: true, message: 'Phone number verified successfully' })
            }
            else {
                return res.send({ success: true, message: 'Get new OTP and try again' })
            }
        });
})

router.post('/add-new-number', VerifyToken, async (req, res) => {
    const userId = req.userId
    if (!userId)
        return res.send({ success: false, message: 'User not found' })
    let user = await User.findOne({ _id: userId }).exec()
    const number = req.body
    console.log(number)
    user['mobile'] = number
    await user.save()
    res.send({ success: true, message: 'Mobile number suuccessfuly add' })
})

router.get('/get-verification-tiers', VerifyToken, async (req, res) => {
    try {
        const userId = req.userId
        const response = await get_verification_tiers(userId)
        res.send({ success: true, data: response })
    } catch (error) {
        res.send({ success: false, message })
    }
})

module.exports = router;

var get_verification_tiers = async (userId) => {
    return new Promise(async (resolve, reject) => {
        var data = {
            tier_one: true,
            tier_two: true,
            tier_three: true,
            email: false,
            mobile: false,
            front: false,
            back: false,
            signature: false,
            selfie: false,
            address: false
        }
        let user = await User.findOne({ _id: userId }).exec()
        if (!user['emailStatus'] || !user['mobileStatus'])
            data['tier_1'] = false
        if (!user['kyc']['front']['status'] || !user['kyc']['back']['status'] || !user['kyc']['signature']['status'] || !user['kyc']['selfie']['status'])
            data['tier_2'] = false
        if (user['kyc']['detail']['status'] !== 'APPROVED' || !user['kyc']['utility_bill']['status'])
            data['tier_3'] = false
        data['email'] = user['emailStatus']
        data['mobile'] = user['mobileStatus']
        data['front'] = user['kyc']['front']['status']
        data['back'] = user['kyc']['back']['status']
        data['signature'] = user['kyc']['signature']['status']
        data['selfie'] = user['kyc']['selfie']['status']
        data['address'] = user['kyc']['utility_bill']['status']
        resolve(data)
    })
}

router.get('/get-eos-memo', VerifyToken, async (req, res) => {
    const userId = req.userId
    let user = await User.findOne({ _id: userId }).exec()
    res.send({success:true,memo:user['wallets']['EOS']['memo']})
})

var code_to_name = {
    "AF": "Afghanistan",
    "AX": "Åland Islands",
    "AL": "Albania",
    "DZ": "Algeria",
    "AS": "American Samoa",
    "AD": "Andorra",
    "AO": "Angola",
    "AI": "Anguilla",
    "AQ": "Antarctica",
    "AG": "Antigua and Barbuda",
    "AR": "Argentina",
    "AM": "Armenia",
    "AW": "Aruba",
    "AU": "Australia",
    "AT": "Austria",
    "AZ": "Azerbaijan",
    "BS": "Bahamas",
    "BH": "Bahrain",
    "BD": "Bangladesh",
    "BB": "Barbados",
    "BY": "Belarus",
    "BE": "Belgium",
    "BZ": "Belize",
    "BJ": "Benin",
    "BM": "Bermuda",
    "BT": "Bhutan",
    "BO": "Bolivia, Plurinational State of",
    "BQ": "Bonaire, Sint Eustatius and Saba",
    "BA": "Bosnia and Herzegovina",
    "BW": "Botswana",
    "BV": "Bouvet Island",
    "BR": "Brazil",
    "IO": "British Indian Ocean Territory",
    "BN": "Brunei Darussalam",
    "BG": "Bulgaria",
    "BF": "Burkina Faso",
    "BI": "Burundi",
    "KH": "Cambodia",
    "CM": "Cameroon",
    "CA": "Canada",
    "CV": "Cape Verde",
    "KY": "Cayman Island",
    "CF": "Central African Republic",
    "TD": "Chad",
    "CL": "Chile",
    "CN": "China",
    "CX": "Christmas Island",
    "CC": "Cocos (Keeling) Islands",
    "CO": "Colombia",
    "KM": "Comoros",
    "CG": "Congo",
    "CD": "Congo, the Democratic Republic of the",
    "CK": "ook Islands",
    "CR": "Costa Rica",
    "CI": "Côte d'Ivoire",
    "HR": "Croatia",
    "CU": "Cuba",
    "CW": "Curaçao",
    "CY": "Cyprus",
    "CZ": "Czech Republic",
    "DK": "Denmark",
    "DJ": "Djibouti",
    "DM": "Dominica",
    "DO": "Dominican Republic",
    "EC": "Ecuador",
    "EG": "Egypt",
    "SV": "El Salvador",
    "GQ": "Equatorial Guinea",
    "ER": "Eritrea",
    "EE": "Estonia",
    "ET": "Ethiopia",
    "FK": "Falkland Islands (Malvinas)",
    "FO": "Faroe Islands",
    "FJ": "Fiji",
    "FI": "Finland",
    "FR": "France",
    "GF": "French Guiana",
    "PF": "French Polynesia",
    "TF": "French Southern Territories",
    "GA": "Gabon",
    "GM": "Gambia",
    "GE": "Georgia",
    "DE": "Germany",
    "GH": "Ghana",
    "GI": "Gibraltar",
    "GR": "Greece",
    "GL": "Greenland",
    "GD": "",
    "GP": "",
    "GU": "",
    "GT": "",
    "GG": "",
    "GN": "",
    "GW": "",
    "GY": "",
    "HT": "",
    "HM": "",
    "VA": "",
    "HN": "",
    "HK": "",
    "HU": "",
    "IS": "",
    "IN": "",
    "ID": "",
    "IR": "",
    "IQ": "Iraq",
    "IE": "Ireland",
    "IM": "Isle of Man",
    "IL": "Israel",
    "IT": "Italy",
    "JM": "Jamaica",
    "JP": "Japan",
    "JE": "Jersey",
    "JO": "Jordan",
    "KZ": "Kazakhstan",
    "KE": "Kenya",
    "KI": "Kiribati",
    "KP": "Korea, Democratic People's Republic of",
    "KR": "Korea, Republic of",
    "KW": "Kuwait",
    "KG": "Kyrgyzstan",
    "LA": "Lao People's Democratic Republic",
    "LV": "Latvia",
    "LB": "Lebanon",
    "LS": "Lesotho",
    "LR": "Liberia",
    "LY": "Libya",
    "LI": "Liechtenstein",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "MO": "Macao",
    "MK": "Macedonia, the former Yugoslav Republic of",
    "MG": "Madagascar",
    "MW": "Malawi",
    "MY": "Malaysia",
    "MV": "Maldives",
    "ML": "Mali",
    "MT": "Malta",
    "MH": "Marshall Islands",
    "MQ": "Martinique",
    "MR": "Mauritania",
    "MU": "Mauritius",
    "YT": "Mayotte",
    "MX": "Mexico",
    "FM": "Micronesia, Federated States of",
    "MD": "Moldova, Republic of",
    "MC": "Monaco",
    "MN": "Mongolia",
    "ME": "Montenegro",
    "MS": "Montserrat",
    "MA": "Morocco",
    "MZ": "Mozambique",
    "MM": "Myanmar",
    "NA": "Namibia",
    "NR": "Nauru",
    "NP": "Nepal",
    "NL": "Netherlands",
    "NC": "New Caledonia",
    "NZ": "New Zealand",
    "NI": "Nicaragua",
    "NE": "Niger",
    "NG": "Nigeria",
    "NU": "Niue",
    "NF": "Norfolk Island",
    "MP": "Northern Mariana Islands",
    "NO": "Norway",
    "OM": "Oman",
    "PK": "Pakistan",
    "PW": "Palau",
    "PS": "Palestinian Territory, Occupied",
    "PA": "Panama",
    "PG": "Papua New Guinea",
    "PY": "Paraguay",
    "PE": "Peru",
    "PH": "Philippines",
    "PN": "Pitcairn",
    "PL": "Poland",
    "PT": "Portugal",
    "PR": "Puerto Rico",
    "QA": "Qatar",
    "RE": "Réunion",
    "RO": "Romania",
    "RU": "Russian Federation",
    "RW": "Rwanda",
    "BL": "Saint Barthélemy",
    "SH": "Saint Helena, Ascension and Tristan da Cunha",
    "KN": "Saint Kitts and Nevis",
    "LC": "Saint Lucia",
    "MF": "Saint Martin (French part)",
    "PM": "Saint Pierre and Miquelon",
    "VC": "Saint Vincent and the Grenadines",
    "WS": "Samoa",
    "SM": "San Marino",
    "ST": "Sao Tome and Principe",
    "SA": "Saudi Arabia",
    "SN": "Senegal",
    "RS": "Serbia",
    "SC": "Seychelles",
    "SL": "Sierra Leone",
    "SG": "Singapore",
    "SX": "Sint Maarten (Dutch part)",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "SB": "Solomon Islands",
    "SO": "Somalia",
    "ZA": "South Africa",
    "GS": "South Georgia and the South Sandwich Islands",
    "SS": "South Sudan",
    "ES": "Spain",
    "LK": "Sri Lanka",
    "SD": "Sudan",
    "SR": "Suriname",
    "SJ": "Svalbard and Jan Mayen",
    "SZ": "Swaziland",
    "SE": "Sweden",
    "CH": "Switzerland",
    "SY": "Syrian Arab Republic",
    "TW": "Taiwan, Province of China",
    "TJ": "Tajikistan",
    "TZ": "Tanzania, United Republic of",
    "TH": "Thailand",
    "TL": "Timor-Leste",
    "TG": "Togo",
    "TK": "Tokelau",
    "TO": "Tonga",
    "TT": "Trinidad and Tobago",
    "TN": "Tunisia",
    "TR": "Turkey",
    "TM": "Turkmenistan",
    "TC": "Turks and Caicos Islands",
    "TV": "Tuvalu",
    "UG": "Uganda",
    "UA": "Ukraine",
    "AE": "United Arab Emirates",
    "GB": "United Kingdom",
    "US": "United States",
    "UM": "United States Minor Outlying Islands",
    "UY": "Uruguay",
    "UZ": "Uzbekistan",
    "VU": "Vanuatu",
    "VE": "Venezuela, Bolivarian Republic of",
    "VN": "Viet Nam",
    "VG": "Virgin Islands, British",
    "VI": "Virgin Islands, U.S.",
    "WF": "Wallis and Futuna",
    "EH": "Western Sahara",
    "YE": "Yemen",
    "ZM": "Zambia",
    "ZW": "Zimbabwe"

}

const send_sms = async (phoneNumber, otp, template) => {
    return new Promise((resolve, reject) => {
        TwoFactor.sendOTP(phoneNumber, { otp, template })
            .then((sessionId) => {
                console.log(sessionId)
                resolve(sessionId)
            },
                (err) => {
                    console.log(err)
                    reject(err)
                })
    })
}
