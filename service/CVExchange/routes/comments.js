const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

//define constants and stuff

const jwtSecret = 'SuperS3cret'

//--------------------------------


//define all of the routes

router.post('/new' , auth, (req, res) => {
    const comment = req.body.comment
    const postId = req.body.postId
    const creatorId = req.userId

    const query = `INSERT INTO comments (text, post_id, creator_id, rating, datetime) VALUES ('${comment}', '${postId}', '${creatorId}', '1',  NOW() )`
    req.database.query(query, (error, results) => {
        if(error) throw error
        res.redirect(`/posts/${postId}`)
    })
})

//--------------------------------

//define middleware

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