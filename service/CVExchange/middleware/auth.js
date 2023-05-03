const jwt = require('jsonwebtoken')
const jwtSecret = 'SuperS3cret'

function auth(req, res, next) {
    const token = req.cookies.jwtToken

    if(token) {
        jwt.verify(token, jwtSecret, (error, decoded) => {
            if(error) {
                res.status(401).send('Unauthenticated') 
            }
            req.userId = decoded.userId
            req.username = decoded.username
            next()
        })
    }
    else {
        res.status(401).send('Unauthenticated') 
    }
}

module.exports = { auth, jwtSecret }