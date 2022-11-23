import { ObjectId } from "mongodb";
import PostModal from "../models/Post.js";
import TagsModal from "../models/Tags.js";
import TagsInPost from "../models/TagsInPost.js";
import { removeImg } from "../utils/IMGPostService.js";
import bodyStrReplace from "../utils/bodyStrReplace.js";
import { TagsController } from "./index.js";

export const createPost = async (req, res) => {
    try {
        // Create tags
        const tags = bodyStrReplace(req.body.tags)?.split(", ") || [];

        const tagsSettledResult = await Promise.allSettled(
            tags.map(async (tag) => {
                return await TagsModal.findOneAndUpdate(
                    { name: tag },
                    {},
                    { upsert: true, new: true }
                );
            })
        );

        const tagsEntities = tagsSettledResult.map((item) => item.value);

        // Create post
        const doc = new PostModal({
            title: bodyStrReplace(req.body.title),
            text: bodyStrReplace(req.body.text),
            imageUrl: req.file ? `/uploads/${req.fileName}` : undefined,
            tags: bodyStrReplace(req.body.tags)?.split(", ") || [],
            user: req.userId,
        });

        const post = await doc.save();

        // Create references from tags and post
        await TagsInPost.insertMany(
            tagsEntities.map((tagEntity) => ({
                postId: post._id,
                tagsId: tagEntity._id,
            }))
        );

        // Returning data
        res.json({
            post: {
                ...post._doc,
                tags: tagsEntities.map((tag) => tag.name),
            },
        });
    } catch (err) {
        console.log("[CreatePost]", err);
        res.status(500).json({
            message: "Не удалось создать статью",
        });
    }
};

export const getAllPosts = async (req, res) => {
    const { limit } = req.query;
    try {
        const postsCount = await PostModal.count();
        const posts = await PostModal.find()
            .sort([["createdAt", -1]])
            .limit(limit)
            .populate("user")
            .exec();

        for (let item of posts) {
            const { ...user } = item.user._doc;
            delete user.passwordHash;
            item.user._doc = user;
        }

        const getTags = await TagsInPost.find({
            postId: { $in: posts.map((post) => post._id) },
        }).populate("tagsId");

        const postWithTags = posts.map((post) => {
            const tagFilter = getTags.filter(
                (tag) => tag.postId.toString() === post._doc._id.toString()
            );

            return {
                ...post._doc,
                tags: tagFilter.map((tag) => tag.tagsId.name),
            };
        });

        if (limit) {
            res.json({
                data: postWithTags,
                totalPost: postsCount,
                sendPost: limit > posts.length ? posts.length : parseInt(limit),
            });
        } else {
            res.json(posts);
        }
    } catch (err) {
        console.log("[getAppPosts]", err);
        res.status(500).json({
            message: "Не удалось получить статьи",
        });
    }
};

export const getOnePost = (req, res) => {
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

                    const findTags = await TagsInPost.find({
                        postId: { $in: doc._id },
                    }).populate("tagsId");

                    const post = {
                        ...doc._doc,
                        tags: findTags.map((tag) => tag.tagsId.name),
                    };
                    res.json(post);
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

export const removePost = async (req, res) => {
    try {
        const id = req.params.id;

        if (id) {
            const findTags = await TagsInPost.find({
                postId: id,
            }).select("tagsId");

            await TagsInPost.deleteMany({ postId: id });

            for (const tag of findTags) {
                const count = await TagsInPost.count({ tagsId: tag.tagsId });
                if (count > 0) {
                    continue;
                }
                await TagsModal.deleteOne({ _id: tag.tagsId });
            }

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

                    removeImg(doc.imageUrl);
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
            const post = await PostModal.findById(id);
            if (req.fileName || !req.body.image) {
                removeImg(post.imageUrl);
            }

            let image = "";
            if (req.fileName) {
                image = `/uploads/${req.fileName}`;
            } else if (req.body.image) {
                image = req.body.image;
            }

            //TAGS
            const tags = bodyStrReplace(req.body.tags)?.split(", ") || [];

            const findOldTags = await TagsInPost.find({ postId: id }).populate(
                "tagsId"
            );

            const tagsSettledResult = await Promise.allSettled(
                tags.map(async (tag) => {
                    return await TagsModal.findOneAndUpdate(
                        { name: tag },
                        {},
                        { upsert: true, new: true }
                    );
                })
            );

            const saveTagsResult = tagsSettledResult.map((item) => item.value);
            //save new tags
            const tagsName = findOldTags.map((tag) => tag.tagsId.name);
            for (const tag of saveTagsResult) {
                if (tags.includes(tag.name) && !tagsName.includes(tag.name)) {
                    await TagsInPost.collection.insertOne({
                        tagsId: tag._id,
                        postId: ObjectId(id),
                    });
                }
            }

            // remove old reference tag
            for (const tag of findOldTags) {
                if (!tags.includes(tag.tagsId.name)) {
                    await TagsInPost.deleteOne({
                        tagsId: tag.tagsId._id,
                        postId: id,
                    });
                }
            }

            //delete un usage tags
            for (const tag of findOldTags) {
                const count = await TagsInPost.count({
                    tagsId: tag.tagsId._id,
                });
                if (count > 0) {
                    continue;
                }
                await TagsModal.deleteOne({ _id: tag.tagsId._id });
            }

            await PostModal.updateOne(
                {
                    _id: id,
                },
                {
                    title: bodyStrReplace(req.body.title),
                    text: bodyStrReplace(req.body.text),
                    imageUrl: image,
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

        if (userIdLike) {
            await PostModal.findOneAndUpdate(
                { _id: postId },
                { $pull: { like: userId } }
            );
        } else {
            await PostModal.findOneAndUpdate(
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
