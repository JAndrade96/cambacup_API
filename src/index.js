const express = require('express');
const cors = require('cors');
require('dotenv').config();


const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/tournaments/:tournamentId/teams', teamRoutes);
app.use('/api/tournaments/:tournamentId/teams/:teamId/players', playerRoutes);

app.get('/', (req, res) => {
  res.send('API de CambaCup funcionando correctamente');
});

if (process.env.NODE_ENV !== 'production') {
  app.get('/test-db', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW()');
      res.json({
        mensaje: 'Conexión exitosa',
        hora_servidor: result.rows[0].now
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error conectando a la BD' });
    }
  });
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});