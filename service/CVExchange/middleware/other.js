const jwt = require('jsonwebtoken')
const util = require('node:util')
const execFile = util.promisify(require('node:child_process').execFile)


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

async function getsubids(req, res, next) {
    try {
        if(req.userId) {
            const userId = req.userId

            const select_query = `SELECT subscribed FROM users WHERE id = ?`
            const select_params = [userId]
            const [subscribedRes] = await req.database.query(select_query, select_params)
            const subbedString = subscribedRes[0].subscribed
            const subscribed = subbedString ? subbedString.split(',').map(Number) : []

            req.subscribed = subscribed
        }
        next()
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function getsubs(req, res, next) {
    try {
        if(req.userId && req.subscribed.length > 0) {

            const select_query = `SELECT * FROM subs WHERE id IN (?)`
            const select_params = [req.subscribed]
            const [subs] = await req.database.query(select_query, select_params)

            req.subs = subs
        }
        next()
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function gettopsubs(req, res, next) {
    try {
            const select_query = `SELECT * FROM subs ORDER BY members DESC LIMIT 17`
            const select_params = [req.subscribed]
            const [subs] = await req.database.query(select_query, select_params)

            req.topsubs = subs
            next()
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

async function magic(filepath, req, res) {
    try {
        const {stdout, stderr} = await execFile('node', [filepath], {uid: 1001, gid: 1001, timeout: 3000} )
        return res.send(`<h1>stdout:</h1>&nbsp;${stdout} <br> <h1>stderr:</h1>&nbsp;${stderr}`)
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
}

module.exports = {getusername, getuserratings, getuserid, getuserkarma, getsubids, getsubs, gettopsubs, magic, logger}