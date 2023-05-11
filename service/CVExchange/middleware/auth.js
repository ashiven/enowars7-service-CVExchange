const jwt = require('jsonwebtoken')
const jwtSecret = 'SuperS3cret'

async function auth(req, res, next) {
    const token = req.cookies.jwtToken

    if(token) {
        jwt.verify(token, jwtSecret, (error, decoded) => {
            if(error) {
                res.status(401).send('<h1>Unauthenticated</h1>') 
            }
            req.userId = decoded.userId
            next()
        })
    }
    else {
        res.status(401).send('<h1>Unauthenticated</h1>') 
    }
}

// ATTENTION: FIRST VULNERABILITY HERE!!!! (Parameter Tampering/Broken Authentication)
// An Id can be supplied in the params of a get request which will be used to authenticate the user accessing a file resource.
// With this faulty authentication mechanism an attacker can access files from a user directory not belonging to them.
async function fileAuth(req, res, next)  {
    const filepath = req.originalUrl
    var userId = req.userId
    
    if(req.query.Id) {
        userId = req.query.Id
    }
    if (filepath.startsWith('/uploads/' + Buffer.from(userId.toString()).toString('base64') + '/')) {
        next()
    }
    else {
        return res.status(403).send('<h1>You are not allowed to access this users files</h1>')
    }
}


module.exports = { auth, fileAuth,  jwtSecret }