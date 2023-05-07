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

    const search_query = `SELECT * FROM ratings WHERE user_id = ? AND post_id = ?`
    const search_params = [userId, postId]
    req.database.query(search_query, search_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        //if the user already voted on that post, update their rating
        if(results.length > 0) {
            const update_query = `UPDATE ratings SET rating = ? WHERE user_id = ? AND post_id = ?`
            const update_params = [rating, userId, postId]
            req.database.query(update_query, update_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, post_id, rating) VALUES (?, ?, ?)`
            const insert_params = [userId, postId, rating]
            req.database.query(insert_query, insert_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //now we accumulate the ratings of a post and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE post_id = ?`
        const acc_params = [postId]
        req.database.query(acc_query, acc_params, (error, results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }

            const total = results[0].total_rating
            const post_query = `UPDATE posts SET rating = ? WHERE id = ?`
            const post_params = [total, postId]
            req.database.query(post_query, post_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }

                return res.redirect(`${page}`)
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

    const search_query = `SELECT * FROM ratings WHERE user_id = ? AND comment_id = ?`
    const search_params = [userId, commentId]
    req.database.query(search_query, search_params, (error, results) => {
        if(error) {
            console.error(error)
            return res.status(500).send('<h1>Internal Server Error</h1>')
        }

        //if the user already voted on that comment, update their rating
        if(results.length > 0) {
            const update_query = `UPDATE ratings SET rating = ? WHERE user_id = ? AND comment_id = ?`
            const update_params = [rating, userId, commentId]
            req.database.query(update_query, update_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //if they haven't voted, insert a new rating into the DB
        else {
            const insert_query = `INSERT INTO ratings (user_id, comment_id, rating) VALUES (?, ?, ?)`
            const insert_params = [userId, commentId, rating]
            req.database.query(insert_query, insert_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }
            })
        }

        //now we accumulate the ratings of a comment and update the rating entry for it
        const acc_query = `SELECT SUM(rating) AS total_rating FROM ratings WHERE comment_id = ?`
        const acc_params = [commentId]
        req.database.query(acc_query, acc_params, (error, results) => {
            if(error) {
                console.error(error)
                return res.status(500).send('<h1>Internal Server Error</h1>')
            }

            const total = results[0].total_rating
            const comment_query = `UPDATE comments SET rating = ? WHERE id = ?`
            const comment_params = [total, commentId]
            req.database.query(comment_query, comment_params, (error, results) => {
                if(error) {
                    console.error(error)
                    return res.status(500).send('<h1>Internal Server Error</h1>')
                }

                return res.redirect(`${page}`)
            })
        })
    })
})


module.exports = router