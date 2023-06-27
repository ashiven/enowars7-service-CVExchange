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
require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET;
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const verifyAsync = promisify(jwt.verify);
function auth(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = req.cookies.jwtToken;
            if (token) {
                const decoded = yield verifyAsync(token, jwtSecret);
                req.userId = decoded.userId;
                next();
            }
            else {
                return res.status(401).send("<h1>Unauthenticated</h1>");
            }
        }
        catch (error) {
            console.error(error);
            return res.status(500).send("<h1>Internal Server Error</h1>");
        }
    });
}
function fileAuth(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const filepath = req.originalUrl;
            const userId = req.userId;
            if (filepath.startsWith("/uploads/" +
                Buffer.from(userId.toString()).toString("base64") +
                "/")) {
                next();
            }
            else {
                return res
                    .status(403)
                    .send("<h1>You are not allowed to access this users files.</h1>");
            }
        }
        catch (error) {
            console.error(error);
            return res.status(500).send("<h1>Internal Server Error</h1>");
        }
    });
}
module.exports = { auth, fileAuth, jwtSecret };
