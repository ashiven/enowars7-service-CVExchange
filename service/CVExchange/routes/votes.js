const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth


router.post('/ratepost', auth, (req, res) => {
    const userId = req.userId 
    const rating = parseInt(req.body.rating)
    const postId = req.body.postId
    const page = req.body.page

    if(!(rating === 1 || rating === -1)) {
        return res.status(400).send('Yea.. I see what you were trying to do ;)')
    }

    const search_query = `SELECT * FROM ratings WHERE user_id = ${userId} AND post_id = ${postId}`
    req.database.query(search_query, (error, results) => {
        if(error) throw error

        //if the user already voted on that post, update their rating
        if(results.length > 0) {
            const update_query = `UPDATE ratings SET rating = ${rating} WHERE user_id = ${userId} AND post_id = ${postId}`
            req.database.query(update_query, (error, results) => {
                if(error) throw error
            })
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, post_id, rating) VALUES (${userId}, ${postId}, ${rating})`
            req.database.query(insert_query, (error, results) => {
                if(error) throw error
            })
        }

        //now we accumulate the ratings of a post and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE post_id = ${postId}`
        req.database.query(acc_query, (error, results) => {
            if(error) throw error

            const total = results[0].total_rating
            const post_query = `UPDATE posts SET rating = ${total} WHERE id = ${postId}`
            req.database.query(post_query, (error, results) => {
                if(error) throw error

                res.redirect(`${page}`)
            })
        })
    })
})

router.post('/ratecomment', auth, (req, res) => {
    const userId = req.userId 
    const rating = parseInt(req.body.rating)
    const commentId = req.body.commentId
    const page = req.body.page

    if(!(rating === 1 || rating === -1)) {
        return res.status(400).send('Yea.. I see what you were trying to do ;)')
    }

    const search_query = `SELECT * FROM ratings WHERE user_id = ${userId} AND comment_id = ${commentId}`
    req.database.query(search_query, (error, results) => {
        if(error) throw error

        //if the user already voted on that comment, update their rating
        if(results.length > 0) {
            const update_query = `UPDATE ratings SET rating = ${rating} WHERE user_id = ${userId} AND comment_id = ${commentId}`
            req.database.query(update_query, (error, results) => {
                if(error) throw error
            })
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, comment_id, rating) VALUES (${userId}, ${commentId}, ${rating})`
            req.database.query(insert_query, (error, results) => {
                if(error) throw error
            })
        }

        //now we accumulate the ratings of a comment and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE comment_id = ${commentId}`
        req.database.query(acc_query, (error, results) => {
            if(error) throw error

            const total = results[0].total_rating
            const comment_query = `UPDATE comments SET rating = ${total} WHERE id = ${commentId}`
            req.database.query(comment_query, (error, results) => {
                if(error) throw error

                res.redirect(`${page}`)
            })
        })
    })
})


module.exports = router