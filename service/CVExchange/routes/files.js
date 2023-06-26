"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require('multer');
const fs = require('fs');
const router = require('express').Router();
const path = require('path');
const { auth } = require('../middleware/auth');
// Filestorage definitions
function uploadDest(visibility, req, cb) {
    return __awaiter(this, void 0, void 0, function* () {
        const userDir = path.join(__dirname, '..', 'uploads', Buffer.from(req.userId.toString()).toString('base64'));
        const uploadDir = path.join(userDir, visibility);
        try {
            yield fs.promises.access(uploadDir);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                try {
                    yield fs.promises.access(userDir);
                    yield fs.promises.mkdir(uploadDir);
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        try {
                            yield fs.promises.mkdir(userDir);
                            yield fs.promises.mkdir(uploadDir);
                        }
                        catch (error) {
                            return cb(new Error("Failed to create upload directory"));
                        }
                    }
                    else {
                        return cb(new Error("Failed to create upload directory"));
                    }
                }
            }
            else {
                return cb(new Error("Failed to create upload directory"));
            }
        }
        return cb(null, uploadDir);
    });
}
const publicStorage = multer.diskStorage({
    destination: (req, _file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        uploadDest('public', req, cb);
    }),
    filename: (req, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        return cb(null, file.originalname);
    })
});
const privateStorage = multer.diskStorage({
    destination: (req, _file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        uploadDest('private', req, cb);
    }),
    filename: (req, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        return cb(null, file.originalname);
    })
});
const backupStorage = multer.diskStorage({
    destination: (req, _file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        const userDir = path.join(__dirname, '..', 'backups', Buffer.from(req.userId.toString()).toString('base64'));
        try {
            yield fs.promises.access(userDir);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                try {
                    yield fs.promises.mkdir(userDir);
                }
                catch (error) {
                    return cb(error);
                }
            }
            else {
                return cb(error);
            }
        }
        return cb(null, userDir);
    }),
    filename: (req, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
        return cb(null, file.originalname);
    })
});
const fileFilter = (req, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const regex = /\.(jpg|jpeg|png)$/i;
        if ((file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') && regex.test(file.originalname)) {
            return cb(null, true);
        }
        else {
            return cb(null, false);
        }
    }
    catch (error) {
        return cb(error);
    }
});
const fileFilterPrivate = (req, file, cb) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const regex = /\.(txt)$/i;
        if (file.mimetype === 'text/plain' && regex.test(file.originalname)) {
            return cb(null, true);
        }
        else {
            return cb(null, false);
        }
    }
    catch (error) {
        return cb(error);
    }
});
const publicUploader = multer({ storage: publicStorage, fileFilter, limits: { fileSize: 1024 * 1024 * 5 } });
const privateUploader = multer({ storage: privateStorage, fileFilter: fileFilterPrivate, limits: { fileSize: 1024 * 1024 * 5 } });
const backupUploader = multer({ storage: backupStorage, fileFilter: fileFilterPrivate, limits: { fileSize: 1024 * 1024 * 5 } });
const upload = publicUploader.single('profilePicture');
const privateUpload = privateUploader.single('privateFile');
const backupUpload = backupUploader.single('backupFile');
// --------------------------------
// Route definitions
router.post('/upload', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    upload(req, res, (error) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
        if (!req.file) {
            return res.redirect('back');
        }
        const connection = yield req.database.getConnection();
        try {
            const filename = req.file.originalname;
            const filepath = req.file.path;
            const userId = req.userId;
            const profilePic = 'uploads/' + Buffer.from(userId.toString()).toString('base64') + '/' + 'public/' + filename;
            // start a transaction
            yield connection.beginTransaction();
            // find current profile pic and delete it
            const findQuery = 'SELECT profile_picture FROM users WHERE id = ?';
            const findParams = [userId];
            const [results] = yield connection.query(findQuery, findParams);
            const currentPic = results[0].profile_picture;
            const updateQuery = 'UPDATE users SET profile_picture = ? WHERE id = ?';
            const updateParams = [profilePic, userId];
            yield connection.query(updateQuery, updateParams);
            if (currentPic) {
                if (currentPic !== profilePic) {
                    yield fs.promises.unlink(path.join(__dirname, '..', currentPic));
                    yield fs.promises.rename(filepath, profilePic);
                }
            }
            else {
                yield fs.promises.rename(filepath, profilePic);
            }
            // commit the transaction and release the connection
            yield connection.commit();
            yield connection.release();
            return res.redirect('back');
        }
        catch (error) {
            // if there was an error, rollback changes and release the connection
            yield connection.rollback();
            yield connection.release();
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    }));
}));
router.get('/delete', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const userId = req.userId;
        // start a transaction
        yield connection.beginTransaction();
        const findQuery = 'SELECT profile_picture FROM users WHERE id = ?';
        const findParams = [userId];
        const [results] = yield connection.query(findQuery, findParams);
        const currentPic = results[0].profile_picture;
        if (currentPic !== null) {
            const currentPic = results[0].profile_picture;
            yield fs.promises.unlink(path.join(__dirname, '..', currentPic));
            const deleteQuery = 'UPDATE users SET profile_picture = NULL WHERE id = ?';
            const deleteParams = [userId];
            yield connection.query(deleteQuery, deleteParams);
        }
        // commit the transaction and release the connection
        yield connection.commit();
        yield connection.release();
        return res.redirect('back');
    }
    catch (error) {
        // if there was an error, rollback changes and release the connection
        yield connection.rollback();
        yield connection.release();
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>');
    }
}));
router.post('/private', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    privateUpload(req, res, (error) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
        if (!req.file) {
            return res.redirect('back');
        }
        const connection = yield req.database.getConnection();
        try {
            const filename = req.file.originalname;
            const filepath = req.file.path;
            const userId = req.userId;
            const myFile = 'uploads/' + Buffer.from(userId.toString()).toString('base64') + '/' + 'private/' + filename;
            // start a transaction
            yield connection.beginTransaction();
            // find current profile pic and delete it
            const findQuery = 'SELECT my_file FROM users WHERE id = ?';
            const findParams = [userId];
            const [results] = yield connection.query(findQuery, findParams);
            const currentFile = results[0].my_file;
            const updateQuery = 'UPDATE users SET my_file = ? WHERE id = ?';
            const updateParams = [myFile, userId];
            yield connection.query(updateQuery, updateParams);
            if (currentFile) {
                if (currentFile !== myFile) {
                    yield fs.promises.unlink(path.join(__dirname, '..', currentFile));
                    yield fs.promises.rename(filepath, myFile);
                }
            }
            else {
                yield fs.promises.rename(filepath, myFile);
            }
            // create verify.js for getting filehash upon uploading to private, if the user has a public directory, else create a public directory first
            const userDir = path.join(__dirname, '..', 'uploads', Buffer.from(req.userId.toString()).toString('base64'));
            const publicDir = path.join(userDir, 'public');
            const verify = `const fs = require('fs'); const crypto = require('crypto'); const hash = crypto.createHash('sha1').setEncoding('hex'); fs.createReadStream('${path.join(userDir, 'private', filename)}').pipe(hash).on('finish', () => {console.log('SHA1(${filename}) = ' + hash.read())});`;
            try {
                yield fs.promises.access(publicDir);
                yield fs.promises.writeFile(path.join(publicDir, 'verify.js'), verify);
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    yield fs.promises.mkdir(publicDir);
                    yield fs.promises.writeFile(path.join(publicDir, 'verify.js'), verify);
                }
            }
            // commit the transaction and release the connection
            yield connection.commit();
            yield connection.release();
            return res.redirect('back');
        }
        catch (error) {
            // if there was an error, rollback changes and release the connection
            yield connection.rollback();
            yield connection.release();
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    }));
}));
router.post('/backup', auth, (req, res) => {
    backupUpload(req, res, (error) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
        if (!req.file) {
            return res.redirect('back');
        }
    }));
    return res.redirect('back');
});
router.get('/retrieve/:userId/:filename', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (Buffer.from(req.userId.toString()).toString('base64') !== req.params.userId) {
            return res.status(403).send('<h1>You are not allowed to access this users files</h1>');
        }
        const filepath = path.join(__dirname, '../backups', req.params.userId, req.params.filename);
        yield fs.promises.access(filepath);
        return res.sendFile(filepath);
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>');
    }
}));
// --------------------------------
module.exports = router;
