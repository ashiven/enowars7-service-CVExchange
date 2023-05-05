const multer = require('multer')
const upload = multer({ dest: 'uploads/'})
const fs = require('fs')
const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth


// Route definitions


router.post('/upload', auth, upload.single('profilePicture') , (req, res) => {
    const file = req.file
    const filename = file.originalname
    const path = file.path

    fs.rename(path, `uploads/${filename}`, (err) => {
        if(err) throw err

        const userId = req.userId
        const query = `UPDATE users SET profile_picture = '/uploads/${filename}' WHERE id = ${userId}`
        req.database.query(query, (error, results) => {
            if(error) throw error
            
            res.redirect('/user/profile')
        })
    })
})


//--------------------------------


module.exports = router 