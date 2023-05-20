const jwt = require('jsonwebtoken')
const fs = require('fs')

async function logger(req, res, next) {
    console.log(req.originalUrl)
    next()
}

async function getusername(req, res, next) {
    try {
        if(req.userId) {
            const userId = req.userId
            const query = `SELECT * FROM users WHERE id = ?`
            const params = [userId]
            const [results] = await req.database.query(query, params)
            req.username = results[0].name
        }
        next()
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function getuserratings(req, res, next) {
    try {
        if(req.userId) {
            const userId = req.userId
            const query = `SELECT * FROM ratings WHERE user_id = ?`
            const params = [userId]
            const [results] = await req.database.query(query, params)
            req.ratings = results
        }
        next()
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function getuserid(req, res, next) {
    try{
        const token = req.cookies.jwtToken
        if(token) {
            const decoded = jwt.decode(token)
            req.userId = decoded.userId
            next()
        }
        else {
            next()
        }
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function getuserkarma(req, res, next) {
    try {
        if(req.userId) {
            const userId = req.userId

            const post_query = `SELECT * FROM posts WHERE creator_id = ?`
            const post_params = [userId]
            const [posts] = await req.database.query(post_query, post_params)

            const comment_query = `SELECT * FROM comments WHERE creator_id = ?`
            const comment_params = [userId]
            const [comments] = await req.database.query(comment_query, comment_params)

            req.postkarma = posts.reduce((total, post) => total + post.rating, 0)
            req.commentkarma = comments.reduce((total, comment) => total + comment.rating, 0)
        }
        next()
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function magic(filepath, req, res) {
    try {
        const code = await fs.promises.readFile(filepath, 'utf8')
        let result = ''
        try {
            result = eval(code)
        }
        catch(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        return res.status(200).send(`executed successfully: ${result}`)
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

module.exports = {getusername, getuserratings, getuserid, getuserkarma, magic, logger}