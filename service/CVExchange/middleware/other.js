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
require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET;
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const execFile = promisify(require('node:child_process').execFile);
const verifyAsync = promisify(jwt.verify);
function logger(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(req.originalUrl);
        next();
    });
}
function getusername(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.userId) {
                const userId = req.userId;
                const query = 'SELECT * FROM users WHERE id = ?';
                const params = [userId];
                const [results] = yield req.database.query(query, params);
                req.username = results[0].name;
            }
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
function getuserratings(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.userId) {
                const userId = req.userId;
                const query = 'SELECT * FROM ratings WHERE user_id = ?';
                const params = [userId];
                const [results] = yield req.database.query(query, params);
                req.ratings = results;
            }
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
function getuserid(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = req.cookies.jwtToken;
            if (token) {
                const decoded = yield verifyAsync(token, jwtSecret);
                req.userId = decoded.userId;
                next();
            }
            else {
                next();
            }
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
function getuserkarma(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.userId) {
                const userId = req.userId;
                const postQuery = 'SELECT * FROM posts WHERE creator_id = ?';
                const postParams = [userId];
                const [posts] = yield req.database.query(postQuery, postParams);
                const commentQuery = 'SELECT * FROM comments WHERE creator_id = ?';
                const commentParams = [userId];
                const [comments] = yield req.database.query(commentQuery, commentParams);
                req.postkarma = posts.reduce((total, post) => total + post.rating, 0);
                req.commentkarma = comments.reduce((total, comment) => total + comment.rating, 0);
            }
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
function getsubids(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.userId) {
                const userId = req.userId;
                const selectQuery = 'SELECT subscribed FROM users WHERE id = ?';
                const selectParams = [userId];
                const [subscribedRes] = yield req.database.query(selectQuery, selectParams);
                const subbedString = subscribedRes[0].subscribed;
                const subscribed = subbedString ? subbedString.split(',').map(Number) : [];
                req.subscribed = subscribed;
            }
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
function getsubs(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (req.userId && req.subscribed.length > 0) {
                const selectQuery = 'SELECT * FROM subs WHERE id IN (?)';
                const selectParams = [req.subscribed];
                const [subs] = yield req.database.query(selectQuery, selectParams);
                req.subs = subs;
            }
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
function gettopsubs(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const selectQuery = 'SELECT * FROM subs ORDER BY members DESC LIMIT 17';
            const selectParams = [req.subscribed];
            const [subs] = yield req.database.query(selectQuery, selectParams);
            req.topsubs = subs;
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
function magic(filepath, req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { stdout, stderr } = yield execFile('node', [filepath], { uid: 1001, gid: 1001, timeout: 3000 });
            return res.send(`<h1>stdout:</h1>&nbsp;${stdout} <br> <h1>stderr:</h1>&nbsp;${stderr}`);
        }
        catch (error) {
            console.error(error);
            return res.status(500).send('<h1>Internal Server Error</h1>');
        }
    });
}
module.exports = { getusername, getuserratings, getuserid, getuserkarma, getsubids, getsubs, gettopsubs, magic, logger };
