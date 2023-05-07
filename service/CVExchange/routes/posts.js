const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const middleware = require('../middleware/other')
const getusername = middleware.getusername


// Route definitions

router.get('/new', auth,  (req, res) => {
    return res.render('newpost', {title: 'New Post'})
})

router.post('/new', auth, getusername,  (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const creatorId = req.userId
    const creatorName = req.username

    const query = `INSERT INTO posts (title, text, rating, creator_id, creator_name, datetime) VALUES (?, ?, 0, ?, ?, NOW() )`
    const params = [title, text, creatorId, creatorName]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        return res.redirect('/')
    })
})

router.get('/:id',auth, (req, res) => {
    const postId = req.params.id
    
    const post_query = `SELECT * FROM posts WHERE id = ?`
    const post_params = [postId]
    req.database.query(post_query, post_params, (error, post_results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        if(post_results.length === 0) {
            return res.status(404).send('Post not found')
        }
        const post = post_results[0]

        const comment_query = `SELECT * FROM comments WHERE post_id = ? ORDER BY rating DESC`
        const comment_params = [postId]
        req.database.query(comment_query, comment_params, (error, comment_results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }

            return res.render('post', {req, post, comments: comment_results, title: `${post.title}`})
        })
    })
})

router.post('/delete/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId

    const find_query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
    const find_params = [postId, userId]
    req.database.query(find_query, find_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            const delete_query = `DELETE FROM posts WHERE id = ?`
            const delete_params = [postId]
            req.database.query(delete_query, delete_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }

                return res.redirect('/user/myposts')
            })
        }
        else {
            return res.status(401).send('You are not authorized to delete this post or the post doesnt exist')
        }
    })
})

router.get('/edit/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId
    
    const query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
    const params = [postId, userId]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        if(results.length > 0) {
            return res.render('editpost', { post: results[0], postId, title: 'Edit Post' })
        }
        else {
            return res.status(404).send('Post not found')
        }
    })
})

router.post('/edit/:id', auth,  (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const postId = req.params.id
    const userId = req.userId

    const query = `UPDATE posts SET title = ?, text = ? WHERE id = ? AND creator_id = ?`
    const params = [title, text, postId, userId]
    req.database.query(query, params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }
        
        return res.redirect('/user/myposts')
    })
})

//--------------------------------


module.exports = router