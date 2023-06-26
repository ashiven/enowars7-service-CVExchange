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
const { auth } = require('../middleware/auth');
// Route definitions
router.post('/ratepost', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const userId = req.userId;
        const rating = parseInt(req.body.rating);
        if (!(rating === 1 || rating === -1)) {
            yield connection.release();
            return res.status(400).send('<h1>I see what you were trying to do ;)</h1>');
        }
        const postId = req.body.postId;
        if (!Number.isInteger(parseInt(postId))) {
            yield connection.release();
            return res.status(500).send("<h1>That won't work.</h1>");
        }
        // start a transaction
        yield connection.beginTransaction();
        const searchQuery = 'SELECT * FROM ratings WHERE user_id = ? AND post_id = ?';
        const searchParams = [userId, postId];
        const [searchResults] = yield connection.query(searchQuery, searchParams);
        // if the user already voted on that post, update/delete their rating
        if (searchResults.length > 0) {
            // they are submitting the same rating again
            if (searchResults[0].rating === rating) {
                const deleteQuery = 'DELETE FROM ratings WHERE user_id = ? AND post_id = ?';
                const deleteParams = [userId, postId];
                yield connection.query(deleteQuery, deleteParams);
            }
            else {
                const updateQuery = 'UPDATE ratings SET rating = ?, datetime = NOW() WHERE user_id = ? AND post_id = ?';
                const updateParams = [rating, userId, postId];
                yield connection.query(updateQuery, updateParams);
            }
        }
        else {
            const insertQuery = 'INSERT INTO ratings (user_id, post_id, rating, datetime) VALUES (?, ?, ?, NOW())';
            const insertParams = [userId, postId, rating];
            yield connection.query(insertQuery, insertParams);
        }
        // now we accumulate the ratings of a post and update the rating entry for it
        const accQuery = 'SELECT SUM(rating) AS total_rating FROM ratings WHERE post_id = ?';
        const accParams = [postId];
        const [accResults] = yield connection.query(accQuery, accParams);
        // we need an if/else in case the post has 0 votes, meaning it should receive a rating of 0
        const total = accResults[0].total_rating;
        if (total !== null) {
            const postQuery = 'UPDATE posts SET rating = ? WHERE id = ?';
            const postParams = [total, postId];
            yield connection.query(postQuery, postParams);
        }
        else {
            const postQuery = 'UPDATE posts SET rating = 0 WHERE id = ?';
            const postParams = [postId];
            yield connection.query(postQuery, postParams);
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
router.post('/ratecomment', auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const userId = req.userId;
        const rating = parseInt(req.body.rating);
        if (!(rating === 1 || rating === -1)) {
            yield connection.release();
            return res.status(400).send('<h1>I see what you were trying to do ;)</h1>');
        }
        const commentId = req.body.commentId;
        if (!Number.isInteger(parseInt(commentId))) {
            yield connection.release();
            return res.status(500).send("<h1>That won't work.</h1>");
        }
        // start a transaction
        yield connection.beginTransaction();
        const searchQuery = 'SELECT * FROM ratings WHERE user_id = ? AND comment_id = ?';
        const searchParams = [userId, commentId];
        const [searchResults] = yield connection.query(searchQuery, searchParams);
        // if the user already voted on that comment, update/delete their rating
        if (searchResults.length > 0) {
            // they are submitting the same rating again
            if (searchResults[0].rating === rating) {
                const deleteQuery = 'DELETE FROM ratings WHERE user_id = ? AND comment_id = ?';
                const deleteParams = [userId, commentId];
                yield connection.query(deleteQuery, deleteParams);
            }
            else {
                const updateQuery = 'UPDATE ratings SET rating = ?, datetime = NOW() WHERE user_id = ? AND comment_id = ?';
                const updateParams = [rating, userId, commentId];
                yield connection.query(updateQuery, updateParams);
            }
        }
        else {
            const insertQuery = 'INSERT INTO ratings (user_id, comment_id, rating, datetime) VALUES (?, ?, ?, NOW())';
            const insertParams = [userId, commentId, rating];
            yield connection.query(insertQuery, insertParams);
        }
        // now we accumulate the ratings of a comment and update the rating entry for it
        const accQuery = 'SELECT SUM(rating) AS total_rating FROM ratings WHERE comment_id = ?';
        const accParams = [commentId];
        const [accResults] = yield connection.query(accQuery, accParams);
        // we need an if/else in case the comment has 0 votes, meaning it should receive a rating of 0
        const total = accResults[0].total_rating;
        if (total !== null) {
            const commentQuery = 'UPDATE comments SET rating = ? WHERE id = ?';
            const commentParams = [total, commentId];
            yield connection.query(commentQuery, commentParams);
        }
        else {
            const commentQuery = 'UPDATE comments SET rating = 0 WHERE id = ?';
            const commentParams = [commentId];
            yield connection.query(commentQuery, commentParams);
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
// --------------------------------
module.exports = router;
