const pool = require('../config/db');

//Verifica que el equipo existe y pertenece al torneo del organizador
const verifyTeamOwner = async (tournamentId, teamId, organizerId) => {
    const result = await pool.query(
        `SELECT t.* FROM teams t
        INNER JOIN tournaments tr ON tr.id = t.tournament_id
        WHERE t.id = $1
            AND t.tournament_id = $2
            AND tr.organizer_id = $3`,
        [teamId, tournamentId, organizerId]
    );
    return result.rows[0] || null;
};

//Crear nuevo jugador
const createPlayer = async (req, res) => {
    const { tournamentId, teamId } = req.params;
    const organizerId = req.user.id;
    const { full_name, dorsal, position, photo_url, ci } = req.body;

    try {
        const team = await verifyTeamOwner(tournamentId, teamId, organizerId);
        if (!team) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        if (dorsal) {
            const dorsalExist = await pool.query(
                `SELECT id FROM players WHERE team_id = $1 AND dorsal = $2`,
                [teamId, dorsal]
            );
            if (dorsalExist.rows.length > 0) {
                return res.status(400).json({
                    error: `El dorsal ${dorsal} ya esta ocupado en este equipo`
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO players (team_id, full_name, dorsal, position, photo_url, ci)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [teamId, full_name, dorsal, position, photo_url, ci]
        );

        res.status(201).json({
            mensaje: 'Jugador agregado con exito',
            player: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: 'Ya existe un jugador registrado con ese CI'
            });
        }
        console.error(error);
        res.status(500).json({ error: 'Error creando el jugador' });
    }
};

// Obtener todos los jugadores
const getPlayers = async (req, res) => {
    const { tournamentId, teamId } = req.params;
    const organizerId = req.user.id;

    try {
        const team = await verifyTeamOwner(tournamentId, teamId, organizerId);
        if (!team) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const result = await pool.query(
            `SELECT
                id, full_name, dorsal, position, photo_url, ci,
                created_at
            FROM players
            WHERE team_id = $1
            ORDER BY dorsal ASC NULLS LAST`,
            [teamId]
        );

        res.json({
            team: team.name,
            total: result.rows.length,
            players: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo jugadores' });
    }
};

// Obtener jugadores por ID
const getPlayerById = async (req, res) => {
    const { tournamentId, teamId, id } = req.params;
    const organizerId = req.user.id;

    try {
        const team = await verifyTeamOwner(tournamentId, teamId, organizerId);
        if (!team) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const result = await pool.query(
            `SELECT
                p. *,
                COUNT(CASE WHEN me.event_type = 'GOAL' AND me.is_own_goal = falsee THEN 1 END) AS goals,
                COUNT(CASE WHEN me.event_type = 'YELLOW_CARD' THEN 1 END) AS yellow_cards,
                COUNT(CASE WHEN me.event_type = 'RED_CARD' THEN 1 END) AS red_cards
            FROM players p
            LEFT JOIN match_events me ON me.player_id = p.id
            WHERE p.id = $1 AND p.team_id = $2
            GROUP BY p.id`,
            [id, teamId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }

        res.json({ player: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo el jugador' });
    }
};

//Actualizar datos de jugador
const updatePlayer = async (req, res) => {
    const { tournamentId, teamId, id } = req.params;
    const organizerId = req.user.id;
    const { full_name, dorsal, position, photo_url, ci } = req.body;

    try {
        const team = await verifyTeamOwner(tournamentId, teamId, organizerId);
        if (!team) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const existing = await pool.query(
            `SELECT * FROM players WHERE id = $1 AND team_id = $2`,
            [id, teamId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }

        if (dorsal && dorsal !== existing.rows[0].dorsal) {
            const dorsalExist = await pool.query(
                `SELECT id FROM players WHERE team_id = $1 AND dorsal = $2 AND id != $3`,
                [teamId, dorsal, id]
            );
            if (dorsalExist.rows.length > 0) {
                return res.status(400).json({
                    error: `El dorsal ${dorsal} ya esta ocupado en este equipo`
                });
            }
        }

        const result = await pool.query(
            `UPDATE players SET
                full_name = COALESCE($1, full_name),
                dorsal = COALESCE($2, dorsal),
                position = COALESCE($3, position),
                photo_url = COALESCE($4, photo_url),
                ci = COALESCE($5, ci)
            WHERE id = $6 AND team_id = $7
            RETURNING *`,
            [full_name, dorsal, position, photo_url, ci, id, teamId]
        );

        res.json({
            mensaje: 'Jugador actualizado',
            player: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: "Ya exist un jugador registrado con ese CI"
            });
        }
        console.error(error);
        res.status(500).json({ error: 'Error actualizando el jugador' });
    }
};

// Elimina jugadores
const deletePlayer = async (req, res) => {
    const { tournamentId, teamId, id } = req.params;
    const organizerId = req.user.id;

    try {
        const team = await verifyTeamOwner(tournamentId, teamId, organizerId);
        if (!team) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        const existing = await pool.query(
            `SELECT * FROM players WHERE id = $1 AND team_id = $2`,
            [id, teamId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }

        await pool.query(`DELETE FROM players WHERE id = $1`, [id]);

        res.json({ mensaje: 'Jugador eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error eliminando el jugador' });
    }
};

module.exports = {
    createPlayer,
    getPlayers,
    getPlayerById,
    updatePlayer,
    deletePlayer
};