const express = require('express');
const cors = require('cors');

const pool = require('./config/db'); 
const authRoutes = require('./routes/authRoutes');
const inviteRoutes = require('./routes/inviteRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);

app.get('/', (req, res) => {
  res.send('API de CambaCup funcionando correctamente');
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});