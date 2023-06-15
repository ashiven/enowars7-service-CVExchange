require('dotenv').config()
const jwtSecret = process.env.JWT_SECRET
const jwt = require('jsonwebtoken')
const { promisify } = require('util')
const verifyAsync = promisify(jwt.verify)

async function auth(req, res, next) {
    try {
        const token = req.cookies.jwtToken
        if(token) {
            const decoded = await verifyAsync(token, jwtSecret)
            req.userId = decoded.userId
            next()
        }
        else {
            return res.status(401).send('<h1>Unauthenticated</h1>') 
        }
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function fileAuth(req, res, next)  {
    try {
        const filepath = req.originalUrl
        const userId = req.userId 

        if (filepath.startsWith('/uploads/' + Buffer.from(userId.toString()).toString('base64') + '/')) {
            next()
        }
        else {
            return res.status(403).send('<h1>You are not allowed to access this users files.</h1>')
        }
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}


module.exports = { auth, fileAuth,  jwtSecret }