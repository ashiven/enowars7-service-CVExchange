const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth


//define all of the routes

router.post('/new' , auth, getusername, (req, res) => {
    const comment = req.body.comment
    const postId = req.body.postId
    const creatorId = req.userId
    const creatorName = req.username

    const query = `INSERT INTO comments (text, post_id, creator_id, creator_name,  rating, datetime) VALUES ('${comment}', '${postId}', '${creatorId}', '${creatorName}',  '1',  NOW() )`
    req.database.query(query, (error, results) => {
        if(error) throw error
        res.redirect(`/posts/${postId}`)
    })
})

//TODO: add functionality to these routes 
router.post('/edit' , auth, (req, res) => {
    const comment = req.body.comment
    const postId = req.body.postId
    const creatorId = req.userId

    const query = `INSERT INTO comments (text, post_id, creator_id, rating, datetime) VALUES ('${comment}', '${postId}', '${creatorId}', '1',  NOW() )`
    req.database.query(query, (error, results) => {
        if(error) throw error
        res.redirect(`/posts/${postId}`)
    })
})

router.post('/delete' , auth, (req, res) => {
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

//middleware to get the username for the request
function getusername(req, res, next) {
    const userId = req.userId
    const query = `SELECT * FROM users WHERE id = ${userId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        req.username = results[0].name
        next()
    })
}

//--------------------------------

module.exports = router