import PostModal from "../models/Post.js";

export const createPost = async (req, res) => {
    console.log(req.body);
    try {
        const doc = new PostModal({
            title: req.body.title,
            text: req.body.text,
            imageUrl: req.file
                ? `/uploads/${req.file.originalname}`
                : undefined,
            tags: req.body.tags,
            user: req.userId,
        });
        const post = await doc.save();
        res.json({ post });
    } catch (err) {
        console.log("[CreatePost]", err);
        res.status(500).json({
            message: "Не удалось создать стастью",
        });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await PostModal.find().populate("user").exec();

        for (let item of posts) {
            const { ...user } = item.user._doc;
            delete user.passwordHash;
            item.user._doc = user;
        }

        res.json(posts.reverse());
    } catch (err) {
        console.log("[getAppPosts]", err);
        res.status(500).json({
            message: "Не удалось получить статьи",
        });
    }
};

export const getOnesPost = (req, res) => {
    try {
        const id = req.params.id;
        if (id) {
            PostModal.findOneAndUpdate(
                {
                    _id: id,
                },
                {
                    $inc: { viewCount: 1 },
                },
                {
                    returnDocument: "after",
                },
                async (err, doc) => {
                    if (err) {
                        console.log("[getOnesPost/findOneAndUpdate]", err);
                        return res
                            .status(500)
                            .json({ message: "Не удалось получить статью" });
                    }
                    if (!doc) {
                        return res
                            .status(404)
                            .json({ message: "Статья не найдена" });
                    }
                    const { user } = doc;
                    const { passwordHash, ...newUser } = user._doc;
                    doc.user = newUser;
                    res.json(doc);
                }
            ).populate("user");
        }
    } catch (err) {
        console.log("[getOnesPost]", err);
        res.status(500).json({
            message: "Не удалось получить статью",
        });
    }
};

export const removePost = (req, res) => {
    try {
        const id = req.params.id;

        if (id) {
            PostModal.findOneAndDelete(
                {
                    _id: id,
                },
                (err, doc) => {
                    if (err) {
                        console.log("[removePost/findOneAndDelete]", err);
                        return res
                            .status(500)
                            .json({ message: "Не удалось удалить статью" });
                    }
                    if (!doc) {
                        return res
                            .status(404)
                            .json({ message: "Статья не найдена" });
                    }
                    res.json(doc);
                }
            );
        }
    } catch (err) {
        console.log("[findOneAndDelete]", err);
        res.status(500).json({ message: "Не удалось удалить статью" });
    }
};

export const updatePost = async (req, res) => {
    try {
        const id = req.params.id;
        if (id) {
            await PostModal.updateOne(
                {
                    _id: id,
                },
                {
                    title: req.body.title,
                    text: req.body.text,
                    imageUrl: req.body.imageUrl,
                    tags: req.body.tags,
                    user: req.userId,
                }
            );
            res.json({ message: true });
        }
    } catch (err) {
        console.log("[updatePost]", err);
        res.status(500).json("Не удалось обновить пост");
    }
};

export const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.body.userId;
        if (!postId || !userId) {
            return res
                .status(403)
                .json({ message: "missing UserId or PostsId" });
        }
        const post = await PostModal.findById(postId);
        const userIdLike = post?.like.find((elem) => elem === userId);

        let updatePost;

        if (userIdLike) {
            updatePost = await PostModal.findOneAndUpdate(
                { _id: postId },
                { $pull: { like: userId } }
            );
        } else {
            updatePost = await PostModal.findOneAndUpdate(
                { _id: postId },
                {
                    $push: {
                        like: userId,
                    },
                }
            );
        }

        res.status(200).json(`post ${postId} liked`);
    } catch (err) {
        res.status(500).json({
            message: `Post like failed, server error`,
        });
        console.log(`[PostController.likePost] ${err}`);
    }
};
