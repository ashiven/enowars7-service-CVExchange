const jwt = require('jsonwebtoken')
const jwtSecret = 'SuperS3cret'

function auth(req, res, next) {
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
// An Id can be supplied in the params of a get request which will be used to authenticate the user accessing a file resource
// with this faulty authentication mechanism an attacker can access files from a user directory not belonging to them
const fileAuth = async (req, res, next) => {
    const userId = req.userId
    const filepath = req.originalUrl
    //This is where it all goes wrong
    const Id = req.query.Id
    
    if(Id) {
        if (filepath.startsWith('/uploads/' + Id + '/')) {
            next()
        }
        else {
            return res.status(403).send('<h1>You are not allowed to access this users files</h1>')
        }
    }
    else if (filepath.startsWith('/uploads/' + userId + '/')) {
        next()
    }
    else {
        return res.status(403).send('<h1>You are not allowed to access this users files</h1>')
    }
}


module.exports = { auth, fileAuth,  jwtSecret }