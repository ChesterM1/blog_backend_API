import express from "express";
import mongoose from "mongoose";
import {
    PostController,
    TagsController,
    UserController,
} from "./controllers/index.js";
import {
    registerValidation,
    loginValidation,
    postCreateValidation,
} from "./validation/validation.js";
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
    loginValidation,
    handelsValidationErrors,
    UserController.login
);

app.post(
    "/auth/register",
    registerValidation,
    handelsValidationErrors,
    UserController.register
);

app.get("/auth/me", checkAuth, UserController.getMe);

app.post(
    "/posts",
    checkAuth,
    upload.single("image"),
    postCreateValidation,
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
    postCreateValidation,
    handelsValidationErrors,
    PostController.updatePost
);

app.get("/tags", TagsController.getAllTags);

app.listen(process.env.PORT, (err) => {
    if (err) {
        return console.log(err);
    }
    console.log("Server OK");
});
