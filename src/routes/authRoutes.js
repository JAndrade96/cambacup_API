const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validate, registerRules, loginRules } = require('../middleware/validatorsMiddleware');

// Ruta para registrar un nuevo usuario
router.post('/register', registerRules, validate, authController.register);

// Ruta para iniciar sesión
router.post('/login', loginRules, validate, authController.login);

// Ruta solo para Organizadores y Administradores
router.get('/organizer-panel', authMiddleware, authorize(['ORGANIZER', 'ADMIN']), (req, res) => {
    res.json({ mensaje: 'Hola Organizador, puedes crear torneos.' });
});

// Solo para Administradores (Superusuarios)

router.get('/admin-panel', authMiddleware, authorize(['ADMIN']), (req, res) => {
    res.json({ mensaje: 'Hola Jefe Supremo. Aquí puedes borrar usuarios.' });
});

// Ruta protegida
router.get('/profile', authMiddleware, async (req, res) => {
    res.json({
        mensaje: '¡Bienvenido a tu zona privada!',
        datos_usuario: req.user
    });
});



module.exports = router;