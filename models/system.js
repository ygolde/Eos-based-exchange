var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const System = new Schema({
    general_settings: {
        websiteTitle: { type: String, default: '', required: false },
        websiteLogo: {
            name: { type: String, default: '', required: false },
            image: { type: String, default: '', required: false },
            contentType: { type: String, default: '', required: false }
        },
        websiteFavicon: {
            name: { type: String, default: '', required: false },
            image: { type: String, default: '', required: false },
            contentType: { type: String, default: '', required: false }
        },
        emailVerification: { type: Boolean, default: false, required: false },
        smsVerification: { type: Boolean, default: false, required: false },
        phoneVerification: { type: Boolean, default: false, required: false }
    },

    global_settings: {
        exchangeEmail: { type: String, required: false },
        exEmailPassword: { type: String, required: false },
        confirmationExpire: { type: Number, required: false },
        imageSizeLimit: { type: Number, required: false },
        tokenSecrete: { type: String, required: false },
        maxOrders: { type: String, required: false },
    },

    contact_settings: {
        contactPhone: { type: String, default: '', required: false },
        contactEmail: { type: String, default: '', required: false },
        contactAddress: { type: String, default: '', required: false },
        showContactPhone: { type: Boolean, default: false, required: false },
        showContactEmail: { type: Boolean, default: false, required: false },
        showContactAddress: { type: Boolean, default: false, required: false },
    },
    socialLinks: {
        facebook: { type: String, default: '', required: false },
        showFacebook: { type: Boolean, default: false, required: false },
        twitter: { type: String, default: '', required: false },
        showTwitter: { type: Boolean, default: false, required: false },
        instagram: { type: String, default: '', required: false },
        showInstagram: { type: Boolean, default: false, required: false },
        linkedin: { type: String, default: '', required: false },
        showLinkedin: { type: Boolean, default: false, required: false }
    },
    eos_settings: {
        nodeUrl: { type: String, maxlength: 255, required: false },
        walletUrl: { type: String, maxlength: 255, required: false },
        netstake: { type: String, maxlength: 25, default: '0.0000 EOS', required: false },
        cpustake: { type: String, maxlength: 25, default: '0.0000 EOS', required: false },
        chainId: { type: String, maxlength: 75, required: false },
        eos_account: { type: String, maxlength: 12, required: false },
        privatekey: { type: String, maxlength: 75, required: false },
    },
    api_keys: {
        mailchimp: { type: String, required: false },
        tawk_io: { type: String, required: false },
        sms: { type: String, required: false }
    },
    fees: {
        quicktrade: {
            maker: { type: Number, default: 0 },
            taker: { type: Number, default: 0 },
        },
        others: {
            deposit: { type: Number, default: 0 }, //Deposit fee to CAD/USD/GBP/EUR
            withdrawl: { type: Number, default: 0 },//Withdrawal to bank fee via email payment <Canada ONLY>
            transferFrom: { type: Number, default: 0 },//Transfer digital currency from one exchange to ZIPX
            transferTo: { type: Number, default: 0 },//Transfer from our ZIPX to another exchange
            marginfx: { type: Number, default: 0 },// Display coin price after deducting margin fees
            zipcxfee: { type: Number, default: 0 }, //Zipcoin exchange processing fee
        },
        zip: { type: Number },
        btc: { type: Number },
        eth: { type: Number },
        etc: { type: Number },
        eos: { type: Number },
        ltc: { type: Number },
        bch: { type: Number },
        xlm: { type: Number },
        xrp: { type: Number },
        dash: { type: Number }
    },
    btc: {
        load: { type: Boolean, default: false },
        logo: { type: String, default: 'assets/crypto/32/black/btc.png' },
        isSecure: { type: Boolean, default: false },
        mnemonic: { type: String, default: '' },
        root: {
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        account: {
            accountpath: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        change: {
            accountpath: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        }
    },
    eth: {
        load: { type: Boolean, default: false },
        logo: { type: String, default: 'assets/crypto/32/black/eth.png' },
        isSecure: { type: Boolean, default: false },
        mnemonic: { type: String, default: '' },
        root: {
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        account: {
            accountpath: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        bip32: {
            bip32path: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        }
    },
    etc: {
        load: { type: Boolean, default: false },
        logo: { type: String, default: 'assets/crypto/32/black/etc.png' },
        isSecure: { type: Boolean, default: false },
        mnemonic: { type: String, default: '' },
        root: {
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        account: {
            accountpath: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        bip32: {
            bip32path: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        }
    },
    ltc: {
        load: { type: Boolean, default: false },
        logo: { type: String, default: 'assets/crypto/32/black/ltc.png' },
        isSecure: { type: Boolean, default: false },
        mnemonic: { type: String, default: '' },
        root: {
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        account: {
            accountpath: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        bip32: {
            bip32path: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        }
    },
    dash: {
        load: { type: Boolean, default: false },
        logo: { type: String, default: 'assets/crypto/32/black/dash.png' },
        isSecure: { type: Boolean, default: false },
        mnemonic: { type: String, default: '' },
        root: {
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        account: {
            accountpath: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        bip32: {
            bip32path: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        }
    },
    xrp: {
        load: { type: Boolean, default: false },
        logo: { type: String, default: 'assets/crypto/32/black/xrp.png' },
        isSecure: { type: Boolean, default: false },
        mnemonic: { type: String, default: '' },
        root: {
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        account: {
            accountpath: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        },
        bip32: {
            bip32path: { type: String, default: '' },
            Xpub: { type: String, default: '' },
            Xpriv: { type: String, default: '' },
        }
    },
    xlm: {
        load: { type: Boolean, default: false },
        logo: { type: String, default: 'assets/crypto/32/black/xlm.png' },
        isSecure: { type: Boolean, default: false },
        mnemonic: { type: String, default: '' },
        seed: { type: String, default: '' },
        passphrase: { type: String, default: '' },
        publicKey: { type: String, default: '' },
        memo: { type: String, default: '' },
    },

    depositAddress: {
        btc: { type: String, default: '', required: false },
        eth: { type: String, default: '', required: false },
        etc: { type: String, default: '', required: false },
        ltc: { type: String, default: '', required: false },
        bch: { type: String, default: '', required: false },
        xlm: { type: String, default: '', required: false },
        xrp: { type: String, default: '', required: false },
        dash: { type: String, default: '', required: false }
    },
    withdrawAddress: {
        btc: { type: String, default: '', required: false },
        eth: { type: String, default: '', required: false },
        etc: { type: String, default: '', required: false },
        eos: { type: String, default: '', required: false },
        ltc: { type: String, default: '', required: false },
        bch: { type: String, default: '', required: false },
        xlm: { type: String, default: '', required: false },
        xrp: { type: String, default: '', required: false },
        dash: { type: String, default: '', required: false }
    }

});

module.exports = mongoose.model('System', System);
