const express = require('express');
const router = express.Router();
const wikiController = require('../controllers/wikiController');
const { authenticateToken } = require('../middleware/auth');

// All wiki routes should be protected
router.use(authenticateToken);

router.get('/tree', wikiController.getTree);
router.get('/page', wikiController.getPage);
router.post('/page', wikiController.savePage);
router.delete('/page', wikiController.deletePage);
router.get('/search', wikiController.search);

module.exports = router;
