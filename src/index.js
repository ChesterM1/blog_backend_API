import express from "express";
import mongoose from "mongoose";
import {
    PostController,
    TagsController,
    UserController,
    CommentController,
} from "./controllers/index.js";
// import {
//     registerValidation,
//     loginValidation,
//     postCreateValidation,
//     AddCommentValidation,
// } from "./validation/validation.js";
import * as validation from "./validation/validation.js";
import { handelsValidationErrors, checkAuth } from "./utils/index.js";

import dotenv from "dotenv";
import cors from "cors";
import { upload } from "./utils/IMGPostService.js";

dotenv.config();
export const SECRET = process.env.SECRET;

mongoose
    .connect(process.env.DB_URL)
    .then(() => console.log("[DataBase] Connect OK"))
    .catch((err) => console.log("[DataBase] Connect error", err));

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.post(
    "/auth/login",
    validation.loginValidation,
    handelsValidationErrors,
    UserController.login
);

app.post(
    "/auth/register",
    validation.registerValidation,
    handelsValidationErrors,
    UserController.register
);

app.get("/auth/me", checkAuth, UserController.getMe);

app.post(
    "/posts",
    checkAuth,
    upload.single("image"),
    validation.postCreateValidation,
    handelsValidationErrors,
    PostController.createPost
);

app.get("/posts", PostController.getAllPosts);

app.get("/posts/:id", PostController.getOnePost);

app.delete("/posts/:id", checkAuth, PostController.removePost);

app.post("/posts/like", checkAuth, PostController.likePost);

app.post("/posts/unLike", checkAuth, PostController.unLikePost);

app.patch(
    "/posts/:id",
    checkAuth,
    upload.single("image"),
    validation.postCreateValidation,
    handelsValidationErrors,
    PostController.updatePost
);

app.get("/tags", TagsController.getAllTags);

app.get("/comment/:id", CommentController.getComment);

app.post(
    "/comment",
    checkAuth,
    validation.AddCommentValidation,
    handelsValidationErrors,
    CommentController.AddComment
);

app.patch("/comment", checkAuth, CommentController.editComment);

app.get("/comment", CommentController.lastComment);

app.delete("/comment/:id", checkAuth, CommentController.removeComment);

app.post("/comment/like", checkAuth, CommentController.like);

app.post("/comment/removelike", checkAuth, CommentController.removeLike);

app.post("/comment/dislike", checkAuth, CommentController.dislike);

app.post("/comment/removedislike", checkAuth, CommentController.removeDislike);

app.listen(process.env.PORT, (err) => {
    if (err) {
        return console.log(err);
    }
    console.log("Server OK");
});
