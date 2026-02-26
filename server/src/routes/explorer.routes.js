/**
 * @description Explorer Routes - Public API (no auth required)
 */

const express = require('express');
const router = express.Router();
const explorerController = require('../controllers/explorer.controller');

// Dashboard statistics
router.get('/dashboard',
    (req, res, next) => explorerController.getDashboardStats(req, res, next)
);

// Public loan listing
router.get('/loans',
    (req, res, next) => explorerController.getPublicLoans(req, res, next)
);

// Public loan detail
router.get('/loans/:id',
    (req, res, next) => explorerController.getPublicLoanDetail(req, res, next)
);

// Recent activities
router.get('/activities',
    (req, res, next) => explorerController.getRecentActivities(req, res, next)
);

// Global Search
router.get('/search',
    (req, res, next) => explorerController.search(req, res, next)
);

module.exports = router;
