const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

//define constants and stuff

const jwtSecret = 'SuperS3cret'

//--------------------------------

//define all of the routes
router.get('/login', (req, res) => {
    res.render('login')
})

router.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password

    const subquery = 'SELECT users.id, users.name, passwords.password FROM users JOIN passwords ON users.id = passwords.id'
    const query = `${subquery} WHERE email = '${email}' AND password = '${password}'`

    req.database.query(query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            const userId = results[0].id
            const token = jwt.sign({userId}, jwtSecret)
            res.cookie('jwtToken', token, { httpOnly: true, secure: true, sameSite: 'none' })
            res.status(200).send('Login successful')
        }
        else {
            res.status(401).send('Invalid email or password')
        }
    })

})

router.post('/logout', (req, res) => {
    res.clearCookie('jwtToken')
    res.redirect('./login')
})

router.get('/register', (req, res) => {
    res.render('register')
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

        const insert_query_users = `INSERT INTO users (name, email) VALUES ('${name}', '${email}')`
        const insert_query_passwords = `INSERT INTO passwords (password) VALUES ('${password}')`
        req.database.query(insert_query_users, (error, results) => {
            if(error) throw error
        })
        req.database.query(insert_query_passwords, (error, results) => {
            if(error) throw error

            res.status(200).send('User created successfully')
        })
    })
})

router.get('/profile', auth, (req, res) => {
    const userId = req.userId

    const query = `SELECT * FROM users WHERE id = '${userId}'`

    req.database.query(query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            res.render('profile', { username: results[0].name })
        }
    })
})

//--------------------------------

//middleware definitions
function auth(req, res, next) {
    const token = req.cookies.jwtToken

    if(token) {
        jwt.verify(token, jwtSecret, (error, decoded) => {
            if(error) {
                res.status(401).send('Unauthenticated') 
            }
            req.userId = decoded.userId
            next()
        })
    }
    else {
        res.status(401).send('Unauthenticated') 
    }
}

//--------------------------------


module.exports = router