const express = require('express');
var router = express.Router();
const SUPPORT = require('../models/support');
const { hash } = require('../helpers/encrypt')
const VerifyToken = require('../auth/VerifyToken')

router.post('/addTicket', VerifyToken, async (req, res) => {
    let response = await addTicket(req);
    return res.send(response);
})

router.post('/updateTicketStatus/:ticketId/:status', async (req, res) => {
    let response = await updateTicketStatus(req);
    return res.send(response);
})

router.get('/getPending', VerifyToken, async (req, res) => {
    let tickets = await SUPPORT.find({ status: { $ne: 'resolved' } }).exec();
    return res.send({ success: true, tickets })
})

router.get('/getResolved', VerifyToken, async (req, res) => {
    let tickets = await SUPPORT.find({ status: 'resolved' }).exec();
    return res.send({ success: true, tickets })
})

router.get('/getAll', VerifyToken, async (req, res) => {
    let tickets = await SUPPORT.find({}).exec();
    return res.send({ success: true, tickets })
})

var addTicket = async (req) => {
    return new Promise(async (resolve) => {
        const { username, subject, message } = req.body;
        if (!email || !subject || !message) {
            return resolve({ success: false, message: 'Please provide required parameters' });
        }
        if (typeof email != 'string')
            return resolve({ success: false, message: 'email should be a valid string' });
        if (typeof subject != 'string')
            return resolve({ success: false, message: 'subject should be a valid string' });
        if (typeof message != 'string') {
            return resolve({ success: false, message: 'message should be a valid string' });
        }
        let str = username + subject + message + Math.random() + Date.now();
        let ticket = hash(str)
        await Support.create({ username, subject, message, starus: false, created_at: Date.now(), ticket })
        return resolve({ success: true, message: ticket })
    })
}

var updateTicketStatus = async (req) => {
    return new Promise(async (resolve) => {
        let status = req.params.status;
        let ticketId = req.params.ticketId;
        if (!status || !ticketId)
            return resolve({ success: false, message: 'Please provide required parameters' })
        if (typeof status != 'string')
            return resolve({ success: false, message: 'status must be valid string' })
        if (typeof ticketId != 'string')
            return resolve({ success: false, message: 'ticketId must be a valid string' })

        let ticket = await SUPPORT.findOne({ _id: ticketId }).exec()
        ticket.status = status;
        await ticket.save()
        return resolve({ success: true, message: 'Status successfuly updated' })
    })
}
module.exports = router;