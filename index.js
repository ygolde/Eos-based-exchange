const HTTP = require('http');
var jwt = require('jsonwebtoken');
const Admin = require('./websockets/admin');
const Orders = require('./websockets/orders');
const express = require('express');
const cors = require('cors')
const app = express();
require('./helpers/db')
require('dotenv').config()
var http = HTTP.createServer(app)

var io = require('socket.io')(http, {
    path: '/ws'
});

var matching_server = require("socket.io-client")('http://localhost:8100');

var ws = {
    allSockets: []
};

// var { set_params, proccess_coincap_prices } = require('./helpers/coincap')
// set_params('b25d2a42-86bb-4b42-8621-b01169b48e84', io)
// proccess_coincap_prices()
// const MatchingEngine = require('./controllers/matchingController')

app.set('trust proxy', 'loopback')
app.use(cors())
app.use(express.json())
app.use(
    express.json({
        verify: function (req, res, buf) {
            if (req.originalUrl.startsWith('/webhook')) {
                req.rawBody = buf.toString();
            }
        },
    })
);

io.use((socket, next) => {
    let token = socket.handshake.query.token;
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }
    jwt.verify(token, process.env.ENCRYPTION_SECRET, function (err, decoded) {
        if (err)
            next(new Error('Invalid token!'));
        socket.userId  = decoded.id;
        next();
    });
});


const kycController = require('./controllers/kycController')
const authController = require('./auth/AuthController');
const adminController = require('./controllers/adminController')
const totpController = require('./auth/totpController');
const chartsController = require('./controllers/chartsController');
const stripeController = require('./controllers/stripeController');
const monerisController = require('./controllers/monerisController');
const ordersController = require('./controllers/ordersController')
const supportController = require('./controllers/support')
const apiKeyController = require('./controllers/apikey')
const coinController = require('./controllers/coinController')
const publicController = require('./controllers/publicController')
const pairsController = require('./controllers/pairController')
const addressController = require('./controllers/addressController')
const balanceController = require('./controllers/balanceController')
const transactionController = require('./controllers/transactionController')
const rateController = require('./controllers/currency-layerController')
const locationController = require('./controllers/geoLocation')

app.use('/api/users', authController);
app.use('/api/admin', adminController);
app.use('/api/totp', totpController)
app.use('/api/kyc', kycController)  //KYC API
app.use('/api/chart', chartsController) // CHART API
app.use('/api/stripe', stripeController) //STRIPE API
app.use('/api/moneris', monerisController) //MONERIS API
app.use('/api/public', publicController) // PUBLIC API
app.use('/api/support', supportController); //SUPPORT API
app.use('/api/apiKey', apiKeyController) //APIKEY API
app.use('/api/coin', coinController) //COIN API
app.use('/api/pair', pairsController) //PAIRS API
app.use('/api/order', ordersController) //ORDER API
app.use('/api/address', addressController) //ADDRESS API
app.use('/api/balance', balanceController) //BALANCE API
app.use('/api/transaction', transactionController) //TRANSACTION API
app.use('/api/currency', rateController) //CURRENCY LAYER API
app.use('/api/location', locationController) //GEO-LOCATION API

app.get('/api', async (req, res) => {
    res.send('Server working')
})

// MatchingEngine();
process.on('unhandledRejection', error => {
    console.log(error.message);
});

http.listen(4000, () => {
    console.log('listening on *:4000');
});

io.sockets.on('connection', function (socket) {
    var eventHandlers = {
        admin: new Admin(app, socket),
        orders: new Orders(socket, matching_server)
    };
    for (var category in eventHandlers) {
        var handler = eventHandlers[category].handler;
        for (var event in handler) {
            socket.on(event, handler[event]);
        }
    }
    ws.allSockets.push(socket);
});
