const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.log('Authorization Failed: No user found in request');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            console.log(`Authorization Failed: User role "${req.user.role}" not in required roles [${roles.join(', ')}]`);
            return res.status(403).json({ message: 'Forbidden: You do not have the required role' });
        }

        next();
    };
};

module.exports = { authorize };
