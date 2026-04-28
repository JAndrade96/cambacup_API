const pool = require('../config/db');

// Crea torneo respetando los limites del plan del organizador y admin
const createTournament = async (req, res) => {
    const organizer = req.user.id;
    const { name, description, format, start_date, end_date, location } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO tournaments
                (organizer_id, name, description, format, start_date, end_date, location)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
            [organizer, name, description, format, start_date, end_date, location]
        );

        res.status(201).json({
            mensaje: 'Torneo creado con exito',
            tournament: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando el torneo' });
    };
};

// Devuelve todos los torneos del organizador logueado
const getMyTournaments = async (req, res) => {
    const organizerId = req.user.id;

    try {
        const result = await pool.query(
            `SELECT 
                id, name, format, status, start_date, end_date, location, created_at
                FROM tournaments WHERE organizer_id = $1
                ORDER BY created_at DESC`,
            [organizerId]
        );

        res.json({
            total: result.rows.length,
            tournaments: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo torneos' });
    };
};

// Devuelve un torneo con sus equipos incluidos
const getTournamentById = async (req, res) => {
    const { id } = req.params;
    const organizerId = req.user.id;

    try {
        const tournament = await pool.query(
            `SELECT * FROM tournaments
            WHERE id = $1 AND organizer_id = $2`,
            [id, organizerId]
        );

        if (tournament.rows.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const teams = await pool.query(
            `SELECT
                id, name, short_name, logo_url,
                points, matches_played, goals_for,
                goals_against, goal_difference,
                FROM teams
                WHERE tournament_id = $1
                ORDER BY points DESC, goal_difference DESC`,
            [id]
        );

        res.json({
            tournament: tournament.rows[0],
            teams: teams.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo el torneo' });
    }
};

// Editar torneo si el torneo es DRAFT o ACTIVE
const updateTournament = async (req, res) => {
    const { id } = req.params;
    const organizerId = req.user.id;
    const { name, description, format, start_date, end_date, location, status } = req.body;

    try {
        const existing = await pool.query(
            `SELECT * FROM tournaments WHERE id = $1 AND organizer_id = $2`,
            [id, organizerId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const currentStatus = existing.rows[0].status;
        if (currentStatus === 'FINISHED' || currentStatus === 'CANCELED') {
            return res.status(400).json({
                error: `No se puede editar un torneo con estado ${currentStatus}`
            });
        }

        const result = await pool.query(
            `UPDATE tournaments SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                format = COALESCE($3, format),
                start_date = COALESCE($4, start_date),
                end_date = COALESCE($5, end_date),
                location = COALESCE($6, location),
                status = COALESCE($7, status),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 AND organizer_id = $9
             RETURNING *`,
            [name, description, format, start_date, end_date, location, status, id, organizerId]
        );

        res.json({
            mensaje: 'Torneo actualizado',
            tournament: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizado en el torneo' });
    };
};

// Elimina torneos si estan en DRAFT - si ya empezo no se puede borrar
const deleteTournament = async (req, res) => {
    const { id } = req.params;
    const organizerId = req.user.id;

    try {
        const existing = await pool.query(
            `SELECT * FROM tournaments WHERE id = $1 AND organizer_id = $2`,
            [id, organizerId]
        )

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        if (existing.rows[0].status !== 'DRAFT') {
            return res.status(400).json({
                error: 'Solo se puede eliminar torneos en estado DRAFT. Cancelá el torneo primero.'
            });
        }

        await pool.query(
            `DELETE FROM tournaments WHERE id = $1`,
            [id]
        );
        res.json({ mensaje: 'Torneo eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error eliminando el torneo' });
    }
};

module.exports = {
    createTournament,
    getMyTournaments,
    getTournamentById,
    updateTournament,
    deleteTournament
};