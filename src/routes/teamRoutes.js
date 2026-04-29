const express = require('express');
const router = express.Router({ mergeParams: true });
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validatorsMiddleware');
const { body } = require('express-validator');

const teamRules = [
    body('name')
        .notEmpty().withMessage('El nombre del equipo es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre no puede superar los 100 caracteres')
        .trim(),
    body('short_name')
        .optional()
        .isLength({ max: 10 }).withMessage('El nombre corto no puede superar los 10 caracteres'),
    body('color_primary')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe ser un HEX valido. ej: #FF0000'),
    body('color_secondary')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe ser un HEX valido. ej: #FFFFFF'),
];

router.use(authMiddleware);
router.use(authorize(['ORGANIZER', 'ADMIN']));

router.post('/', teamRules, validate, teamController.createTeam);
router.get('/', teamController.getTeams);
router.get('/:id', teamController.getTeamById);
router.put('/:id', teamRules, validate, teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);


module.exports = router;
