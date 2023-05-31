const express = require('express')
const router = express.Router()
const {auth} = require('../middleware/auth')
const {getuserkarma, getusername, getsubids }= require('../middleware/other')
const sanitizer = require('sanitizer')


// Route definitions


router.get('/new', auth, getusername, getuserkarma, async (req, res) => {
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
        if(name.length < 4) {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a longer name.'})
        }
        const description = sanitizer.escape(req.body.description)
        if(!description || description === '') {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a description!'})
        }
        if(description.length < 5) {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a longer description.'})
        }
        const sidebar = sanitizer.escape(req.body.sidebar)
        if(!sidebar || sidebar === '') {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a sidebar text!'})
        }
        if(sidebar.length < 5) {
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a longer sidebar text.'})
        }
        const creatorId = req.userId
        const creatorName = req.username

        // start a transaction
        await connection.beginTransaction()


        const search_query = `SELECT * FROM subs WHERE name = ?`
        const search_params = [name]
        const [search_results] = await connection.query(search_query, search_params)

        if(search_results.length > 0) {
            // commit the transaction and release the connection
            await connection.commit()
            await connection.release()
            return res.render('newsub', {req, title: 'New Subexchange', layout: './layouts/sub', status: 'Subexchange with this name already exists.'})
        }

        const insert_query = `INSERT INTO subs (name, description, sidebar, creator_id, creator_name, datetime) VALUES (?, ?, ?, ?, ?, NOW() )`
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
            return res.status(500).send('<h1>Stop it. Its time to stop. Really.</h1>')
        }
        let updatedSubscribed

        // start a transaction
        await connection.beginTransaction()

        if(req.subscribed.includes(parseInt(subId))) {
            updatedSubscribed = subscribed.filter((subbedId) => subbedId !== subId)
        } 
        else {
            updatedSubscribed = [...subscribed, subId] 
        }
        
        const update_query = `UPDATE users SET subscribed = ? WHERE id = ?`
        const update_params = [updatedSubscribed.join(','), userId]
        await connection.query(update_query, update_params)

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



//--------------------------------


module.exports = router