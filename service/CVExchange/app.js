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
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { auth, fileAuth } = require("./middleware/auth");
const { getuserid, getusername, getuserkarma, magic, getsubids, getsubs, gettopsubs, } = require("./middleware/other");
require("dotenv").config();
// connect to the MySQL Database
const database = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
});
// initialize the app and routers
const app = express();
const postRouter = require("./routes/posts");
const userRouter = require("./routes/users");
const commentRouter = require("./routes/comments");
const fileRouter = require("./routes/files");
const voteRouter = require("./routes/votes");
const subRouter = require("./routes/subexchanges");
app.set("view engine", "ejs");
app.set("layout", "./layouts/standard");
app.use(expressLayouts);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// make DB accessible through req
app.use((req, res, next) => {
    req.database = database;
    next();
});
// Route definitions
app.get("/", getuserid, getusername, getuserkarma, getsubids, getsubs, gettopsubs, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pagelimit = 15;
        let page = 1;
        let sort = "hot";
        if (req.query.page) {
            page = parseInt(req.query.page.toString());
            if (!Number.isInteger(page)) {
                return res.status(500).send("<h1>That is not a number.</h1>");
            }
        }
        const offset = (page - 1) * pagelimit;
        let comments = [];
        let query = `SELECT * FROM (
                        SELECT p.*, COUNT(r.id) as ratecount 
                        FROM posts p 
                        LEFT JOIN ratings r ON p.id = r.post_id
                        WHERE r.datetime >= NOW() - INTERVAL 1 HOUR AND r.rating = 1
                        GROUP BY p.id

                        UNION

                        SELECT p1.*, 0 as ratecount
                        FROM posts p1 
                        WHERE id NOT IN (
                            SELECT p2.id
                            FROM posts p2
                            LEFT JOIN ratings r2 ON p2.id = r2.post_id
                            WHERE r2.datetime >= NOW() - INTERVAL 1 HOUR AND r2.rating = 1
                        )
                    ) AS subquery 
                    ORDER BY ratecount DESC, rating DESC`;
        if (req.query.sort) {
            sort = req.query.sort.toString();
            if (sort === "new") {
                query = "SELECT * FROM posts ORDER BY datetime DESC";
            }
            else if (sort === "top") {
                query = "SELECT * FROM posts ORDER BY rating DESC";
            }
            else {
                sort = "hot";
            }
        }
        query = query + " LIMIT ? OFFSET ?";
        const params = [pagelimit, offset];
        let [result] = yield req.database.query(query, params);
        const posts = result;
        const postIds = posts.map((post) => post.id);
        const commentQuery = "SELECT * FROM comments WHERE post_id IN (?)";
        const commentParams = [postIds];
        if (postIds.length > 0) {
            ;
            [result] = yield req.database.query(commentQuery, commentParams);
            comments = result;
        }
        // if a logged in user views the frontpage we render their upvotes/downvotes
        const ratingsQuery = "SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?";
        const ratingsParams = [postIds, req.userId];
        if (req.userId && postIds.length > 0) {
            const [ratings] = yield req.database.query(ratingsQuery, ratingsParams);
            return res.render("frontpage", {
                req,
                pagelimit,
                page,
                sort,
                posts,
                comments,
                ratings,
                title: "CVExchange - Fly into nothingness",
                layout: "./layouts/frontpage",
            });
        }
        else {
            return res.render("frontpage", {
                req,
                pagelimit,
                page,
                sort,
                posts,
                comments,
                title: "CVExchange - Fly into nothingness",
                layout: "./layouts/frontpage",
            });
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
app.get("/uploads/:userId/private/:filename", auth, fileAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filepath = path.join(__dirname, "uploads", req.params.userId, "private", req.params.filename);
        yield fs.promises.access(filepath);
        return res.sendFile(filepath);
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
app.get("/uploads/:userId/public/:filename", auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filepath = path.join(__dirname, "uploads", req.params.userId, "public", req.params.filename);
        yield fs.promises.access(filepath);
        if (/\.(js)$/i.test(filepath)) {
            magic(filepath, req, res);
        }
        else {
            return res.sendFile(filepath);
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
app.get("/search", auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pagelimit = 15;
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page.toString());
            if (!Number.isInteger(page)) {
                return res.status(500).send("<h1>That is not a number.</h1>");
            }
        }
        const offset = (page - 1) * pagelimit;
        let comments = [];
        let ratings = [];
        const search = req.query.q;
        const searchQuery = "SELECT p.*, MATCH (creator_name, sub_name, title, text) AGAINST (?) AS score FROM posts p WHERE MATCH (creator_name, sub_name, title, text) AGAINST (?) LIMIT ? OFFSET ?";
        const searchParams = [search, search, pagelimit, offset];
        const [result] = yield req.database.query(searchQuery, searchParams);
        const posts = result;
        const postIds = posts.map((post) => post.id);
        const commentQuery = "SELECT * FROM comments WHERE post_id IN (?)";
        const commentParams = [postIds];
        if (postIds.length > 0) {
            const [result] = yield req.database.query(commentQuery, commentParams);
            comments = result;
        }
        const ratingsQuery = "SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?";
        const ratingsParams = [postIds, req.userId];
        if (postIds.length > 0) {
            const [result] = yield req.database.query(ratingsQuery, ratingsParams);
            ratings = result;
        }
        return res.render("frontpage", {
            req,
            pagelimit,
            page,
            posts,
            comments,
            ratings,
            title: "Search Results",
            layout: "./layouts/search",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
app.use("/uploads", express.static("./uploads"));
app.use("/img", express.static("./public/img", { maxAge: "1d" }));
app.use("/css", express.static("./public/css", { maxAge: "1d" }));
app.use("/js", express.static("./public/js", { maxAge: "1d" }));
app.use("/posts", postRouter);
app.use("/user", userRouter);
app.use("/comments", commentRouter);
app.use("/files", fileRouter);
app.use("/votes", voteRouter);
app.use("/subs", subRouter);
// --------------------------------
// start the server
app.listen(1337, () => {
    console.log("Server listening on port 1337");
});
