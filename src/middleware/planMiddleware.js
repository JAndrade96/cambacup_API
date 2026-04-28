const pool = require('../config/db');

const PLAN_LIMITS = {
    BASIC: 1,
    STANDARD: 3,
    PREMIUM: Infinity
};

// Verifica que el usuario no supere el limite de torneos de su plan
const checkTournamentLimit = async (req, res, next) => {
    const userId = req.user.id;
    const userPlan = req.user.plan;

    try {
        const result = await pool.query(
            `SELECT COUNT(*) FROM tournaments
            WHERE organizer_id = $1 AND status != 'CANCELED'`,
            [userId]
        );

        const currentCount = parseInt(result.rows[0].count);
        const limit = PLAN_LIMITS[userPlan];

        if (currentCount >= limit) {
            return res.status(403).json({
                error: `Tu plan ${userPlan} solo permite ${limit} torneo(s) activo(s). Mejora tu plan para crear mas.`
            });
        };

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error verificando limite de plan' });
    }
};

module.exports = { checkTournamentLimit };
