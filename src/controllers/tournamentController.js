const pool = require('../config/db');

// Crear un torneo (Con validación de Plan)

const createTournament = async (req, res) => {
    const { name, format, start_date, location } = req.body;
    const userId = req.user.id;
    const userPlan = req.user.plan;

    try {
        if (userPlan === 'BASIC') {
            const countResult = await pool.query(
                `SELECT COUNT(*) FROM tournaments
                WHERE organizer_id = $1 AND status IN ('DRAFT', 'ACTIVE')`,
                [userId]
            );

            const activeTournaments = parseInt(countResult.rows[0].count);

            if (activeTournaments >= 1) {
                return res.status(403).json({
                    error: 'Limite alcanzado. Tu plan Basico solo permite 1 campeonato activo. ¡Finaliza el actual o mejora a Premium!'
                });
            }
        }

        const newTournament = await pool.query(
            `INSERT INTO tournaments (organizer_id, name, format, start_date, location)
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [userId, name, format, start_date, location]
        );

        res.status(201).json({
            mensaje: '¡Campeonato creado exitosamente!',
            torneo: newTournament.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el torneo' });
    }
};

// Listar mis torneos

const getMyTournaments  = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `SELECT * FROM tournaments WHERE organizer_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
    } catch (error) {}
};


/*
// 2. LISTAR MIS TORNEOS
const getMyTournaments = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await pool.query(
            `SELECT * FROM tournaments WHERE organizer_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo torneos' });
    }
};

// 3. OBTENER DETALLE DE UN TORNEO
const getTournamentById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

// 4. ELIMINAR TORNEO (Solo si eres el dueño)
const deleteTournament = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Verificar que el torneo sea tuyo antes de borrar
        const check = await pool.query('SELECT organizer_id FROM tournaments WHERE id = $1', [id]);
        
        if (check.rows.length === 0) return res.status(404).json({ error: 'Torneo no encontrado' });
        
        if (check.rows[0].organizer_id !== userId) {
            return res.status(403).json({ error: 'No tienes permiso para borrar este torneo' });
        }

        await pool.query('DELETE FROM tournaments WHERE id = $1', [id]);
        res.json({ mensaje: 'Torneo eliminado correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar' });
    }
};

module.exports = { createTournament, getMyTournaments, getTournamentById, deleteTournament };
*/