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
const router = require("express").Router();
const sanitizer = require("sanitizer");
const { auth } = require("../middleware/auth");
const { getusername } = require("../middleware/other");
// Route definitions
router.post("/new", auth, getusername, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const comment = sanitizer.escape(req.body.comment);
        if (!comment || comment === "") {
            yield connection.release();
            return res
                .status(500)
                .send("<h1>You need to supply a comment!</h1>");
        }
        if (comment.length > 500) {
            yield connection.release();
            return res
                .status(500)
                .send("<h1>Please limit your comment to 500 characters.</h1>");
        }
        const postId = req.body.postId;
        if (!Number.isInteger(parseInt(postId))) {
            yield connection.release();
            return res.status(500).send("<h1>Dont test my patience bud.</h1>");
        }
        let parentId;
        if (req.body.parentId) {
            parentId = req.body.parentId;
            if (!Number.isInteger(parseInt(parentId))) {
                yield connection.release();
                return res
                    .status(500)
                    .send("<h1>Dont test my patience bud.</h1>");
            }
        }
        const creatorId = req.userId;
        const creatorName = req.username;
        // start a transaction
        yield connection.beginTransaction();
        const spamQuery = "SELECT * FROM comments WHERE creator_id = ? ORDER BY datetime DESC LIMIT 1";
        const spamParams = [creatorId];
        const [result] = yield connection.query(spamQuery, spamParams);
        const spam = result;
        if (spam.length > 0) {
            // ensure that users can only post a new comment every 3 seconds
            const currentTime = new Date().getTime();
            const spamTime = spam[0].datetime.getTime();
            if (Math.floor(currentTime - spamTime / 1000) < 3) {
                yield connection.commit();
                yield connection.release();
                return res.redirect(`/posts/${postId}`);
            }
        }
        if (parentId) {
            const insertQuery = "INSERT INTO comments (text, post_id, creator_id, creator_name, rating, datetime, parent_id) VALUES (?, ?, ?, ?,  1,  NOW(), ? )";
            const insertParams = [
                comment,
                postId,
                creatorId,
                creatorName,
                parentId,
            ];
            yield connection.query(insertQuery, insertParams);
        }
        else {
            const insertQuery = "INSERT INTO comments (text, post_id, creator_id, creator_name, rating, datetime) VALUES (?, ?, ?, ?,  1,  NOW() )";
            const insertParams = [comment, postId, creatorId, creatorName];
            yield connection.query(insertQuery, insertParams);
        }
        const commentIdQuery = "SELECT LAST_INSERT_ID() AS id FROM comments";
        const [results] = yield connection.query(commentIdQuery);
        const commentIdResults = results;
        const commentId = commentIdResults[0].id;
        const ratingQuery = "INSERT INTO ratings (user_id, comment_id, rating, datetime) VALUES (?, ?, 1, NOW())";
        const ratingParams = [creatorId, commentId];
        yield connection.query(ratingQuery, ratingParams);
        // commit the transaction and release the connection
        yield connection.commit();
        yield connection.release();
        return res.redirect(`/posts/${postId}`);
    }
    catch (error) {
        // if there was an error, rollback changes and release the connection
        yield connection.rollback();
        yield connection.release();
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
router.post("/edit/:id", auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const text = sanitizer.escape(req.body.text);
        if (!text || text === "") {
            return res.status(500).send("<h1>You need to supply a comment!</h1>");
        }
        if (text.length > 500) {
            return res
                .status(500)
                .send("<h1>Please limit your comment to 500 characters.</h1>");
        }
        const commentId = req.params.id;
        if (!Number.isInteger(parseInt(commentId))) {
            return res.status(500).send("<h1>Dont test my patience bud.</h1>");
        }
        const userId = req.userId;
        const query = "UPDATE comments SET text = ? WHERE id = ? AND creator_id = ?";
        const params = [text, commentId, userId];
        yield req.database.query(query, params);
        return res.redirect("back");
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
router.get("/delete/:id", auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const commentId = req.params.id;
        if (!Number.isInteger(parseInt(commentId))) {
            yield connection.release();
            return res
                .status(500)
                .send("<h1>Can't delete imaginary comments.</h1>");
        }
        const userId = req.userId;
        // start a transaction
        yield connection.beginTransaction();
        const findQuery = "SELECT * FROM comments WHERE id = ? AND creator_id = ?";
        const findParams = [commentId, userId];
        const [results] = yield connection.query(findQuery, findParams);
        const findResults = results;
        if (findResults.length > 0) {
            const deletedIds = [];
            yield deleteChildren(connection, parseInt(commentId), deletedIds);
            const deleteRatingsQuery = "DELETE FROM ratings WHERE comment_id IN (?)";
            const deleteRatingsParams = [deletedIds];
            yield connection.query(deleteRatingsQuery, deleteRatingsParams);
            // commit the transaction and release the connection
            yield connection.commit();
            yield connection.release();
            return res.redirect("back");
        }
        else {
            // commit the transaction and release the connection
            yield connection.commit();
            yield connection.release();
            return res
                .status(401)
                .send("<h1>You are not authorized to delete this comment or it doesn't exist</h1>");
        }
    }
    catch (error) {
        // if there was an error, rollback changes and release the connection
        yield connection.rollback();
        yield connection.release();
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
// --------------------------------
// Function definitions
function deleteChildren(connection, commentId, deletedIds) {
    return __awaiter(this, void 0, void 0, function* () {
        const childQuery = "SELECT id FROM comments WHERE parent_id = ?";
        const childParams = [commentId];
        const [result] = yield connection.query(childQuery, childParams);
        const children = result;
        const deleteQuery = "DELETE FROM comments WHERE id = ?";
        const deleteParams = [commentId];
        yield connection.query(deleteQuery, deleteParams);
        deletedIds.push(commentId);
        for (const child of children) {
            yield deleteChildren(connection, child.id, deletedIds);
        }
    });
}
// --------------------------------
module.exports = router;
