const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth


// Route definitions

router.post('/ratepost', auth, async (req, res) => {
    const connection = await req.database.getConnection()

    try {
        const userId = req.userId
        const rating = parseInt(req.body.rating)
        if (!(rating === 1 || rating === -1)) {
            await connection.release()
            return res.status(400).send('<h1>Yea.. I see what you were trying to do ;)</h1>')
        }
        const postId = req.body.postId
        if (!Number.isInteger(parseInt(postId))) {
            await connection.release()
            return res.status(500).send('<h1>That wont work.</h1>')
        }

        // start a transaction
        await connection.beginTransaction()

        const search_query = `SELECT * FROM ratings WHERE user_id = ? AND post_id = ?`
        const search_params = [userId, postId]
        const [searchResults] = await connection.query(search_query, search_params)

        //if the user already voted on that post, update/delete their rating
        if (searchResults.length > 0) {
            //they are submitting the same rating again
            if(searchResults[0].rating === rating) {
                const delete_query = `DELETE FROM ratings WHERE user_id = ? AND post_id = ?`
                const delete_params = [userId, postId]
                await connection.query(delete_query, delete_params)
            }
            //they are submitting the opposite rating
            else {
                const update_query = `UPDATE ratings SET rating = ?, datetime = NOW() WHERE user_id = ? AND post_id = ?`
                const update_params = [rating, userId, postId]
                await connection.query(update_query, update_params)
            }
        }
        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, post_id, rating, datetime) VALUES (?, ?, ?, NOW())`
            const insert_params = [userId, postId, rating]
            await connection.query(insert_query, insert_params)
        }

        //now we accumulate the ratings of a post and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE post_id = ?`
        const acc_params = [postId]
        const [accResults] = await connection.query(acc_query, acc_params)

        //we need an if/else in case the post has 0 votes, meaning it should receive a rating of 0
        const total = accResults[0].total_rating
        if(total !== null) {
            const post_query = `UPDATE posts SET rating = ? WHERE id = ?`
            const post_params = [total, postId]
            await connection.query(post_query, post_params)
        }
        else {
            const post_query = `UPDATE posts SET rating = 0 WHERE id = ?`
            const post_params = [postId]
            await connection.query(post_query, post_params)
        }

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect(`back`)
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
    const connection = await req.database.getConnection()

    try {
        const userId = req.userId 
        const rating = parseInt(req.body.rating)
        if(!(rating === 1 || rating === -1)) {
            await connection.release()
            return res.status(400).send('<h1>Yea.. I see what you were trying to do ;)</h1>')
        }
        const commentId = req.body.commentId
        if (!Number.isInteger(parseInt(commentId))) {
            await connection.release()
            return res.status(500).send('<h1>That wont work.</h1>')
        }

        // start a transaction
        await connection.beginTransaction()

        const search_query = `SELECT * FROM ratings WHERE user_id = ? AND comment_id = ?`
        const search_params = [userId, commentId]
        const [searchResults] = await connection.query(search_query, search_params)

        //if the user already voted on that comment, update/delete their rating
        if (searchResults.length > 0) {
            //they are submitting the same rating again
            if(searchResults[0].rating === rating) {
                const delete_query = `DELETE FROM ratings WHERE user_id = ? AND comment_id = ?`
                const delete_params = [userId, commentId]
                await connection.query(delete_query, delete_params)
            }
            //they are submitting the opposite rating
            else {
                const update_query = `UPDATE ratings SET rating = ?, datetime = NOW() WHERE user_id = ? AND comment_id = ?`
                const update_params = [rating, userId, commentId]
                await connection.query(update_query, update_params)
            }
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, comment_id, rating, datetime) VALUES (?, ?, ?, NOW())`
            const insert_params = [userId, commentId, rating]
            await connection.query(insert_query, insert_params)
        }

        //now we accumulate the ratings of a comment and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE comment_id = ?`
        const acc_params = [commentId]
        const [accResults] = await connection.query(acc_query, acc_params)

        //we need an if/else in case the comment has 0 votes, meaning it should receive a rating of 0
        const total = accResults[0].total_rating
        if(total !== null) {
            const comment_query = `UPDATE comments SET rating = ? WHERE id = ?`
            const comment_params = [total, commentId]
            await connection.query(comment_query, comment_params)
        }
        else {
            const comment_query = `UPDATE comments SET rating = 0 WHERE id = ?`
            const comment_params = [commentId]
            await connection.query(comment_query, comment_params)
        }

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect(`back`)
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