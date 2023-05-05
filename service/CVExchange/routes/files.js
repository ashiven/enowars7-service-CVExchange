const multer = require('multer')
const upload = multer({ dest: 'uploads/'})
const fs = require('fs')
const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth
const path = require('path')


// Route definitions


router.post('/upload', auth, upload.single('profilePicture') , (req, res) => {
    const filename = req.file.originalname
    const filepath = req.file.path
    const userId = req.userId

    const find_query = `SELECT profile_picture FROM users WHERE id = ${userId}`
    req.database.query(find_query, (error, results) => {
        if(error) throw error

        //find current profile pic and delete it 
        const currentPic = results[0].profile_picture
        if(currentPic) {
            fs.unlink(path.join(__dirname, '..', currentPic), (error) => {
                if(error) throw error
            })
        }
        
        //rename the file to upload and update profile pic in DB
        fs.rename(filepath, `uploads/${filename}`, (error) => {
            if(error) throw error
    
            const userId = req.userId
            const update_query = `UPDATE users SET profile_picture = 'uploads/${filename}' WHERE id = ${userId}`
            req.database.query(update_query, (error, results) => {
                if(error) throw error
                
                res.redirect('/user/profile')
            })
        })
    })
})


//--------------------------------


module.exports = router 