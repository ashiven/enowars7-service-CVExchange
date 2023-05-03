const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const jwtSecret = auth_middleware.jwtSecret


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



module.exports = router