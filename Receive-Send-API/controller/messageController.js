const express = require('express');
const router = express.Router();
const { handlePostMessage, handlePostWorker, handleGetMessage } = require('../service/messageService');

// POST /message
router.post('/', handlePostMessage);
// POST /message/worker
router.post('/worker', handlePostWorker);
router.get('/', handleGetMessage); 

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


module.exports = router;
