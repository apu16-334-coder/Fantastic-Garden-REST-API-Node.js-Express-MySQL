const jwt = require("jsonwebtoken");

const generateToken = (playload) => {
    return jwt.sign(
        playload, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN }
    )
}

module.exports = generateToken;