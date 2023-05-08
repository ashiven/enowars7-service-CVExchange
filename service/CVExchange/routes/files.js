const multer = require('multer')
const upload = multer({ dest: 'uploads/'})
const fs = require('fs')
const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const path = require('path')


// Route definitions

router.post('/upload', auth, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect('/user/profile')
        }
        const filename = req.file.originalname
        const filepath = req.file.path
        const userId = req.userId
    
        // find current profile pic and delete it
        const find_query = `SELECT profile_picture FROM users WHERE id = ?`
        const find_params = [userId]
        const [results] = await req.database.query(find_query, find_params)

        const currentPic = results[0].profile_picture
        if (currentPic) {
            await fs.promises.unlink(path.join(__dirname, '..', currentPic))
        }
    
        // rename the file to upload and update profile pic in DB
        await fs.promises.rename(filepath, `uploads/${filename}`)
    
        const profilepic = 'uploads/' + filename;
        const update_query = `UPDATE users SET profile_picture = ? WHERE id = ?`
        const update_params = [profilepic, userId]
        await req.database.query(update_query, update_params)
    
        return res.redirect('/user/profile')
    } 
    catch (error) {
        console.error(error)
        return res.status(500).send('<h1>Internal Server Error</h1>')
    }
})

router.post('/delete', auth, async (req, res) => {
    try {
        const userId = req.userId

        const find_query = `SELECT profile_picture FROM users WHERE id = ?`
        const find_params = [userId]
        const [results] = await req.database.query(find_query, find_params)
        const currentPic = results[0].profile_picture

        if (currentPic !== null) {
            const currentPic = results[0].profile_picture
            await fs.promises.unlink(path.join(__dirname, '..', currentPic))
                
            const delete_query = `UPDATE users SET profile_picture = NULL WHERE id = ?`
            const delete_params = [userId]
            await req.database.query(delete_query, delete_params)
        }

        return res.redirect('/user/profile')
    } 
    catch (error) {
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