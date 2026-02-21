const pool = require('../config/db');
const crypto = require('crypto');

// Generamos la invitación (Lo hace el organizador)
const createInvitacion = async (req, res) => {
    const organizerId = req.user.id;

    try {
        const token = crypto.randomBytes(4).toString('hex');

        await pool.query(
            `INSERT INTO invitations (organizer_id, token) VALUES ($1, $2)`,
            [organizerId, token]
        );
        const link = `https://camba.app/join?code=${token}`;

        res.json({
            mensaje: 'Invitación creada',
            codigo: token,
            link_whatsapp: link
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando invitación' });
    }
};

//Aceptar invitación (Lo hace el colaborador)
const acceptInvitation = async (req, res) => {
    const collaboratorId = req.user.id;
    const { token } = req.body;

    const client = await pool.connect();

    try {
        const inviteResult = await client.query(
            `SELECT * FROM invitations WHERE token = $1 AND status = 'PENDING'`,
            [token]
        );

        if (inviteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invitación inválida o ya utilizada' });
        }

        const invitation = inviteResult.rows[0];
        const organizerId = invitation.organizer_id;

        if (organizerId === collaboratorId) {
            return res.status(400).json({ error: 'No puedes ser colaborador de ti mismo' });
        }

        await client.query(
            `INSERT INTO collaborators (organizer_id, collaborator_id, can_edit_results) VALUES ($1, $2, true)`,
            [organizerId, collaboratorId]
        );

        await client.query(
            `UPDATE invitations SET status = 'ACCEPTED' WHERE id = $1`,
            [invitation.id]
        );

        await client.query(
            `UPDATE users SET role = 'COLLABORATOR' WHERE id = $1`,
            [collaboratorId]
        );

        await client.query('COMMIT');
        client.release();

        res.json({
            mensaje: '¡Ahora eres colaborador!',
            jefe_id: organizerId
        });
    } catch (error) {
        if(error.code === '23505') {
            return res.status(400).json({ error: 'Ya eres colaborador de este usuario' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error al aceptar invitación' });
    }
};

module.exports = {
    createInvitacion,
    acceptInvitation
};
