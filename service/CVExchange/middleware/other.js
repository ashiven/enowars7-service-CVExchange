const jwt = require('jsonwebtoken')
const jwtSecret = 'SuperS3cret'

async function logger(req, res, next) {
    console.log(req.originalUrl)
    next()
}

async function errorHandler(error, req, res, next) {
    if(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
    next()
}

async function getusername(req, res, next) {
    try {
        const userId = req.userId
        const query = `SELECT * FROM users WHERE id = ?`
        const params = [userId]
        const [results] = await req.database.query(query, params)
        req.username = results[0].name
        next()
    } 
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function getuserratings(req, res, next) {
    try {
        const userId = req.userId
        const query = `SELECT * FROM ratings WHERE user_id = ?`
        const params = [userId]
        const [results] = await req.database.query(query, params)
        req.ratings = results
        next()
    } 
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function getuserid(req, res, next) {
    const token = req.cookies.jwtToken
    if(token) {
        try {
            const decoded = jwt.decode(token, jwtSecret)
            req.userId = decoded.userId
            next()
        }
        catch(error) {
            next(error)
        }
    }
    else {
        next()
    }
}


module.exports = {getusername, getuserratings, getuserid, logger, errorHandler}