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

router.get('/edit/:id' , auth, (req, res) => {
    const commentId = req.params.id
    const userId = req.userId
    
    const query = `SELECT * FROM comments WHERE id = ${commentId} AND creator_id = ${userId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        if(results.length > 0) {
            res.render('editcomment', { comment: results[0], commentId })
        }
        else {
            res.status(404).send('Comment not found')
        }
    })
})

router.post('/edit/:id' , auth, (req, res) => {
    const text = req.body.text
    const postId = req.body.postId
    const commentId = req.params.id
    const userId = req.userId

    const query = `UPDATE comments SET text = '${text}' WHERE id = ${commentId} AND creator_id = ${userId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        res.redirect(`/posts/${postId}`)
    })
})

router.post('/delete/:id', auth,  (req, res) => {
    const commentId = req.params.id
    const userId = req.userId
    const postId = req.body.postId

    const find_query = `SELECT * FROM comments WHERE id = ${commentId} AND creator_id = ${userId}`
    req.database.query(find_query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            const delete_query = `DELETE FROM comments WHERE id = ${commentId}`
            req.database.query(delete_query, (error, results) => {
                if(error) throw error
                res.redirect(`/posts/${postId}`)
            })
        }
        else {
            res.status(401).send('You are not authorized to delete this comment')
        }
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