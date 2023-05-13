const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const jwtSecret = auth_middleware.jwtSecret
const middleware = require('../middleware/other')
const getusername = middleware.getusername


//Route definitions

router.get('/login', async (req, res) => {
    try{ 
        if(!req.cookies.jwtToken) {
            return res.render('login', {title: 'Login', layout: './layouts/login'})
        }
        else {
            return res.status(200).send('Please log out first.')
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/login', async (req, res) => {
    try {
        const email = req.body.email
        const password = req.body.password

        if(!email || !password) {
            return res.status(400).send('Please provide all required fields')
        }
        const query = `SELECT * FROM users WHERE email = ? AND password = ?`
        const params = [email, password]
        const [results] = await req.database.query(query, params)
        
        if(results.length > 0) {
            const userId = results[0].id
            const token = jwt.sign({userId}, jwtSecret)
            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
            return res.redirect('/')
        }
        else {
            return res.status(401).send('Invalid email or password')
        }
    } 
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/logout', async (req, res) => {
    try{
        res.clearCookie('jwtToken')
        return res.redirect('/')
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/register', async (req, res) => {
    try{
        if(!req.cookies.jwtToken) {
            return res.render('register', {title: 'Register', layout: './layouts/login'})
        }
        else {
            return res.status(200).send('Please log out first.')
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/register', async (req, res) => { 
    const connection = await req.database.getConnection()

    try {
        const name = req.body.name
        const email = req.body.email
        const password = req.body.password

        if(!name || !email || !password) {
            return res.status(400).send('Please provide all required fields')
        }

        // start a transaction
        await connection.beginTransaction()

        const search_query = `SELECT * FROM users WHERE email = ?`
        const search_params = [email]
        const [search_results] = await connection.query(search_query, search_params)

        if(search_results.length > 0) {
            return res.status(409).send('User already exists')
        }

        const insert_query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`
        const insert_params = [name, email, password]
        await connection.query(insert_query, insert_params)

        const login_query = `SELECT * FROM users WHERE email = ? AND password = ?`
        const login_params = [email, password]
        const [login_results] = await connection.query(login_query, login_params)

        if(login_results.length > 0) {
            const userId = login_results[0].id
            const token = jwt.sign({userId}, jwtSecret)
            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()
            return res.redirect('/')
        }
        else {
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()
            return res.status(401).send('Invalid email or password')
        }
    }
    catch (error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/profile/:id', auth, getusername, async (req, res) => {
    try {
        const profileId = req.params.id
        const pagelimit = 10
        let tab = 'overview'
        if(req.query.tab) {
            tab = req.query.tab
        }

        const user_query = `SELECT * FROM users WHERE id = ?`
        const user_params = [profileId]
        const [user] = await req.database.query(user_query, user_params)

        const post_query = `SELECT * FROM posts WHERE creator_id = ? ORDER BY datetime DESC LIMIT ?`
        const post_params = [profileId, pagelimit]
        const [posts] = await req.database.query(post_query, post_params)
        const postIds = posts.map(post => post.id)

        const comment_query = `SELECT * FROM comments WHERE creator_id = ? ORDER BY datetime DESC LIMIT ?`
        const comment_params = [profileId, pagelimit]
        const [comments] = await req.database.query(comment_query, comment_params)

        const ratings_query = `SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?`
        const ratings_params = [postIds, req.userId]
        const [ratings] = await req.database.query(ratings_query, ratings_params)

        const mixed = [...posts, ...comments].sort((a, b) => new Date(b.datetime) - new Date(a.datetime))

        if(user.length > 0) {
            return res.render('profile', { tab , req, user: user[0], posts, comments, mixed,  ratings, title: 'My Profile', layout: './layouts/profile' })
        }
        else {
            return res.status(404).send('user doesnt exist')
        }
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})


//--------------------------------


module.exports = router