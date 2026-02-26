/**
 * @description Waiting Room Controller - Handle waiting room requests
 */

const WaitingRoom = require('../models/WaitingRoom');
const { successResponse } = require('../utils/response');
const { CREATED_CODE } = require('../constants');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { calculateNotes } = require('../utils/helpers');
const { BASE_UNIT_PRICE } = require('../constants');

class WaitingRoomController {
    /**
     * Create waiting room
     * POST /api/waiting-rooms
     */
    async createWaitingRoom(req, res, next) {
        try {
            const { amount, expiresAt } = req.body;

            if (amount < BASE_UNIT_PRICE) {
                throw new ValidationError(`Minimum amount is ${BASE_UNIT_PRICE} VND`);
            }

            const notes = calculateNotes(amount);

            const waitingRoom = await WaitingRoom.create({
                investorId: req.user.id,
                amount,
                notes,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                status: 'waiting'
            });

            return successResponse(res, waitingRoom, 'Waiting room created successfully', CREATED_CODE);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get waiting room by ID
     * GET /api/waiting-rooms/:id
     */
    async getWaitingRoom(req, res, next) {
        try {
            const { id } = req.params;
            const waitingRoom = await WaitingRoom.findById(id)
                .populate('investorId', 'phone category')
                .populate('loanId', 'capital term interestRate purpose status');

            if (!waitingRoom) {
                throw new NotFoundError('Waiting room not found');
            }

            return successResponse(res, waitingRoom);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get my waiting rooms
     * GET /api/waiting-rooms/my-rooms
     */
    async getMyWaitingRooms(req, res, next) {
        try {
            const { status } = req.query;
            const query = { investorId: req.user.id };
            if (status) {
                query.status = status;
            }

            const waitingRooms = await WaitingRoom.find(query)
                .populate('loanId', 'capital term interestRate purpose status')
                .sort({ createdAt: -1 });

            return successResponse(res, waitingRooms);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel waiting room
     * POST /api/waiting-rooms/:id/cancel
     */
    async cancelWaitingRoom(req, res, next) {
        try {
            const { id } = req.params;
            const waitingRoom = await WaitingRoom.findById(id);

            if (!waitingRoom) {
                throw new NotFoundError('Waiting room not found');
            }

            if (waitingRoom.investorId.toString() !== req.user.id) {
                throw new ValidationError('Unauthorized to cancel this waiting room');
            }

            if (waitingRoom.status !== 'waiting') {
                throw new ValidationError('Only waiting rooms can be cancelled');
            }

            waitingRoom.status = 'cancelled';
            waitingRoom.cancelledAt = new Date();
            await waitingRoom.save();

            return successResponse(res, waitingRoom, 'Waiting room cancelled successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WaitingRoomController();

