const jwt = require('jsonwebtoken')
// ATTENTION: THIRD VULNERABILITY HERE!!!! (Misconfiguration/Default Credentials)
// Anyone having access to the source code can see the jwtSecret
// and use it to generate session tokens for arbitrary users
// A fix would simply consist in changing the jwtSecret
const jwtSecret = '5up3r53cr37'

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

// ATTENTION: FIRST VULNERABILITY HERE!!!! (Broken Authentication)
// The files in the private directory can be accessed via path traversal by accessing for example the URL
// /uploads/MQ==/public/../private/flag.txt this works because we only authenticate for file access when the URL is like /uploads/MQ==/private/flag.txt
// A fix would consist of removing the line: app.use('/uploads', express.static('./uploads')) in app.js  
// and defining a route for /uploads/:userId/public/:filename
async function fileAuth(req, res, next)  {
    try {
        const filepath = req.originalUrl
        const userId = req.userId 

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