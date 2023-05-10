const multer = require('multer')
const fs = require('fs')
const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const path = require('path')

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', Buffer.from(req.userId.toString()).toString('base64'))
        try {
            await fs.promises.access(uploadPath)
        }
        catch(error) { 
            if(error.code === 'ENOENT') {
                try {
                    await fs.promises.mkdir(uploadPath)
                }
                catch(error) {
                    return cb(error)
                }
            }
            else {
                return cb(error)
            }
        }
        cb(null, uploadPath)
    },
    filename: async (req, file, cb) => {
        cb(null, file.originalname)
    }
})

const upload = multer({ storage: storage })

// Route definitions

router.post('/upload', auth, upload.single('profilePicture'), async (req, res) => {

    if (!req.file) {
        return res.redirect('/user/profile')
    }
    const filename = req.file.originalname
    const filepath = req.file.path
    const userId = req.userId

    const connection = await req.database.getConnection()

    try {
        // start a transaction
        await connection.beginTransaction()

        // find current profile pic and delete it
        const find_query = `SELECT profile_picture FROM users WHERE id = ?`
        const find_params = [userId]
        const [results] = await connection.query(find_query, find_params)

        const currentPic = results[0].profile_picture
        if (currentPic) {
            await fs.promises.unlink(path.join(__dirname, '..', currentPic))
        }
    
        const profilePic = 'uploads/' + Buffer.from(userId.toString()).toString('base64') + '/' + filename

        // rename the filepath and update profile pic in DB
        await fs.promises.rename(filepath, profilePic)

        const update_query = `UPDATE users SET profile_picture = ? WHERE id = ?`
        const update_params = [profilePic, userId]
        await connection.query(update_query, update_params)

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()
    
        return res.redirect('/user/profile')
    } 
    catch (error) {
        // if there was an error, rollback changes and release the connection
        await connection.rollback()
        await connection.release()

        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/delete', auth, async (req, res) => {
    const userId = req.userId

    const connection = await req.database.getConnection()

    try {
        // start a transaction
        await connection.beginTransaction()

        const find_query = `SELECT profile_picture FROM users WHERE id = ?`
        const find_params = [userId]
        const [results] = await connection.query(find_query, find_params)
        const currentPic = results[0].profile_picture

        if (currentPic !== null) {
            const currentPic = results[0].profile_picture
            await fs.promises.unlink(path.join(__dirname, '..', currentPic))
                
            const delete_query = `UPDATE users SET profile_picture = NULL WHERE id = ?`
            const delete_params = [userId]
            await connection.query(delete_query, delete_params)
        }

        // commit the transaction and release the connection
        await connection.commit()
        await connection.release()

        return res.redirect('/user/profile')
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


// Function definitions

function randomName(string) {
    console.log(string)
}

//--------------------------------


module.exports = router 