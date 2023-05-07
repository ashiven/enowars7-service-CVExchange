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

    const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`

    req.database.query(query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            const userId = results[0].id
            const token = jwt.sign({userId}, jwtSecret)
            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
            res.redirect('/')
        }
        else {
            res.status(401).send('Invalid email or password')
        }
    })
})

router.post('/logout', (req, res) => {
    res.clearCookie('jwtToken')
    res.redirect('/')
})

router.get('/register', (req, res) => {
    res.render('register', {title: 'Register'})
})

router.post('/register', (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password

    if(!name || !email || !password) {
        return res.status(400).send('Please provide all required fields')
    }

    const search_query = `SELECT * FROM users WHERE email = '${email}'`
    req.database.query(search_query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            res.status(409).send('User already exists')
        }

        const insert_query = `INSERT INTO users (name, email, password) VALUES ('${name}', '${email}', '${password}')`
        req.database.query(insert_query, (error, results) => {
            if(error) throw error
            
            const login_query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`
            req.database.query(login_query, (error, results) => {
                if(error) throw error
        
                if(results.length > 0) {
                    const userId = results[0].id
                    const token = jwt.sign({userId}, jwtSecret)
                    res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
                    res.redirect('/')
                }
            })
        })
    })
})

router.get('/profile', auth, (req, res) => {
    const userId = req.userId

    const query = `SELECT * FROM users WHERE id = '${userId}'`

    req.database.query(query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            res.render('profile', { user: results[0], title: 'My Profile' })
        }
    })
})

router.get('/myposts', auth, (req, res) => {
    const pagelimit = 10
    const query = `SELECT * FROM posts WHERE creator_id = ${req.userId} ORDER BY datetime DESC LIMIT ${pagelimit}`

    req.database.query(query, (error, results) => {
        if(error) throw error
        
        if(results.length > 0) {
            res.render('myposts', { req, posts: results, title: 'My Posts' })
        }
        else {
            res.send('You havent posted anything yet.')
        }
    })
})


//--------------------------------


module.exports = router