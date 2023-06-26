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
const router = require('express').Router();
const sanitizer = require('sanitizer');
const { auth } = require('../middleware/auth');
const { getuserkarma, getusername, getsubids, getsubs, gettopsubs } = require('../middleware/other');
// Route definitions
router.get('/new', auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: '' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>');
    }
}));
router.post('/new', auth, getusername, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const name = sanitizer.escape(req.body.name).replace(/\s/g, '');
        if (!name || name === '') {
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a name!' });
        }
        if (!(/^[a-zA-Z0-9]+$/).test(name)) {
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please only use numbers and letters for the name.' });
        }
        if (name.length < 4 || name.length > 20) {
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a name between 4 to 20 characters.' });
        }
        const description = sanitizer.escape(req.body.description);
        if (!description || description === '') {
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a description!' });
        }
        if (description.length < 5 || description.length > 100) {
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a description between 5 to 100 characters.' });
        }
        const sidebar = sanitizer.escape(req.body.sidebar);
        if (!sidebar || sidebar === '') {
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'You need to include a sidebar text!' });
        }
        if (sidebar.length < 5 || sidebar.length > 500) {
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please provide a sidebar between 5 to 500 characters.' });
        }
        const creatorId = req.userId;
        const creatorName = req.username;
        // start a transaction
        yield connection.beginTransaction();
        const spamQuery = 'SELECT * FROM subs WHERE creator_id = ? ORDER BY datetime DESC LIMIT 1';
        const spamParams = [creatorId];
        const [spam] = yield connection.query(spamQuery, spamParams);
        if (spam.length > 0) {
            // ensure that users can only create a new subexchange every 20 seconds
            const currentTime = new Date().getTime();
            const spamTime = spam[0].datetime;
            if (Math.floor((currentTime - spamTime / 1000)) < 20) {
                yield connection.commit();
                yield connection.release();
                return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'Please wait 20 seconds inbetween creating new subexchanges.' });
            }
        }
        const searchQuery = 'SELECT * FROM subs WHERE name = ?';
        const searchParams = [name];
        const [searchResults] = yield connection.query(searchQuery, searchParams);
        if (searchResults.length > 0) {
            // commit the transaction and release the connection
            yield connection.commit();
            yield connection.release();
            return res.render('newsub', { req, title: 'New Subexchange', layout: './layouts/sub', status: 'Subexchange with this name already exists.' });
        }
        const insertQuery = 'INSERT INTO subs (name, description, sidebar, creator_id, creator_name, members, datetime) VALUES (?, ?, ?, ?, ?, 0, NOW() )';
        const insertParams = [name, description, sidebar, creatorId, creatorName];
        yield connection.query(insertQuery, insertParams);
        const subIdQuery = 'SELECT LAST_INSERT_ID() AS id FROM subs';
        const [results] = yield connection.query(subIdQuery);
        const subId = results[0].id;
        // commit the transaction and release the connection
        yield connection.commit();
        yield connection.release();
        return res.redirect(`/subs/subscribe/${subId}`);
    }
    catch (error) {
        // if there was an error, rollback changes and release the connection
        yield connection.rollback();
        yield connection.release();
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>');
    }
}));
router.get('/subscribe/:id', auth, getsubids, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const userId = req.userId;
        const subId = req.params.id;
        if (!Number.isInteger(parseInt(subId))) {
            yield connection.release();
            return res.status(500).send('<h1>Stop it. Get some help.</h1>');
        }
        let updatedSubscribed;
        // start a transaction
        yield connection.beginTransaction();
        if (req.subscribed.includes(parseInt(subId))) {
            updatedSubscribed = req.subscribed.filter((subbedId) => subbedId !== parseInt(subId));
            const subQuery = 'UPDATE subs SET members = members - 1 WHERE id = ?';
            const subParams = [subId];
            yield connection.query(subQuery, subParams);
        }
        else {
            updatedSubscribed = [...req.subscribed, subId];
            const subQuery = 'UPDATE subs SET members = members + 1 WHERE id = ?';
            const subParams = [subId];
            yield connection.query(subQuery, subParams);
        }
        const updateQuery = 'UPDATE users SET subscribed = ? WHERE id = ?';
        const updateParams = [updatedSubscribed.join(','), userId];
        yield connection.query(updateQuery, updateParams);
        // commit the transaction and release the connection
        yield connection.commit();
        yield connection.release();
        if (req.originalUrl === `/subs/${subId}` || req.originalUrl === `/subs/subscribe/${subId}`) {
            return res.redirect(`/subs/${subId}`);
        }
        else {
            return res.redirect('back');
        }
    }
    catch (error) {
        // if there was an error, rollback changes and release the connection
        yield connection.rollback();
        yield connection.release();
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>');
    }
}));
router.get('/:id', auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let page = 1;
        const pagelimit = 15;
        const offset = (page - 1) * pagelimit;
        if (req.query.page) {
            page = parseInt(req.query.page.toString());
            if (!Number.isInteger(page)) {
                return res.status(500).send('<h1>Yea.. page ID must be a number buddy.</h1>');
            }
        }
        let sort = 'hot';
        const subId = req.params.id;
        if (!Number.isInteger(parseInt(subId))) {
            return res.status(500).send('<h1>Yea.. sub ID must be a number buddy.</h1>');
        }
        let comments = [];
        let ratings = [];
        let params = [subId, subId, subId, pagelimit, offset];
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
                    ORDER BY ratecount DESC, rating DESC`;
        if (req.query.sort) {
            sort = req.query.sort.toString();
            if (sort === 'new') {
                query = 'SELECT * FROM posts WHERE sub_id = ? ORDER BY datetime DESC';
                params = [subId, pagelimit, offset];
            }
            else if (sort === 'top') {
                query = 'SELECT * FROM posts WHERE sub_id = ? ORDER BY rating DESC';
                params = [subId, pagelimit, offset];
            }
            else {
                sort = 'hot';
            }
        }
        query = query + ' LIMIT ? OFFSET ?';
        const [posts] = yield req.database.query(query, params);
        const postIds = posts.map((post) => post.id);
        const commentQuery = 'SELECT * FROM comments WHERE post_id IN (?)';
        const commentParams = [postIds];
        if (postIds.length > 0) {
            [comments] = yield req.database.query(commentQuery, commentParams);
        }
        const ratingsQuery = 'SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?';
        const ratingsParams = [postIds, req.userId];
        if (postIds.length > 0) {
            [ratings] = yield req.database.query(ratingsQuery, ratingsParams);
        }
        const subQuery = 'SELECT * FROM subs WHERE id = ?';
        const subParams = [subId];
        const [sub] = yield req.database.query(subQuery, subParams);
        return res.render('frontpage', { req, sub: sub[0], ratings, pagelimit, page, sort, posts, comments, title: 'CVExchange - Fly into nothingness', layout: './layouts/subexchange' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>');
    }
}));
router.get('/search/:id', auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pagelimit = 15;
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page.toString());
            if (!Number.isInteger(page)) {
                return res.status(500).send('<h1>Yea.. page ID must be a number buddy.</h1>');
            }
        }
        const subId = req.params.id;
        if (!Number.isInteger(parseInt(subId))) {
            return res.status(500).send('<h1>Yea.. sub ID must be a number buddy.</h1>');
        }
        const offset = (page - 1) * pagelimit;
        let comments = [];
        let ratings = [];
        const search = req.query.q;
        const searchQuery = 'SELECT p.*, MATCH (creator_name, sub_name, title, text) AGAINST (?) AS score FROM posts p WHERE MATCH (creator_name, sub_name, title, text) AGAINST (?) AND p.sub_id = ? LIMIT ? OFFSET ?';
        const searchParams = [search, search, req.params.id, pagelimit, offset];
        const [posts] = yield req.database.query(searchQuery, searchParams);
        const postIds = posts.map((post) => post.id);
        const commentQuery = 'SELECT * FROM comments WHERE post_id IN (?)';
        const commentParams = [postIds];
        if (postIds.length > 0) {
            [comments] = yield req.database.query(commentQuery, commentParams);
        }
        const ratingsQuery = 'SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?';
        const ratingsParams = [postIds, req.userId];
        if (postIds.length > 0) {
            [ratings] = yield req.database.query(ratingsQuery, ratingsParams);
        }
        const subQuery = 'SELECT * FROM subs WHERE id = ?';
        const subParams = [subId];
        const [sub] = yield req.database.query(subQuery, subParams);
        return res.render('frontpage', { req, sub: sub[0], pagelimit, page, posts, comments, ratings, title: 'Search Results', layout: './layouts/subsearch' });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send('<h1>Internal Server Error</h1>');
    }
}));
// --------------------------------
module.exports = router;
