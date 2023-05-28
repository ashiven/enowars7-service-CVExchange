const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const middleware = require('../middleware/other')
const getusername = middleware.getusername
const getuserkarma = middleware.getuserkarma


// Route definitions

router.get('/new', auth, getusername, getuserkarma, async (req, res) => {
    try {
        return res.render('newpost', {req, title: 'New Post', layout: './layouts/post'})
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/new', auth, getusername, async (req, res) => {
    const connection = await req.database.getConnection()
    
    try {
        const title = req.body.title
        const text = req.body.text
        if(!title || !text || title === '' || text === '') {
            return res.status(500).send('<h1>You need to include a title and text!</h1>')
        }
        const creatorId = req.userId
        const creatorName = req.username

        // start a transaction
        await connection.beginTransaction()

        const insert_query = `INSERT INTO posts (title, text, rating, creator_id, creator_name, datetime) VALUES (?, ?, 1, ?, ?, NOW() )`
        const insert_params = [title, text, creatorId, creatorName]
        await connection.query(insert_query, insert_params)

        const postId_query = `SELECT LAST_INSERT_ID() AS id FROM posts`
        const [results] = await connection.query(postId_query)
        const postId = results[0].id

        const rating_query = `INSERT INTO ratings (user_id, post_id, rating, datetime) VALUES (?, ?, 1, NOW())`
        const rating_params = [creatorId, postId]
        await connection.query(rating_query, rating_params)

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect('/')
    } 
    catch(error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()

        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/:id', auth, getusername, getuserkarma, async (req, res) => {
    try {
        const postId = req.params.id
        if(!Number.isInteger(parseInt(postId))) {
            return res.status(500).send('<h1>Thats not a number in my world.</h1>')
        }
        let ratings = []
        let sort = 'top'

        const post_query = `SELECT * FROM posts WHERE id = ?`
        const post_params = [postId]
        const [post] = await req.database.query(post_query, post_params)
        if (post.length === 0) {
            return res.status(404).send('<h1>Post not found</h1>')
        }
        const post_rating_query = `SELECT * FROM ratings WHERE post_id = ?`
        const post_rating_params = [post[0].id]
        const [post_rating] = await req.database.query(post_rating_query, post_rating_params)
        ratings = ratings.concat(post_rating)

        let comment_query = `SELECT * FROM comments WHERE post_id = ? ORDER BY rating DESC`
        let comment_params = [postId]

        if(req.query.sort) {
            sort = req.query.sort
            if(sort === 'new' ) {
                comment_query = `SELECT * FROM comments WHERE post_id = ? ORDER BY datetime ASC`
            }
            else if(sort === 'hot') {
                comment_query = `SELECT * FROM (
                                    SELECT c.*, COUNT(r.id) as ratecount 
                                    FROM comments c
                                    LEFT JOIN ratings r ON c.id = r.comment_id
                                    WHERE r.datetime >= NOW() - INTERVAL 1 HOUR AND c.post_id = ? AND r.rating = 1
                                    GROUP BY c.id

                                    UNION 

                                    SELECT c1.*, 0 as ratecount
                                    FROM comments c1 
                                    WHERE id NOT IN (
                                        SELECT c2.id 
                                        FROM comments c2 
                                        LEFT JOIN ratings r2 on c2.id = r2.comment_id 
                                        WHERE r2.datetime >= NOW() - INTERVAL 1 HOUR AND c2.post_id = ? AND r2.rating = 1
                                    ) AND c1.post_id = ?
                                ) AS subquery
                                ORDER BY ratecount DESC, rating DESC`
                comment_params = [postId, postId, postId]
            }
        }

        let [comments] = await req.database.query(comment_query, comment_params)
        const commentIds = comments.map(comment => comment.id)

        if(commentIds.length > 0) {
            const comment_ratings_query = `SELECT * FROM ratings WHERE comment_id IN (?) AND user_id = ?`
            const comment_ratings_params = [commentIds, req.userId]
            const [comment_ratings] = await req.database.query(comment_ratings_query, comment_ratings_params) 
            ratings = ratings.concat(comment_ratings)
        }
        return res.render('post', { req, sort, post: post[0], ratings, comments, title: `${post[0].title}`, layout: './layouts/post' })
    }
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/delete/:id', auth, async (req, res) => {
    const connection = await req.database.getConnection()

    try {
        const postId = req.params.id
        if(!Number.isInteger(parseInt(postId))) {
            return res.status(500).send('<h1>Cant delete imaginary posts.</h1>')
        }
        const userId = req.userId

        // start a transaction
        await connection.beginTransaction()

        const find_query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
        const find_params = [postId, userId]
        const [results] = await connection.query(find_query, find_params)

        if (results.length > 0) {
            // first delete the post 
            const delete_post_query = `DELETE FROM posts WHERE id = ?`
            const delete_post_params = [postId]
            await connection.query(delete_post_query, delete_post_params)

            // find all comments for the post
            const search_comments_query = `SELECT * FROM comments WHERE post_id = ?`
            const search_comments_params = [postId]
            const [comments] = await connection.query(search_comments_query, search_comments_params)

            // delete the ratings for every comment
            for(const comment of comments) {
                const delete_ratings_query = `DELETE FROM ratings WHERE comment_id = ?`
                const delete_ratings_params = [comment.id]
                await connection.query(delete_ratings_query, delete_ratings_params)
            }

            // delete the comments for the post
            const delete_comments_query = `DELETE FROM comments WHERE post_id = ?`
            const delete_comments_params = [postId]
            await connection.query(delete_comments_query, delete_comments_params)

            // delete the ratings for the post
            const delete_ratings_query = `DELETE FROM ratings WHERE post_id = ?`
            const delete_ratings_params = [postId]
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

            return res.status(401).send('<h1>You are not authorized to delete this post or the post doesnt exist.</h1>')
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

router.get('/edit/:id', auth, getusername, getuserkarma, async (req, res) => {
    try {
        const postId = req.params.id
        if(!Number.isInteger(parseInt(postId))) {
            return res.status(500).send('<h1>What are you even trying to edit?</h1>')
        }
        const userId = req.userId
        
        const query = `SELECT * FROM posts WHERE id = ? AND creator_id = ?`
        const params = [postId, userId]
        const [results] = await req.database.query(query, params)

        if (results.length > 0) {
            return res.render('editpost', { req, post: results[0], postId, title: 'Edit Post', layout: './layouts/post' })
        } 
        else {
            return res.status(404).send('<h1>Post not found</h1>')
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
        if(!title || !text || title === '' || text === '') {
            return res.status(500).send('<h1>You need to include a title and text!</h1>')
        }
        const postId = req.params.id
        if(!Number.isInteger(parseInt(postId))) {
            return res.status(500).send(`<h1>Since when is "${postId}" a number huh?</h1>`)
        }
        const userId = req.userId

        const query = `UPDATE posts SET title = ?, text = ? WHERE id = ? AND creator_id = ?`
        const params = [title, text, postId, userId]
        await req.database.query(query, params)

        return res.redirect(`/user/profile/${userId}`)
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.get('/save/:id', auth, async (req, res) => {
    const connection = await req.database.getConnection()

    try {
        const userId = req.userId
        const postId = req.params.id
        if(!Number.isInteger(parseInt(postId))) {
            return res.status(500).send('<h1>Stop it. Its time to stop. Really.</h1>')
        }
        let updatedSaved

        // start a transaction
        await connection.beginTransaction()

        const select_query = `SELECT saved FROM users WHERE id = ?`
        const select_params = [userId]
        const [savedposts] = await connection.query(select_query, select_params)
        const savedString = savedposts[0].saved
        const saved = savedString ? savedString.split(',') : []

        if(saved.includes(postId)) {
            updatedSaved = saved.filter((savedId) => savedId !== postId)
        } 
        else {
            updatedSaved = [...saved, postId] 
        }
        
        const update_query = `UPDATE users SET saved = ? WHERE id = ?`
        const update_params = [updatedSaved.join(','), userId]
        await connection.query(update_query, update_params)

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect('back')
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