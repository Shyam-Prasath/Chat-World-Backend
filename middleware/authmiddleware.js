const jwt = require('jsonwebtoken');
const UserModel = require('../model/UserModel');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1]; // Extract token from "Bearer <token>"
            const decoded = jwt.verify(token, process.env.JWT_TOKEN); // Verify token using the JWT secret
            const user = await UserModel.findById(decoded.id).select('-password'); // Add user info to request
            if(!user){
                return res.status(401).json({error: 'User not found'})
            }
            req.user = user
            return next(); // Proceed to the next middleware or route handler
        } catch (error) {
            console.log('Token verified failed:',error.message)
            return res.status(401).json({ error: 'Token failed' });
        }
    }
    else {
        return res.status(401).json({ error: 'No Token Provided' });
    }
};

module.exports = { protect };
