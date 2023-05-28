const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const middleware = require('../middleware/other')
const getusername = middleware.getusername


// Route definitions

router.post('/new', auth, getusername, async (req, res) => {
    const connection = await req.database.getConnection()

    try {
        const comment = req.body.comment
        if(!comment || comment === '') {
            return res.status(500).send('<h1>You need to supply a comment!</h1>')
        }
        const postId = req.body.postId
        if(!Number.isInteger(parseInt(postId))) {
            return res.status(500).send('<h1>Dont test my patience bud.</h1>')
        }
        const creatorId = req.userId
        const creatorName = req.username

        // start a transaction
        await connection.beginTransaction()

        const insert_query = `INSERT INTO comments (text, post_id, creator_id, creator_name, rating, datetime) VALUES (?, ?, ?, ?,  1,  NOW() )`
        const insert_params = [comment, postId, creatorId, creatorName]
        await connection.query(insert_query, insert_params)

        const commentId_query = `SELECT LAST_INSERT_ID() AS id FROM comments`
        const [results] = await connection.query(commentId_query)
        const commentId = results[0].id

        const rating_query = `INSERT INTO ratings (user_id, comment_id, rating, datetime) VALUES (?, ?, 1, NOW())`
        const rating_params = [creatorId, commentId]
        await connection.query(rating_query, rating_params)

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect(`/posts/${postId}`)
    } 
    catch (error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()
        
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/edit/:id', auth, async (req, res) => {
    try {
        const text = req.body.text
        if(!text || text === '') {
            return res.status(500).send('<h1>You need to supply a comment!</h1>')
        }
        const commentId = req.params.id
        if(!Number.isInteger(parseInt(commentId))) {
            return res.status(500).send('<h1>Dont test my patience bud.</h1>')
        }
        const userId = req.userId
    
        const query = `UPDATE comments SET text = ? WHERE id = ? AND creator_id = ?`
        const params = [text, commentId, userId]
        await req.database.query(query, params)

        return res.redirect(`back`)
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/delete/:id', auth, async (req, res) => {
    const connection = await req.database.getConnection()

    try {
        const commentId = req.params.id
        if(!Number.isInteger(parseInt(commentId))) {
            return res.status(500).send('<h1>Cant delete imaginary comments.</h1>')
        }
        const userId = req.userId

        // start a transaction
        await connection.beginTransaction()

        const find_query = `SELECT * FROM comments WHERE id = ? AND creator_id = ?`
        const find_params = [commentId, userId]
        const [find_results] = await connection.query(find_query, find_params)

        if (find_results.length > 0) {
            const postId = find_results[0].post_id

            const delete_comment_query = `DELETE FROM comments WHERE id = ?`
            const delete_comment_params = [commentId]
            await connection.query(delete_comment_query, delete_comment_params)

            const delete_ratings_query = `DELETE FROM ratings WHERE comment_id = ?`
            const delete_ratings_params = [commentId]
            await connection.query(delete_ratings_query, delete_ratings_params)

            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()

            return res.redirect('back')
        } 
        else {
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()

            return res.status(401).send('<h1>You are not authorized to delete this comment or it doesnt exist</h1>')
        }
    } 
    catch (error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()

        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

//--------------------------------


module.exports = router