const express = require('express')
const router = express.Router()
const {auth} = require('../middleware/auth')
const {getuserkarma, getusername, getsubids, getsubs, gettopsubs }= require('../middleware/other')
const sanitizer = require('sanitizer')


// Route definitions


router.get('/new', auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, async (req, res) => {
    try {
        return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: ''})
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})


router.post('/new', auth, getusername, async (req, res) => {
    const connection = await req.database.getConnection()
    
    try {
        const name = sanitizer.escape(req.body.name).replace(/\s/g, '')
        if(!name || name === '') {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a name!'})
        }
        if(!(/^[a-zA-Z0-9]+$/).test(name)) {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please only use numbers and letters for the name.'})
        }
        if(name.length < 4 || name.length > 20) {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a name between 4 to 20 characters.'})
        }
        const description = sanitizer.escape(req.body.description)
        if(!description || description === '') {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a description!'})
        }
        if(description.length < 5 || description.length > 100) {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a description between 5 to 100 characters.'})
        }
        const sidebar = sanitizer.escape(req.body.sidebar)
        if(!sidebar || sidebar === '') {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a sidebar text!'})
        }
        if(sidebar.length < 5 || sidebar.length > 500) {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a sidebar between 5 to 500 characters.'})
        }
        const creatorId = req.userId
        const creatorName = req.username

        // start a transaction
        await connection.beginTransaction()

        const spam_query = `SELECT * FROM subs WHERE creator_id = ? ORDER BY datetime DESC LIMIT 1`
        const spam_params = [creatorId]
        const [spam] = await connection.query(spam_query, spam_params)

        if(spam.length > 0) {
            //ensure that users can only create a new subexchange every 20 seconds
            if(Math.floor((new Date() - spam[0].datetime) / 1000) < 20) {
                await connection.commit()
                await connection.release()
                return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please wait 20 seconds inbetween creating new subexchanges.'})
            }
        }

        const search_query = `SELECT * FROM subs WHERE name = ?`
        const search_params = [name]
        const [search_results] = await connection.query(search_query, search_params)

        if(search_results.length > 0) {
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Subexchange with this name already exists.'})
        }

        const insert_query = `INSERT INTO subs (name, description, sidebar, creator_id, creator_name, members, datetime) VALUES (?, ?, ?, ?, ?, 0, NOW() )`
        const insert_params = [name, description, sidebar, creatorId, creatorName]
        await connection.query(insert_query, insert_params)

        const subId_query = `SELECT LAST_INSERT_ID() AS id FROM subs`
        const [results] = await connection.query(subId_query)
        const subId = results[0].id

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect(`/subs/subscribe/${subId}`)
    } 
    catch(error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()

        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})


router.get('/subscribe/:id', auth, getsubids, async (req, res) => {
    const connection = await req.database.getConnection()

    try {
        const userId = req.userId
        const subId = req.params.id
        if(!Number.isInteger(parseInt(subId))) {
            await connection.release()
            return res.status(500).send('<h1>Stop it. Get some help.</h1>')
        }
        let updatedSubscribed

        // start a transaction
        await connection.beginTransaction()

        if(req.subscribed.includes(parseInt(subId))) {
            updatedSubscribed = req.subscribed.filter((subbedId) => subbedId !== parseInt(subId))
            const sub_query = `UPDATE subs SET members = members - 1 WHERE id = ?`
            const sub_params = [subId]
            await connection.query(sub_query, sub_params)
        } 
        else {
            updatedSubscribed = [...req.subscribed, subId]
            const sub_query = `UPDATE subs SET members = members + 1 WHERE id = ?`
            const sub_params = [subId]
            await connection.query(sub_query, sub_params)
        }
        
        const update_query = `UPDATE users SET subscribed = ? WHERE id = ?`
        const update_params = [updatedSubscribed.join(','), userId]
        await connection.query(update_query, update_params)

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        if(req.originalUrl === `/subs/${subId}` || req.originalUrl === `/subs/subscribe/${subId}`) { 
            return res.redirect(`/subs/${subId}`)
        }
        else {
            return res.redirect(`back`)
        }
    }
    catch(error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()

        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})


router.get('/:id', auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, async (req, res) => {
    try {
        let page = 1
        const pagelimit = 15
        const offset = (page - 1) * pagelimit

        if(req.query.page) {
            page = parseInt(req.query.page)
            if(!Number.isInteger(page)) {
                return res.status(500).send('<h1>Yea.. page ID must be a number buddy.</h1>')
            }
        }

        let sort = 'hot'
        let subId = req.params.id
        if(!Number.isInteger(parseInt(subId))) {
            return res.status(500).send('<h1>Yea.. sub ID must be a number buddy.</h1>')
        }
        let comments = []
        let ratings = []

        let params = [subId, subId, subId, pagelimit, offset]
        let query = `SELECT * FROM (
                        SELECT p.*, COUNT(r.id) as ratecount 
                        FROM posts p 
                        LEFT JOIN ratings r ON p.id = r.post_id
                        WHERE r.datetime >= NOW() - INTERVAL 1 HOUR AND r.rating = 1 AND p.sub_id = ?
                        GROUP BY p.id

                        UNION

                        SELECT p1.*, 0 as ratecount
                        FROM posts p1 
                        WHERE id NOT IN (
                            SELECT p2.id
                            FROM posts p2
                            LEFT JOIN ratings r2 ON p2.id = r2.post_id
                            WHERE r2.datetime >= NOW() - INTERVAL 1 HOUR AND r2.rating = 1 AND p2.sub_id = ?
                        ) AND sub_id = ?
                    ) AS subquery 
                    ORDER BY ratecount DESC, rating DESC`

        if(req.query.sort) {
            sort = req.query.sort
            if(sort === 'new' ) {
                query = `SELECT * FROM posts WHERE sub_id = ? ORDER BY datetime DESC`
                params = [subId, pagelimit, offset]
            }
            else if(sort === 'top') {
                query = `SELECT * FROM posts WHERE sub_id = ? ORDER BY rating DESC`
                params = [subId, pagelimit, offset]
            }
            else {
                sort = 'hot'
            }
        }

        query = query + ` LIMIT ? OFFSET ?`
        const [posts] = await req.database.query(query, params)
        const postIds = posts.map(post => post.id)


        const comment_query = `SELECT * FROM comments WHERE post_id IN (?)`
        const comment_params = [postIds]        
        if(postIds.length > 0) {
            [comments] = await req.database.query(comment_query, comment_params)
        }

        const ratings_query = `SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?`
        const ratings_params = [postIds, req.userId]        
        if(postIds.length > 0) {
            [ratings] = await req.database.query(ratings_query, ratings_params)
        }

        const sub_query = `SELECT * FROM subs WHERE id = ?`
        const sub_params = [subId]
        const [sub] = await req.database.query(sub_query, sub_params)
        
        return res.render('frontpage', { req, sub: sub[0], ratings, pagelimit, page, sort, posts, comments, title: 'CVExchange - Fly into nothingness', layout: './layouts/subexchange' })

    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})


router.get('/search/:id', auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, async (req, res) => {
    try{
        const pagelimit = 15
        let page = 1
        if(req.query.page) {
            page = parseInt(req.query.page)
            if(!Number.isInteger(page)) {
                return res.status(500).send('<h1>Yea.. page ID must be a number buddy.</h1>')
            }
        }
        let subId = req.params.id
        if(!Number.isInteger(parseInt(subId))) {
            return res.status(500).send('<h1>Yea.. sub ID must be a number buddy.</h1>')
        }
        const offset = (page - 1) * pagelimit
        let comments = []
        let ratings = []

        const search = req.query.q
        const search_query = `SELECT p.*, MATCH (creator_name, sub_name, title, text) AGAINST (?) AS score FROM posts p WHERE MATCH (creator_name, sub_name, title, text) AGAINST (?) AND p.sub_id = ? LIMIT ? OFFSET ?`
        const search_params = [search, search, req.params.id, pagelimit, offset]
        const [posts] = await req.database.query(search_query, search_params)
        const postIds = posts.map(post => post.id)

        const comment_query = `SELECT * FROM comments WHERE post_id IN (?)`
        const comment_params = [postIds]        
        if(postIds.length > 0) {
            [comments] = await req.database.query(comment_query, comment_params)
        }

        const ratings_query = `SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?`
        const ratings_params = [postIds, req.userId]        
        if(postIds.length > 0) {
            [ratings] = await req.database.query(ratings_query, ratings_params)
        }

        const sub_query = `SELECT * FROM subs WHERE id = ?`
        const sub_params = [subId]
        const [sub] = await req.database.query(sub_query, sub_params)

        return res.render('frontpage', { req, sub: sub[0], pagelimit, page, posts, comments, ratings, title: 'Search Results', layout: './layouts/subsearch' })
    }
    catch(error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})



//--------------------------------


module.exports = router