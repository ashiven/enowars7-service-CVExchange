const multer = require('multer')
const upload = multer({ dest: 'uploads/'})
const fs = require('fs')
const express = require('express')
const router = express.Router()
const auth_middleware = require('../middleware/auth')
const auth = auth_middleware.auth


// Route definitions


//TODO: Review this stuff and make sure the picture is also stored in the database
router.post('/upload', auth, upload.single('profilePicture') , (req, res) => {
    const file = req.file
    const filename = file.originalname
    const path = file.path

    fs.rename(path, `uploads/${filename}`, (err) => {
        if(err) throw err
        console.log(`File saved as uploads/${filename}`)
    })

    res.send('File uploaded succesfully')
})


//--------------------------------


module.exports = router 