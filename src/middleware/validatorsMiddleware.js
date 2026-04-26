const { body, validationResult } = require('express-validator');

//Funcion reutilizable que revisa si hay errores y responde

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: errors.array()[0].msg //Devuelve el primer error encontrado
        });
    }
    next();
};

//Regla para registro
const registerRules = [
    body('email')
        .notEmpty().withMessage('El email es obligatorio')
        .isEmail().withMessage('El email no tiene formato válido')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

    body('full_name')
        .notEmpty().withMessage('El nombre completo es obligatorio')
        .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
        .trim(),

    body('phone')
        .optional()
        .isMobilePhone().withMessage('El télefono no tiene formato válido'),
]

// Reglas para login

const loginRules = [
    body('email')
        .notEmpty().withMessage('El email es obligatorio')
        .isEmail().withMessage('El email no tiene formato válido')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria'),
];

// Reglas para aceptar invitación
const acceptInviteRules = [
    body('token')
        .notEmpty().withMessage('El token de invitación es obligatorio')
        .isLength({ min: 32, max: 32 }).withMessage('Token inválido'),
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    acceptInviteRules
};