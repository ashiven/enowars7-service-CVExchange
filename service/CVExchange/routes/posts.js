const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const middleware = require('../middleware/other')
const getusername = middleware.getusername
const functions = require('../functions/main')
const transaction = functions.transaction


// Route definitions

router.get('/new', auth, async (req, res) => {
    return res.render('newpost', {title: 'New Post'})
})

router.post('/new', auth, getusername, async (req, res) => {
    try {
        const title = req.body.title
        const text = req.body.text
        const creatorId = req.userId
        const creatorName = req.username

        // doing a transaction for these two queries to make sure that last_insert_id() is the correct value
        const insert_query = `INSERT INTO posts (title, text, rating, creator_id, creator_name, datetime) VALUES (?, ?, 1, ?, ?, NOW() )`
        const insert_params = [title, text, creatorId, creatorName]
        const postId_query = `SELECT LAST_INSERT_ID() AS id FROM posts`

        const [results] = await transaction([insert_query, postId_query], [insert_params, []], req.database)
        const postId = results[0].insertId

        const rating_query = `INSERT INTO ratings (user_id, post_id, rating) VALUES (?, ?, 1)`
        const rating_params = [creatorId, postId]
        await req.database.query(rating_query, rating_params)

        return res.redirect('/')
    } 
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id

        const post_query = `SELECT * FROM posts WHERE id = ?`
        const post_params = [postId]
        const [post_results] = await req.database.query(post_query, post_params)

        if (post_results.length === 0) {
            return res.status(404).send('Post not found')
        }

        const comment_query = `SELECT * FROM comments WHERE post_id = ? ORDER BY rating DESC`
        const comment_params = [postId]
        const [comment_results] = await req.database.query(comment_query, comment_params)
        return res.render('post', { req, post: post_results[0], comments: comment_results, title: `${post_results[0].title}` })
    }
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/delete/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id
        const userId = req.userId

        const find_query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
        const find_params = [postId, userId]
        const [results] = await req.database.query(find_query, find_params)

        if (results.length > 0) {
            const delete_post_query = `DELETE FROM posts WHERE id = ?`
            const delete_post_params = [postId]
            await req.database.query(delete_post_query, delete_post_params)

            const delete_comments_query = `DELETE FROM comments WHERE post_id = ?`
            const delete_comments_params = [postId]
            await req.database.query(delete_comments_query, delete_comments_params)

            const delete_ratings_query = `DELETE FROM ratings WHERE post_id = ?`
            const delete_ratings_params = [postId]
            await req.database.query(delete_ratings_query, delete_ratings_params)

            return res.redirect('/user/myposts')
        }
        else {
            return res.status(401).send('You are not authorized to delete this post or the post doesnt exist')
        }
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/edit/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id
        const userId = req.userId
        
        const query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
        const params = [postId, userId]
        const [results] = await req.database.query(query, params)

        if (results.length > 0) {
            return res.render('editpost', { post: results[0], postId, title: 'Edit Post' })
        } 
        else {
            return res.status(404).send('Post not found')
        }
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/edit/:id', auth, async (req, res) => {
    try {
        const title = req.body.title
        const text = req.body.text
        const postId = req.params.id
        const userId = req.userId

        const query = `UPDATE posts SET title = ?, text = ? WHERE id = ? AND creator_id = ?`
        const params = [title, text, postId, userId]
        await req.database.query(query, params)

        return res.redirect('/user/myposts')
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

//--------------------------------


module.exports = router