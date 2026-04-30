const express = require('express');
const router = express.Router({ mergeParams: true });
const matchController = require('../controllers/matchController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validatorsMiddleware');
const { body } = require('express-validator');

const matchRules = [
    body('team_home_id')
        .notEmpty().withMessage('El equipo local es obligatorio')
        .isUUID().withMessage('ID de equipo local inválido'),
    body('team_away_id')
        .notEmpty().withMessage('El equipo visitante es obligatorio')
        .isUUID().withMessage('ID de equipo visitante inválido'),
    body('round')
        .optional()
        .isInt({ min: 1 }).withMessage('La fecha debe ser un número positivo'),
    body('start_time')
        .optional()
        .isISO8601().withMessage('La fecha y hora no tiene formato válido'),
];

const updateMatchRules = [
    body('goals_home')
        .optional()
        .isInt({ min: 0 }).withMessage('Los goles no pueden ser negativos'),
    body('goals_away')
        .optional()
        .isInt({ min: 0 }).withMessage('Los goles no pueden ser negativos'),
    body('status')
        .optional()
        .isIn(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'WALKOVER', 'SUSPENDED'])
        .withMessage('Estado inválido'),
];

router.use(authMiddleware);
router.use(authorize(['ORGANIZER', 'ADMIN']));

router.post('/', matchRules, validate, matchController.createMatch);
router.get('/', matchController.getMatches);
router.get('/:id', matchController.getMatchById);
router.put('/:id', updateMatchRules, validate, matchController.updateMatch);
router.delete('/:id', matchController.deleteMatch);

module.exports = router;
