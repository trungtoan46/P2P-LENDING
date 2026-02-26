/**
 * @description Blockchain Routes
 */

const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchain.controller');

// Public routes - Anyone can check blockchain status
router.get('/health',
    (req, res, next) => blockchainController.checkHealth(req, res, next)
);

router.get('/info',
    (req, res, next) => blockchainController.getInfo(req, res, next)
);

// Explorer Routes
router.get('/chain-info',
    (req, res, next) => blockchainController.getChainInfo(req, res, next)
);

router.get('/blocks',
    (req, res, next) => blockchainController.getBlocks(req, res, next)
);

router.get('/blocks/:blockNumber',
    (req, res, next) => blockchainController.getBlock(req, res, next)
);

router.get('/transactions/:txId',
    (req, res, next) => blockchainController.getTransaction(req, res, next)
);

router.get('/history/:key',
    (req, res, next) => blockchainController.getAssetHistory(req, res, next)
);

// Protected route - Test connection (admin only would be better)
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

router.post('/test',
    authenticate,
    isAdmin,
    (req, res, next) => blockchainController.testConnection(req, res, next)
);

module.exports = router;
