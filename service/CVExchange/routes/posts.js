const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const middleware = require('../middleware/other')
const getusername = middleware.getusername


// Route definitions

router.get('/new', auth, async (req, res) => {
    try {
        return res.render('newpost', {title: 'New Post'})
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

router.get('/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id

        const post_query = `SELECT * FROM posts WHERE id = ?`
        const post_params = [postId]
        const [post] = await req.database.query(post_query, post_params)

        if (post.length === 0) {
            return res.status(404).send('Post not found')
        }

        var comment_query = `SELECT * FROM comments WHERE post_id = ? ORDER BY rating DESC`
        const comment_params = [postId]

        if(req.query.sort) {
            const sort = req.query.sort
            if(sort === 'new' ) {
                comment_query = `SELECT * FROM comments WHERE post_id = ? ORDER BY datetime ASC`
            }
            else if(sort === 'hot') {
                //TODO: change this query to combine with top comments
                comment_query = `SELECT c.*, COUNT(r.id) as ratecount 
                        FROM comments c
                        LEFT JOIN ratings r ON c.id = r.comment_id
                        WHERE r.datetime >= NOW() - INTERVAL 1 HOUR AND c.post_id = ?
                        GROUP BY c.id
                        ORDER BY ratecount DESC, c.rating DESC`
            }
        }

        const [comments] = await req.database.query(comment_query, comment_params)
        return res.render('post', { req, post: post[0], comments, title: `${post[0].title}`, layout: './layouts/sidebar' })
    }
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/delete/:id', auth, async (req, res) => {
    const connection = await req.database.getConnection()

    try {
        const postId = req.params.id
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

            return res.redirect('/user/myposts')
        }
        else {
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()

            return res.status(401).send('You are not authorized to delete this post or the post doesnt exist')
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