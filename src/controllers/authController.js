const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


//Controlador Registro
const register = async (req, res) => {
    const { email, password, full_name, phone } = req.body;

    try {

        const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, phone) 
             VALUES ($1, $2, $3, $4) RETURNING id, email, role, plan`,
            [email, passwordHash, full_name, phone]
        );

        const token = jwt.sign(
            { id: newUser.rows[0].id, role: newUser.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            mensaje: 'Usuario registrado con éxito',
            token: token,
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al registrar' });
    }
};

//Controlador Login

const login = async (req, res) => {
    const { email, password } = req.body;

    try {

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            mensaje: 'Login exitoso',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                plan: user.plan
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = { 
    register, 
    login 
};