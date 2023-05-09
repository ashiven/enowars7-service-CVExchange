const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth


// Route definitions

router.post('/ratepost', auth, async (req, res) => {
        const userId = req.userId
        const rating = parseInt(req.body.rating)
        const postId = req.body.postId
        const page = req.body.page

        if (!(rating === 1 || rating === -1)) {
            return res.status(400).send('Yea.. I see what you were trying to do ;)')
        }

        const connection = await req.database.getConnection()

    try {
        // start a transaction
        await connection.beginTransaction()

        const search_query = `SELECT * FROM ratings WHERE user_id = ? AND post_id = ?`
        const search_params = [userId, postId]
        const [searchResults] = await connection.query(search_query, search_params)

        //if the user already voted on that post, update their rating
        if (searchResults.length > 0) {
            const update_query = `UPDATE ratings SET rating = ? WHERE user_id = ? AND post_id = ?`
            const update_params = [rating, userId, postId]
            await connection.query(update_query, update_params)
        }
        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, post_id, rating) VALUES (?, ?, ?)`
            const insert_params = [userId, postId, rating]
            await connection.query(insert_query, insert_params)
        }

        //now we accumulate the ratings of a post and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE post_id = ?`
        const acc_params = [postId]
        const [acc_results] = await connection.query(acc_query, acc_params)

        const total = acc_results[0].total_rating
        const post_query = `UPDATE posts SET rating = ? WHERE id = ?`
        const post_params = [total, postId]
        await connection.query(post_query, post_params)

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect(`${page}`)
    } 
    catch (error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()

        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/ratecomment', auth, async (req, res) => {
        const userId = req.userId 
        const rating = parseInt(req.body.rating)
        const commentId = req.body.commentId
        const page = req.body.page

        if(!(rating === 1 || rating === -1)) {
            return res.status(400).send('Yea.. I see what you were trying to do ;)')
        }

        const connection = await req.database.getConnection()

    try {
        // start a transaction
        await connection.beginTransaction()

        const search_query = `SELECT * FROM ratings WHERE user_id = ? AND comment_id = ?`
        const search_params = [userId, commentId]
        const [searchResults] = await connection.query(search_query, search_params)

        //if the user already voted on that comment, update their rating
        if(searchResults.length > 0) {
            const update_query = `UPDATE ratings SET rating = ? WHERE user_id = ? AND comment_id = ?`
            const update_params = [rating, userId, commentId]
            await connection.query(update_query, update_params)
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, comment_id, rating) VALUES (?, ?, ?)`
            const insert_params = [userId, commentId, rating]
            await connection.query(insert_query, insert_params)
        }

        //now we accumulate the ratings of a comment and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE comment_id = ?`
        const acc_params = [commentId]
        const [accResults] = await connection.query(acc_query, acc_params)

        const total = accResults[0].total_rating
        const comment_query = `UPDATE comments SET rating = ? WHERE id = ?`
        const comment_params = [total, commentId]
        await connection.query(comment_query, comment_params)

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect(`${page}`)
    } 
    catch(error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()
        
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

//--------------------------------


module.exports = router