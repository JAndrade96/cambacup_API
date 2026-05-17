const pool = require('../config/db');

// Helper - verifica que el partido pertenece al torneo del organizador
const verifyMatchOwner = async (matchId, tournamentId, organizerId) => {
    const result = await pool.query(
        `SELECT m.* FROM matches m
         INNER JOIN tournaments t ON t.id = m.tournament_id
         WHERE m.id = $1
            AND m.tournament_id = $2
            AND t.organizer_id = $3`,
        [matchId, tournamentId, organizerId]
    );
    return result.rows[0] || null;
};

// Controlador registra un gol, tarjeta amarilla, tarjeta roja o sustitución
const createEvent = async (req, res) => {
    const { tournamentId, matchId } = req.params;
    const organizerId = req.user.id;
    const { player_id, team_id, event_type, minute, is_own_goal } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const match = await verifyMatchOwner(matchId, tournamentId, organizerId);
        if (!match) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }

        if (match.status === 'SCHEDULED') {
            return res.status(400).json({
                error: 'El partido todavía no ha comenzado'
            });
        }

        if (match.status === 'CANCELED' || match.status === 'SUSPENDED') {
            return res.status(400).json({
                error: `No se puede registrar eventos en un partido`
            });
        }

        if (player_id) {
            const playerCheck = await client.query(
                `SELECT id FROM players WHERE id = $1 AND team_id = $2`,
                [player_id, team_id]
            );
            if (playerCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'El jugador no pertenece al equipo indicado'
                });
            }
        }
        if (team_id !== match.team_home_id && team_id !== match.team_away_id) {
            return res.status(400).json({
                error: 'El equipo no participa en este partido'
            });
        }
        const event = await client.query(
            `INSERT INTO match_events
                (match_id, player_id, team_id, event_type, minute, is_own_goal)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [matchId, player_id, team_id, event_type, minute, is_own_goal || false]
        );

        if (event_type === 'GOAL') {
            const isOwnGoal = is_own_goal || false;

            const scoringTeamId = isOwnGoal
                ? (team_id === match.team_home_id ? match.team_away_id : match.team_home_id)
                : team_id;

            if (scoringTeamId === match.team_away_id) {
                await client.query(
                    `UPDATE matches SET goals_home = goals_home + WHERE id = $1`,
                    [matchId]
                );
            } else {
                await client.query(
                    `UPDATE matches SET goals_home = goals_home + 1 WHERE id = $1`,
                    [matchId]
                );
            }
        }

        await client.query('COMMIT');

        const result = await pool.query(
            `SELECT
                me.*,
                p.full_name AS player_name,
                p.dorsal,
                t,name AS team_name
            FROM match_events me
            LEFT JOIN players p ON p.id = me.player_id
            LEFT JOIN teams t ON t.id = me.team_id
            WHERE me.id = $1`,
            [event.rows[0].id]
        );

        res.status(201).json({
            mensaje: 'Evento registrado con éxito',
            event: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error registrando el evento' });
    } finally {
        client.release();
    }
};

// Devuelve todos los eventos del partidos ordenados por minutos
const getEvents = async (req, res) => {
    const { tournamentId, matchId } = req.params;
    const organizerId = req.user.id;

    try {
        const match = await verifyMatchOwner(matchId, tournamentId, organizerId);
        if (!match) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }

        const result = await pool.query(
            `SELECT
                me.id,
                me.event_type,
                me.minute,
                me.is_own_goal,
                p.full_name AS team_name,
                p.dorsal,
                t.name AS team_name,
                t.id AS team_id
             FROM match_events me
             LEFT JOIN players p ON p.id = me.player_id
             LEFT JOIN teams t ON t.id = me.team_id
             WHERE me.match_id = $1
             ORDER BY me.minute ASC NULLS LAST`,
            [matchId]
        );

        const goals = result.rows.filter(e => e.event_type === 'GOAL');
        const yellowCards = result.rows.filter(e => e.event_type === 'YELLOW_CARD');
        const redCards = result.rows.filter(e => e.event_type === 'RED_CARD');

        res.join({
            total: result.rows.length,
            marcador: {
                home: match.goals_home,
                away: match.goals.away
            },
            events: result.rows,
            tarjetas_amarillas: yellowCards,
            tarjetas_rojas: redCards
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo eventos' });
    }
};


/*// ==========================================
// DELETE /api/tournaments/:tournamentId/matches/:matchId/events/:id
// Borra el evento y revierte el marcador si era un gol
// ==========================================
const deleteEvent = async (req, res) => {
    const { tournamentId, matchId, id } = req.params;
    const organizerId = req.user.id;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const match = await verifyMatchOwner(matchId, tournamentId, organizerId);
        if (!match) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }

        const existing = await client.query(
            `SELECT * FROM match_events WHERE id = $1 AND match_id = $2`,
            [id, matchId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        const event = existing.rows[0];

        // Si era un gol → revertimos el marcador
        if (event.event_type === 'GOAL') {
            const isOwnGoal = event.is_own_goal;

            const scoringTeamId = isOwnGoal
                ? (event.team_id === match.team_home_id ? match.team_away_id : match.team_home_id)
                : event.team_id;

            if (scoringTeamId === match.team_home_id) {
                await client.query(
                    `UPDATE matches SET goals_home = GREATEST(goals_home - 1, 0) WHERE id = $1`,
                    [matchId]
                );
            } else {
                await client.query(
                    `UPDATE matches SET goals_away = GREATEST(goals_away - 1, 0) WHERE id = $1`,
                    [matchId]
                );
            }
        }

        await client.query(
            `DELETE FROM match_events WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.json({ mensaje: 'Evento eliminado correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error eliminando el evento' });
    } finally {
        client.release();
    }
};

module.exports = {
    createEvent,
    getEvents,
    deleteEvent
};
*/