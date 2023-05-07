const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const middleware = require('../middleware/other')
const getusername = middleware.getusername


// Route definitions

router.get('/new', auth,  (req, res) => {
    res.render('newpost', {title: 'New Post'})
})

router.post('/new', auth, getusername,  (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const creatorId = req.userId
    const creatorName = req.username

    const query = `INSERT INTO posts (title, text, rating, creator_id, creator_name, datetime) VALUES ('${title}', '${text}', 0, '${creatorId}', '${creatorName}', NOW() )`
    req.database.query(query, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        res.status(200).send('Post created successfully')
    })
})

router.get('/:id',auth, (req, res) => {
    const postId = req.params.id
    let post, comments
    
    const post_query = `SELECT * FROM posts WHERE id = ${postId}`
    req.database.query(post_query, (error, post_results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        if(post_results.length === 0) {
            res.status(404).send('Post not found')
            return
        }
        post = post_results[0]

        const comment_query = `SELECT * FROM comments WHERE post_id = ${postId} ORDER BY rating DESC`
        req.database.query(comment_query, (error, comment_results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }

            comments = comment_results
            res.render('post', {req, post, comments, title: `${post.title}`})
        })
    })
})

router.post('/delete/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId

    const find_query = `SELECT * FROM posts WHERE id = ${postId} AND creator_id = ${userId}`
    req.database.query(find_query, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            const delete_query = `DELETE FROM posts WHERE id = ${postId}`
            req.database.query(delete_query, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }

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
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            res.render('editpost', { post: results[0], postId, title: 'Edit Post' })
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
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        res.redirect('/users/myposts')
    })
})

//--------------------------------


module.exports = router