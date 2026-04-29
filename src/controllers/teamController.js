const pool = require('../config/db');

// Verifica que el torneo existe y le pertenece al usuario
const verifyTournamentOwer = async (tournamentId, organizerId) => {
    const result = await pool.query(
        `SELECT * FROM tournaments WHERE id = $1 AND organizer_id = $2`,
        [tournamentId, organizerId]
    );
    return result.rows[0] || null;
};

//Crea equipos para un torneo
const createTeam = async (req, res) => {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { name, short_name, logo_url, color_primary, color_secondary } = req.body;

    try {
        const tournament = await verifyTournamentOwer(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        if (['FINISHED', 'CANCELED'].includes(tournament.status)) {
            return res.status(400).json({
                error: `No se puede agregar equipos a un torneo ${tournament.status}`
            });
        }

        const result = await pool.query(
            `INSERT INTO teams
                (tournament_id, name, short_name, logo_url, color_primary, color_secondary)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
            [tournamentId, name, short_name, logo_url, color_primary, color_secondary]
        );

        res.status(201).json({
            mensaje: 'Equipo creado con éxito',
            team: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando el equipo' });
    }
};

// Devuelve todos los equipos ordenados por posicion
const getTeams = async (req, res) => {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;

    try {
        const tournament = await verifyTournamentOwer(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const result = await pool.query(
            `SELECT
                id, name, short_name, logo_url, 
                color_primary, color_secondary,
                points, matches_played,
                goals_for, goals_against, goal_difference
            FROM teams
            WHERE tournament_id = $1
            ORDER BY points DESC, goal_difference DESC, goals_for DESC`,
            [tournamentId]
        );

        res.json({
            total: result.rows.length,
            teams: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo equipos' });
    }
};

// Devuelve un equipo con sus jugadores incluidos

const getTeamById = async (req, res) => {
    const { tournamentId, id } = req.params;
    const organizerId = req.user.id;

    try {
        const tournament = await verifyTournamentOwer(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const team = await pool.query(
            `SELECT * FROM teams WHERE id = $1 AND tournament_id = $2`,
            [id, tournamentId]
        );

        if (team.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const players = await pool.query(
            `SELECT id, full_name, dorsal, position, photo_url, ci
             FROM players
             WHERE team_id = $1
             ORDER BY dorsal ASC`,
            [id]
        );

        res.json({
            team: team.rows[0],
            players: players.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo el equipo' });
    }
};

// Actualiza equipos
const updateTeam = async (req, res) => {
    const { tournamentId, id } = req.params;
    const organizerId = req.user.id;
    const { name, short_name, logo_url, color_primary, color_secondary } = req.body;

    try {
        const tournament = await verifyTournamentOwer(tournamentId, organizerId);
        if (!tournament) {
            if (!tournament) {
                return res.status(404).json({ error: 'Torneo no encontrado' });
            }
        }

        const existing = await pool.query(
            `SELECT * FROM teams WHERE id = $1 AND tournament_id = $2`,
            [id, tournamentId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const result = await pool.query(
            `UPDATE teams SET
                name = COALESCE($1, name),
                shor_name = COALESCE($2, short_name),
                logo_url = COALESCE($3, logo_url),
                color_primary = COALESCE($4, color_primary),
                color_secondary = COALESCE($5, color_secondary)
            WHERE id = $6 AND tournament_id = $7
            RETURNING *`,
            [name, short_name, logo_url, color_primary, color_secondary, id, tournamentId]
        );

        res.json({
            mensaje: 'Equipo actualizado',
            team: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error actualizando el equipo' });
    }
}

// Elimina el equipo solo si el estado esta en DRAFT
const deleteTeam = async (req, res) => {
    const { tournamentId, id } = req.params;
    const organizerId = req.user.id;

    try {
        const tournament = await verifyTournamentOwer(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        if (tournament.status !== 'DRAFT') {
            return res.status(400).json({
                error: 'Solo se puede eliminar equipos si el torneo esta en DRAFT'
            });
        }

        const existing = await pool.query(
            `SELECT * FROM teams WHERE id = $1 AND tournament_id = $2`,
            [id, tournamentId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        await pool.query(`DELETE FROM teams WHERE id = $1`, [id]);

        res.json({ mensaje: 'Equipo eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error eliminando el equipo' });
    }
};

module.exports = {
    createTeam,
    getTeams,
    getTeamById,
    updateTeam,
    deleteTeam
};