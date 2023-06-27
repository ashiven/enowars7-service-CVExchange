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
const jwt = require("jsonwebtoken");
const { auth, jwtSecret } = require("../middleware/auth");
const { getusername, getuserkarma, getsubids, getsubs, gettopsubs, } = require("../middleware/other");
// Route definitions
router.get("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = "";
        if (!req.cookies.jwtToken) {
            return res.render("login", {
                status,
                title: "Login",
                layout: "./layouts/login",
            });
        }
        else {
            return res.status(400).send("<h1>Please log out first.</h1>");
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        const password = req.body.password;
        if (!email || !password || email === "" || password === "") {
            return res.render("login", {
                title: "Login",
                layout: "./layouts/login",
                status: "Please provide all required fields!",
            });
        }
        const query = "SELECT * FROM users WHERE email = ? AND password = ?";
        const params = [email, password];
        const [results] = yield req.database.query(query, params);
        const user = results;
        if (user.length > 0) {
            const userId = user[0].id;
            const token = jwt.sign({ userId }, jwtSecret);
            res.cookie("jwtToken", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });
            return res.redirect("/");
        }
        else {
            return res.render("login", {
                title: "Login",
                layout: "./layouts/login",
                status: "Wrong credentials, please try again!",
            });
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
router.post("/logout", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.clearCookie("jwtToken");
        return res.redirect("/");
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
router.get("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = "";
        if (!req.cookies.jwtToken) {
            return res.render("register", {
                status,
                title: "Register",
                layout: "./layouts/login",
            });
        }
        else {
            return res.status(400).send("<h1>Please log out first.</h1>");
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const connection = yield req.database.getConnection();
    try {
        const name = req.body.name.replace(/\s/g, "");
        const email = req.body.email.replace(/\s/g, "");
        const password = req.body.password.replace(/\s/g, "");
        if (!name ||
            !email ||
            !password ||
            name === "" ||
            email === "" ||
            password === "") {
            yield connection.release();
            return res.render("register", {
                title: "Register",
                layout: "./layouts/login",
                status: "Please provide all required fields!",
            });
        }
        if (!/^[a-zA-Z0-9]+$/.test(name)) {
            yield connection.release();
            return res.render("register", {
                title: "Register",
                layout: "./layouts/login",
                status: "Please only use numbers and letters for the username.",
            });
        }
        if (name.length < 5 || password.length < 8 || email.length < 6) {
            yield connection.release();
            return res.render("register", {
                title: "Register",
                layout: "./layouts/login",
                status: "Password needs to contain at least 8 characters and username at least 5.",
            });
        }
        if (name.length > 45 || password.length > 45 || email.length > 45) {
            yield connection.release();
            return res.render("register", {
                title: "Register",
                layout: "./layouts/login",
                status: "Please limit your inputs to 45 characters.",
            });
        }
        // start a transaction
        yield connection.beginTransaction();
        const searchQuery = "SELECT * FROM users WHERE email = ? OR name = ?";
        const searchParams = [email, name];
        const [result] = yield connection.query(searchQuery, searchParams);
        const searchResults = result;
        if (searchResults.length > 0) {
            // commit the transaction and release the connection
            yield connection.commit();
            yield connection.release();
            return res.render("register", {
                title: "Register",
                layout: "./layouts/login",
                status: "Username or email already taken.",
            });
        }
        const insertQuery = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        const insertParams = [name, email, password];
        yield connection.query(insertQuery, insertParams);
        const loginQuery = "SELECT * FROM users WHERE email = ? AND password = ?";
        const loginParams = [email, password];
        const [resultTwo] = yield connection.query(loginQuery, loginParams);
        const loginResults = resultTwo;
        if (loginResults.length > 0) {
            const userId = loginResults[0].id;
            const token = jwt.sign({ userId }, jwtSecret);
            res.cookie("jwtToken", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });
            // commit the transaction and release the connection
            yield connection.commit();
            yield connection.release();
            return res.redirect("/");
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
router.get("/profile/:id", auth, getusername, getuserkarma, getsubids, getsubs, gettopsubs, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const profileId = req.params.id;
        if (!Number.isInteger(parseInt(profileId))) {
            return res
                .status(500)
                .send(`<h1>What does 1 + ${profileId} make? Yea.. I wouldn't know either.</h1>`);
        }
        const pagelimit = 15;
        const userId = req.userId;
        let tab = "overview";
        if (req.query.tab) {
            tab = req.query.tab.toString();
        }
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page.toString());
            if (!Number.isInteger(page)) {
                return res.status(500).send("<h1>That is not a number.</h1>");
            }
        }
        let ratings = [];
        let commentPosts = [];
        const saved = [];
        const userQuery = "SELECT * FROM users WHERE id = ?";
        const userParams = [profileId];
        const [resultThree] = yield req.database.query(userQuery, userParams);
        const user = resultThree;
        const postQuery = "SELECT * FROM posts WHERE creator_id = ? ORDER BY datetime DESC ";
        const postParams = [profileId];
        const [result] = yield req.database.query(postQuery, postParams);
        const posts = result;
        const postIds = posts.map((post) => post.id);
        const commentQuery = "SELECT * FROM comments WHERE creator_id = ? ORDER BY datetime DESC ";
        const commentParams = [profileId];
        const [resultTwo] = yield req.database.query(commentQuery, commentParams);
        const comments = resultTwo;
        const commentIds = comments.map((comment) => comment.id);
        const commentPostIds = comments.map((comment) => comment.post_id);
        if (postIds.length > 0) {
            const postratingsQuery = "SELECT * FROM ratings WHERE post_id IN (?) AND user_id = ?";
            const postratingsParams = [postIds, userId];
            const [result] = yield req.database.query(postratingsQuery, postratingsParams);
            const postRatings = result;
            ratings = ratings.concat(postRatings);
        }
        if (commentIds.length > 0) {
            const commentRatingsQuery = "SELECT * FROM ratings WHERE comment_id IN (?) AND user_id = ?";
            const commentRatingsParams = [commentIds, userId];
            const [result] = yield req.database.query(commentRatingsQuery, commentRatingsParams);
            const commentRatings = result;
            ratings = ratings.concat(commentRatings);
        }
        if (commentPostIds.length > 0) {
            const commentPostsQuery = "SELECT * FROM posts WHERE id IN (?)";
            const commentPostsParams = [commentPostIds];
            const [result] = yield req.database.query(commentPostsQuery, commentPostsParams);
            const posts = result;
            commentPosts = commentPosts.concat(posts);
        }
        if (tab === "saved") {
            const selectQuery = "SELECT saved FROM users WHERE id = ?";
            const selectParams = [userId];
            const [result] = yield req.database.query(selectQuery, selectParams);
            const savedposts = result;
            const savedString = savedposts[0].saved;
            const savedIds = savedString
                ? savedString.split(",").map(Number)
                : [];
            const savedQuery = "SELECT * FROM posts WHERE id IN (?)";
            const savedParams = [savedIds];
            if (savedIds.length > 0) {
                const [result] = yield req.database.query(savedQuery, savedParams);
                const saved = result;
                const updatedSaved = savedIds.filter((id) => saved.some((post) => post.id === id));
                const updateQuery = "UPDATE users SET saved = ? WHERE id = ?";
                const updateParams = [updatedSaved.join(","), userId];
                yield req.database.query(updateQuery, updateParams);
            }
        }
        if (user.length > 0) {
            return res.render("profile", {
                tab,
                saved,
                page,
                pagelimit,
                req,
                user: user[0],
                posts,
                comments,
                commentPosts,
                ratings,
                title: `${user[0].name}'s Profile`,
                layout: "./layouts/profile",
            });
        }
        else {
            return res.status(404).send("<h1>User Not Found</h1>");
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
router.post("/editnote", auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const note = req.body.text;
        const updateQuery = "UPDATE users SET note = ? WHERE id = ?";
        const updateParams = [note, userId];
        yield req.database.query(updateQuery, updateParams);
        return res.redirect("back");
    }
    catch (error) {
        console.error(error);
        return res.status(500).send("<h1>Internal Server Error</h1>");
    }
}));
// --------------------------------
module.exports = router;
