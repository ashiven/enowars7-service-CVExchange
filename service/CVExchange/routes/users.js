const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const jwtSecret = auth_middleware.jwtSecret


//Route definitions


router.get('/login', (req, res) => {
    res.render('login', {title: 'Login'})
})

router.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password

    if(!email || !password) {
        return res.status(400).send('Please provide all required fields')
    }

    const query = `SELECT * FROM users WHERE email = ? AND password = ?`
    const params = [email, password]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            const userId = results[0].id
            const token = jwt.sign({userId}, jwtSecret)
            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
            return res.redirect('/')
        }
        else {
            return res.status(401).send('Invalid email or password')
        }
    })
})

router.post('/logout', (req, res) => {
    res.clearCookie('jwtToken')
    return res.redirect('/')
})

router.get('/register', (req, res) => {
    return res.render('register', {title: 'Register'})
})

router.post('/register', (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password

    if(!name || !email || !password) {
        return res.status(400).send('Please provide all required fields')
    }

    const search_query = `SELECT * FROM users WHERE email = ?`
    const search_params = [email]
    req.database.query(search_query, search_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            return res.status(409).send('User already exists')
        }

        const insert_query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`
        const insert_params = [name, email, password]
        req.database.query(insert_query, insert_params, (error, results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }
            
            const login_query = `SELECT * FROM users WHERE email = ? AND password = ?`
            const login_params = [email, password]
            req.database.query(login_query, login_params,  (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
        
                if(results.length > 0) {
                    const userId = results[0].id
                    const token = jwt.sign({userId}, jwtSecret)
                    res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
                    return res.redirect('/')
                }
            })
        })
    })
})

router.get('/profile', auth, (req, res) => {
    const userId = req.userId

    const query = `SELECT * FROM users WHERE id = ?`
    const params = [userId]
    req.database.query(query, params,  (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            return res.render('profile', { user: results[0], title: 'My Profile' })
        }
    })
})

router.get('/myposts', auth, (req, res) => {
    const pagelimit = 10
    const userId = req.userId

    const query = `SELECT * FROM posts WHERE creator_id = ? ORDER BY datetime DESC LIMIT ?`
    const params = [userId, pagelimit]

    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        if(results.length > 0) {
            return res.render('myposts', { req, posts: results, title: 'My Posts' })
        }
        else {
            return res.send('You havent posted anything yet.')
        }
    })
})


//--------------------------------


module.exports = router