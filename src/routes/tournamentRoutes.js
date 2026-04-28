const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { checkTournamentLimit } = require('../middleware/planMiddleware');
const { validate } = require('../middleware/validatorsMiddleware');
const { body } = require('express-validator');

// Reglas de validacion para torneos
const tournamentRules = [
    body('name')
        .notEmpty().withMessage('El nombre del torneo es obligatorio')
        .isLength({ max: 150 }).withMessage('El nombre no puede superar 150 caracteres')
        .trim(),
    body('format')
        .optional()
        .isIn(['LEAGUE', 'KNOCKOUT', 'GROUPS']).withMessage('Formato invalido'),
    body('start_date')
        .optional()
        .isDate().withMessage('La fecha de inicio no es valido'),
    body('end_date')
        .optional()
        .isDate().withMessage('La fecha de fin no tiene formato valido'),
];

// Todas las rutas requieren estar autenticado y ser ORGANIZER o ADMIN
router.use(authMiddleware);
router.use(authorize(['ORGANIZER', 'ADMIN']));

router.post('/', checkTournamentLimit, tournamentRules, validate, tournamentController.createTournament);
router.get('/', tournamentController.getMyTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.put('/:id', tournamentRules, validate, tournamentController.updateTournament);
router.delete('/:id', tournamentController.deleteTournament);

module.exports = router;