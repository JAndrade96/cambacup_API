const authorize = (allowedRoles) => {
    return (req, res, next) => {

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                error: 'Acceso prohibido: No tienes el rol necesario para esta acción.' 
            });
        }

        next();
    };
};

module.exports = authorize;