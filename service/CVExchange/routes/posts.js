const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth


//define all of the routes

router.get('/', (req, res) => {
    const pagelimit = 10
    const query = `SELECT * FROM posts ORDER BY datetime DESC LIMIT ${pagelimit}`
    let posts

    req.database.query(query, (error, results) => {
        if(error) throw error
        
        posts = results
        res.render('posts', { posts })
    })
})

router.get('/new', auth,  (req, res) => {
    res.render('newpost')
})

router.post('/new', auth, getusername,  (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const creatorId = req.userId
    const creatorName = req.username

    const query = `INSERT INTO posts (title, text, rating, creator_id, creator_name, datetime) VALUES ('${title}', '${text}', '1', '${creatorId}', '${creatorName}', NOW() )`
    req.database.query(query, (error, results) => {
        if(error) throw error
        res.status(200).send('Post created successfully')
    })
})

router.get('/:id', (req, res) => {
    const postId = req.params.id
    let post, comments
    
    const post_query = `SELECT * FROM posts WHERE id = ${postId}`
    req.database.query(post_query, (error, post_results) => {
        if(error) throw error
        
        if(post_results.length === 0) {
            res.status(404).send('Post not found')
            return
        }
        post = post_results[0]

        const comment_query = `SELECT * FROM comments WHERE post_id = ${postId}`
        req.database.query(comment_query, (error, comment_results) => {
            if(error) throw error

            comments = comment_results
            res.render('post', {post, comments})
        })
    })
})

router.post('/delete/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId

    const find_query = `SELECT * FROM posts WHERE id = ${postId} AND creator_id = ${userId}`
    req.database.query(find_query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            const delete_query = `DELETE FROM posts WHERE id = ${postId}`
            req.database.query(delete_query, (error, results) => {
                if(error) throw error
                res.redirect('/users/myposts')
            })
        }
        else {
            res.status(401).send('You are not authorized to delete this post')
        }
    })
})

router.get('/edit/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId
    
    const query = `SELECT * FROM posts WHERE id = ${postId} AND creator_id = ${userId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        if(results.length > 0) {
            res.render('editpost', { post: results[0], postId })
        }
        else {
            res.status(404).send('Post not found')
        }
    })
})

router.post('/edit/:id', auth,  (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const postId = req.params.id
    const userId = req.userId

    const query = `UPDATE posts SET title = '${title}', text = '${text}' WHERE id = ${postId} AND creator_id = ${userId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        res.redirect('/users/myposts')
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