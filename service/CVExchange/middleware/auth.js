const jwt = require('jsonwebtoken')
const jwtSecret = 'SuperS3cret'

async function auth(req, res, next) {
    try{
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
            return res.status(401).send('<h1>Unauthenticated</h1>') 
        }
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

// ATTENTION: FIRST VULNERABILITY HERE!!!! (Parameter Tampering/Broken Authentication)
// (Method 1):  An Id can be supplied in the params of a get request which will be used to authenticate the user accessing a file resource.
//              With this faulty authentication mechanism an attacker can access files from a user directory not belonging to them.
// (Method 2):  Alternatively the files in the private directory can be accessed via path traversal by accessing for example the URL
//              /uploads/MQ==/public/../private/flag.txt this works because we only authenticate for file access when the URL is like /uploads/MQ==/private/flag.txt
async function fileAuth(req, res, next)  {
    try {
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
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}


module.exports = { auth, fileAuth,  jwtSecret }