const pool = require('../config/db');

// Verificar que el torneo pertenece al organizador
const verifyTournamentOwner = async (tournamentId, organizerId) => {
    const result = await pool.query(
        `SELECT * FROM tournaments WHERE id = $1 AND organizer_id = $2`,
        [tournamentId, organizerId]
    );
    return result.rows[0] || null;
};

// Actualiza las estadisticas de ambos equipos cuando termina un partido
// Esta es la funcion mas importante del sistema
const updateTeamStats = async (client, match) => {
    const { team_home_id, team_away_id, goals_home, goals_away } = match;

    let pointsHome = 0;
    let pointsAway = 0;

    if (goals_home > goals_away) {
        pointsHome = 3;
        pointsAway = 0;
    } else if (goals_home < goals_away) {
        pointsHome = 0;
        pointsAway = 3;
    } else {
        pointsHome = 1;
        pointsAway = 1;
    }

    await client.query(
        `UPDATE teams SET
            points = points + $1,
            matches_played = matches_played + 1,
            goals_for = goals_for + $2,
            goals_against = goals_against + $3,
            goal_difference = goal_difference + ($2 - $3)
        WHERE id = $4`,
        [pointsHome, goals_home, goals_away, team_home_id]
    );

    await client.query(
        `UPDATE teams SET
            points = points + $1,
            matches_played = matches_played + 1,
            goals_for = goals_for + $2,
            goals_against = goals_against + $3,
            goal_difference = goal_difference + ($2 - $3)
        WHERE id = $4`,
        [pointsAway, goals_away, goals_home, team_away_id]
    );
};

// Revierte estadisticas (cuando se edita un partido ya finalizado)
const revertTeamStats = async (client, match) => {
    const { team_home_id, team_away_id, goals_home, goals_away } = match;

    let pointsHome = 0;
    let pointsAway = 0;

    if (goals_home > goals_away) {
        pointsHome = 3;
        pointsAway = 0;
    } else if (goals_home < goals_away) {
        pointsHome = 0;
        pointsAway = 3;
    } else {
        pointsHome = 1;
        pointsAway = 1;
    }

    await client.query(
        `UPDATE teams SET
            points = points - $1,
            matches_played = matches_played - 1,
            goals_for = goals_for - $2,
            goals_against = goals_against - $3,
            goal_difference = goal_difference - ($2 - $3)
        WHERE id = $4`,
        [pointsHome, goals_home, goals_away, team_home_id]
    );

    await client.query(
        `UPDATE teams SET
            points = points - $1,
            matches_played = matches_played - 1,
            goals_for = goals_for - $2,
            goals_against = goals_against - $3,
            goal_difference = goal_difference - ($2 - $3)
        WHERE id = $4`,
        [pointsAway, goals_away, goals_home, team_away_id]
    );

};

// Crear partidos
const createMatch = async (req, res) => {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;
    const { team_home_id, team_away_id, round, start_time, field_name } = req.body;

    try {
        const tournament = await verifyTournamentOwner(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        if (tournament.status === 'FINISHED' || tournament.status === 'CANCELED') {
            return res.status(400).json({
                error: `No se pueden crear partido en un torneo ${tournament.status}`
            });
        }

        const teamsCheck = await pool.query(
            `SELECT id FROM teams
            WHERE id = ANY($1) AND tournament_id = $2`,
            [[team_home_id, team_away_id], tournamentId]
        );

        if (teamsCheck.rows.length < 2) {
            return res.status(400).json({
                error: 'Uno o ambos equipos no pertenecen a este torneo'
            });
        }

        if (team_home_id === team_away_id) {
            return res.status(400).json({
                error: 'El equipo local y visitante no pueden ser el mismo'
            });
        }

        const result = await pool.query(
            `INSERT INTO matches
                (tournament_id, team_home_id, team_away_id, round, start_time, field_name)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [tournamentId, team_home_id, team_away_id, round, start_time, field_name]
        );

        res.status(201).json({
            mensaje: 'Partido creado con exito',
            match: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando el partido' });
    }
};

// Agrupa los partidos por fecha/ronda
const getMatches = async (req, res) => {
    const { tournamentId } = req.params;
    const organizerId = req.user.id;

    try {
        const tournament = await verifyTournamentOwner(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const result = await pool.query(
            `SELECT
                m.id,
                m.round,
                m.start_time,
                m.field_name,
                m.status,
                m.goals_home,
                m.goals_away,
                m.penalty_home,
                m.penalty_away,
                th.id AS home_id,
                th.name AS home_name,
                th.short_name AS home_short,
                th.logo_url AS home_logo,
                ta.id AS away_id,
                ta.name AS away_name,
                ta.short_name AS away_short,
                ta.logo_url AS away_logo
            FROM matches m
            LEFT JOIN teams th ON th.id = m.team_home_id
            LEFT JOIN teams ta ON ta.id = m.team_away_id
            WHERE m.tournament_id = $1
            ORDER BY m.round ASC, m.start_time ASC`,
            [tournamentId]
        );

        const matchesByRound = result.rows.reduce((acc, match) => {
            const round = match.round || 'Sin fecha';
            if (!acc[round]) acc[round] = [];
            acc[round].push(match);
            return acc;
        }, {});

        res.json({
            total: result.rows.length,
            fixture: matchesByRound
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo partidos' });
    }
};

// Devuelve el partido con sus eventos incluidos
const getMatchById = async (req, res) => {
    const { tournamentId, id } = req.params;
    const organizerId = req.user.id;

    try {
        const tournament = await verifyTournamentOwner(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const match = await pool.query(
            `SELECT
                m.*,
                th.name AS home_name, th.logo_url AS home_logo,
                ta.name AS away_name, ta.logo_url AS away_logo
            FROM matches m
            LEFT JOIN teams th ON th.id = m.team_home_id
            LEFT JOIN teams ta ON ta.id = m.team_away_id
            WHERE m.id = $1 AND m.tournament_id = $2`,
            [id, tournamentId]
        );

        if (match.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }

        const events = await pool.query(
            `SELECT 
                me.id,
                me.event_type,
                me.minute,
                me.is_own_goal,
                p.full_name AS player_name,
                p.dorsal,
                t.name AS team_name
             FROM match_events me
             LEFT JOIN players p ON p.id = me.player_id
             LEFT JOIN teams t ON t.id = me.team_id
             WHERE me.match_id = $1
             ORDER BY me.minute ASC`,
            [id]
        );

        res.json({
            match: match.rows[0],
            events: events.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo el partido' });
    }
};

// Actualiza resultados y estados - si termina, actualiza tabla de posiciones
const updateMatch = async (req, res) => {
    const { tournamentId, id } = req.params;
    const organizerId = req.user.id;
    const { goals_home, goals_away, penalty_home, penalty_away, status, start_time, field_name, round } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const tournament = await verifyTournamentOwner(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const existing = await client.query(
            `SELECT  * FROM matches WHERE id = $1 AND tournament_id = $2`,
            [id, tournamentId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }

        const currentMatch = existing.rows[0];

        if (currentMatch.status === 'FINISHED' && status === 'FINISHED') {
            await revertTeamStats(client, currentMatch);
        }

        const result = await client.query(
            `UPDATE matches SET
                goals_home  = COALESCE($1, goals_home),
                goals_away  = COALESCE($2, goals_away),
                penalty_home = COALESCE($3, penalty_home),
                penalty_away = COALESCE($4, penalty_away),
                status = COALESCE($5, status),
                start_time = COALESCE($6, start_time),
                field_name = COALESCE($7, field_name),
                round = COALESCE($8, round)
            WHERE id = $9 AND tournament_id = $10
            RETURNING *`,
            [goals_home, goals_away, penalty_home, penalty_away, status, start_time, field_name, round, id, tournamentId]
        );

        const updatedMatch = result.rows[0];

        if (updatedMatch.status === 'FINISHED' && currentMatch.status !== 'FINISHED') {
            await updateTeamStats(client, updatedMatch);
        }

        if (currentMatch.status === 'FINISHED' && status === 'FINISHED') {
            await updateTeamStats(client, updatedMatch);
        }

        await client.query('COMMIT');

        res.json({
            mensaje: 'Partido actualizado',
            match: updateMatch
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error actualizando el partido' });
    } finally {
        client.release();
    }
};

// Delete solo si el partido no ha terminado
const deleteMatch = async (req, res) => {
    const { tournamentId, id } = req.params;
    const organizerId = req.user.id;

    try {
        const tournament = await verifyTournamentOwner(tournamentId, organizerId);
        if (!tournament) {
            return res.status(404).json({ error: 'Torneo no encontrado' });
        }

        const existing = await pool.query(
            `SELECT * FROM matches WHERE id = $1 AND tournament_id = $2`,
            [id, tournamentId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }

        if (existing.rows[0].status === 'FINISHED') {
            return res.status(400).json({
                error: 'No se puede eliminar un partido finalizado'
            });
        }

        await pool.query(`DELETE FROM matches WHERE id = $1`, [id]);

        res.json({ mensaje: 'Partido eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error eliminando el partido' });
    }
};

module.exports = {
    createMatch,
    getMatches,
    getMatchById,
    updateMatch,
    deleteMatch
};