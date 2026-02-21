const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {

    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Falta el token.' });
    }

    try {

        const cleanToken = token.replace('Bearer ', '');
        
        const verified = jwt.verify(cleanToken, process.env.JWT_SECRET);

        req.user = verified;
        
        next();

    } catch (error) {
        res.status(400).json({ error: 'Token inválido o expirado' });
    }
};