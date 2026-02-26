/**
 * @description Waiting Room Routes
 */

const express = require('express');
const router = express.Router();
const waitingRoomController = require('../controllers/waitingRoom.controller');
const { authenticate, isLender } = require('../middlewares/auth.middleware');
const { validateBody, validateQuery } = require('../middlewares/validation.middleware');
const Joi = require('joi');

// Protected routes - Lender
router.post('/',
    authenticate,
    isLender,
    validateBody(Joi.object({
        amount: Joi.number().min(500000).required(),
        expiresAt: Joi.date().optional()
    })),
    (req, res, next) => waitingRoomController.createWaitingRoom(req, res, next)
);

router.get('/my-rooms',
    authenticate,
    isLender,
    validateQuery(Joi.object({
        status: Joi.string().valid('waiting', 'matched', 'cancelled', 'expired')
    })),
    (req, res, next) => waitingRoomController.getMyWaitingRooms(req, res, next)
);

router.get('/:id',
    authenticate,
    (req, res, next) => waitingRoomController.getWaitingRoom(req, res, next)
);

router.post('/:id/cancel',
    authenticate,
    isLender,
    (req, res, next) => waitingRoomController.cancelWaitingRoom(req, res, next)
);

module.exports = router;

