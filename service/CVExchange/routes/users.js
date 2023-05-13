const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const jwtSecret = auth_middleware.jwtSecret


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

router.get('/profile', auth, async (req, res) => {
    try {
        const userId = req.userId

        const query = `SELECT * FROM users WHERE id = ?`
        const params = [userId]
        const [results] = await req.database.query(query, params)

        if(results.length > 0) {
            return res.render('profile', { user: results[0], title: 'My Profile' })
        }
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/myposts', auth, async (req, res) => {
    try {
        const pagelimit = 10
        const userId = req.userId

        const query = `SELECT * FROM posts WHERE creator_id = ? ORDER BY datetime DESC LIMIT ?`
        const params = [userId, pagelimit]
        const [results] = await req.database.query(query, params)

        if(results.length > 0) {
            return res.render('myposts', { req, posts: results, title: 'My Posts' })
        }
        else {
            return res.send('You havent posted anything yet.')
        }
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})


//--------------------------------


module.exports = router