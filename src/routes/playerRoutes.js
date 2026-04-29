const express = require('express');
const router = express.Router({ mergeParams: true });
const playerController = require('../controllers/playerController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validatorsMiddleware');
const { body } = require('express-validator');

const playerRules = [
    body('full_name')
        .notEmpty().withMessage('El nombre del jugador es olbigatorio')
        .isLength({ max: 150 }).withMessage('El nombre no puede superar 150 caracteres')
        .trim(),
    body('dorsal')
        .optional()
        .isInt({ min: 1, max: 99 }).withMessage('El dorsal debe ser un numero entre 1 y 99'),
    body('position')
        .optional()
        .isIn(['Portero', 'Defensa', 'Mediocampista', 'Delantero'])
        .withMessage('Posicion Invalida'),
    body('ci')
        .optional()
        .isLength({ min: 5, max: 20 }).withMessage('El CI debe tener entre 5 y 20 caracteres'),
];

router.use(authMiddleware);
router.use(authorize(['ORGANIZER', 'ADMIN']));

router.post('/', playerRules, validate, playerController.createPlayer);
router.get('/', playerController.getPlayers);
router.get('/:id', playerController.getPlayerById);
router.put('/:id', playerRules, validate, playerController.updatePlayer);
router.delete('/:id', playerController.deletePlayer);

module.exports = router;
