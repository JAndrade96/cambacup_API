const express = require('express');
const inviteController = require('../controllers/inviteController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const router = express.Router();


// Ruta para crear invitación: Solo ORGANIZER O ADMIN pueden invitar

router.post('/create', authMiddleware, authorize(['ORGANIZER', 'ADMIN']), inviteController.createInvitacion);

// Ruta para aceptar invitación: Cualquiera puede aceptar

router.post('/accept', authMiddleware, inviteController.acceptInvitation);

module.exports = router;