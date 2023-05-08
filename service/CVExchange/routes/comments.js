const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const middleware = require('../middleware/other')
const getusername = middleware.getusername
const functions = require('../functions/main')
const transaction = functions.transaction


// Route definitions

router.post('/new', auth, getusername, async (req, res) => {
    try {
        const comment = req.body.comment
        const postId = req.body.postId
        const creatorId = req.userId
        const creatorName = req.username

        // doing a transaction for these two queries to make sure that last_insert_id() is the correct value
        const insert_query = `INSERT INTO comments (text, post_id, creator_id, creator_name, rating, datetime) VALUES (?, ?, ?, ?,  1,  NOW() )`
        const insert_params = [comment, postId, creatorId, creatorName]
        const commentId_query = `SELECT LAST_INSERT_ID() AS id FROM comments`

        const [results] = await transaction([insert_query, commentId_query], [insert_params, []], req.database)
        const commentId = results[0].insertId

        const rating_query = `INSERT INTO ratings (user_id, comment_id, rating) VALUES (?, ?, 1)`
        const rating_params = [creatorId, commentId]
        await req.database.query(rating_query, rating_params)

        return res.redirect(`/posts/${postId}`)
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/edit/:id', auth, async (req, res) => {
    try {
        const commentId = req.params.id
        const userId = req.userId
        
        const query = `SELECT * FROM comments WHERE id = ? AND creator_id = ?`
        const params = [commentId, userId]
        const [results] = await req.database.query(query, params)

        if(results.length > 0) {
            return res.render('editcomment', { comment: results[0], commentId, title: 'Edit Comment' })
        }
        else {
            return res.status(404).send('Comment not found')
        }
    } 
    catch(error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/edit/:id', auth, async (req, res) => {
    try {
        const text = req.body.text
        const postId = req.body.postId
        const commentId = req.params.id
        const userId = req.userId
    
        const query = `UPDATE comments SET text = ? WHERE id = ? AND creator_id = ?`
        const params = [text, commentId, userId]
        await req.database.query(query, params)

        return res.redirect(`/posts/${postId}`)
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/delete/:id', auth, async (req, res) => {
    try {
        const commentId = req.params.id
        const userId = req.userId
        const postId = req.body.postId

        const find_query = `SELECT * FROM comments WHERE id = ? AND creator_id = ?`
        const find_params = [commentId, userId]
        const [find_results] = await req.database.query(find_query, find_params)

        if (find_results.length > 0) {
            const delete_query = `DELETE FROM comments WHERE id = ?`
            const delete_params = [commentId]
            await req.database.query(delete_query, delete_params)

            return res.redirect(`/posts/${postId}`)
        } 
        else {
            return res.status(401).send('You are not authorized to delete this comment or it doesnt exist')
        }
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

//--------------------------------


module.exports = router