const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

//define constants and stuff

const jwtSecret = 'SuperS3cret'

//--------------------------------


//define all of the routes
router.get('/', (req, res) => {
    const pagelimit = 10
    const query = `SELECT * FROM posts ORDER BY datetime DESC LIMIT ${pagelimit}`
    let posts

    req.database.query(query, (error, results) => {
        if(error) throw error
        
        posts = results
        res.render('posts', { posts })
    })
})

router.get('/myposts', auth, (req, res) => {
    const pagelimit = 10
    const query = `SELECT * FROM posts WHERE creator_id = ${req.userId} ORDER BY datetime DESC LIMIT ${pagelimit}`
    let posts

    req.database.query(query, (error, results) => {
        if(error) throw error
        
        posts = results
        res.render('myposts', { posts })
    })
})

router.get('/new', auth,  (req, res) => {
    res.render('newpost')
})

router.post('/new', auth, (req, res) => {
    const title = req.body.title
    const text = req.body.text
    const creatorId = req.userId

    const query = `INSERT INTO posts (title, text, rating, creator_id, datetime) VALUES ('${title}', '${text}', '1', '${creatorId}', NOW() )`
    req.database.query(query, (error, results) => {
        if(error) throw error
        res.status(200).send('Post created successfully')
    })
})

router.post('/delete/:id', auth,  (req, res) => {
    const postId = req.params.id
    const userId = req.userId

    const find_query = `SELECT * FROM posts WHERE id = ${postId} AND creator_id = ${userId}`
    req.database.query(find_query, (error, results) => {
        if(error) throw error

        if(results.length > 0) {
            const delete_query = `DELETE FROM posts WHERE id = ${postId}`
            req.database.query(delete_query, (error, results) => {
                if(error) throw error
                res.status(200).send('Post deleted successfully!')
            })
        }
        else {
            res.status(401).send('You are not authorized to delete this post')
        }
    })
})

router.get('/:id', (req, res) => {
    const postId = req.params.id
    
    const query = `SELECT * FROM posts WHERE id = ${postId}`
    req.database.query(query, (error, results) => {
        if(error) throw error
        
        if(results.length === 0) {
            res.status(404).send('Post not found')
            return
        }
        const post = results[0]
        res.render('post', {post})
    })
})


//--------------------------------


//define middleware

//don't really use this one (might use later)
router.param('postId', (req, res, next, postId) => {
    req.post = posts[postId]
    next()
})

function auth(req, res, next) {
    const token = req.cookies.jwtToken

    if(token) {
        jwt.verify(token, jwtSecret, (error, decoded) => {
            if(error) {
                res.status(401).send('Unauthenticated') 
            }
            req.userId = decoded.userId
            next()
        })
    }
    else {
        res.status(401).send('Unauthenticated') 
    }
}
//--------------------------------


module.exports = router