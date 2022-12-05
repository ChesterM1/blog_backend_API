import { ObjectId } from "mongodb";
import PostModal from "../models/Post.js";
import TagsModal from "../models/Tags.js";
import TagsInPost from "../models/TagsInPost.js";
import LikeInPostModal from "../models/LikeInPost.js";
import CommentModal from "../models/Comment.js";
import { removeImg } from "../utils/IMGPostService.js";
import bodyStrReplace from "../utils/bodyStrReplace.js";
import jwt from "jsonwebtoken";
import { SECRET } from "../index.js";

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
    const { limit, popular, activeTags } = req.query;
    const token = (req.headers.authorization || "").replace(/Bearer\s?/, "");
    const { _id: userId } = token && jwt.verify(token, SECRET);
    const sortTo = popular === "1" ? { viewCount: -1 } : { createdAt: -1 };

    try {
        const tag = activeTags && bodyStrReplace(activeTags);

        const findPostForId = async () => {
            if (!tag) {
                return;
            }
            const tagsId = await TagsModal.find({ name: tag });
            const findPostInTags = await TagsInPost.find({ tagsId });

            if (findPostInTags.length < 0) {
                return;
            }
            return findPostInTags?.map((item) => item.postId);
        };

        const postIdResponse = await findPostForId();

        const posts = await PostModal.find(
            postIdResponse && {
                _id: { $in: postIdResponse },
            }
        )
            .sort(sortTo)
            .limit(limit)
            .populate("user")
            .exec();

        const postsCount = tag ? posts.length : await PostModal.count();
        for (let item of posts) {
            const { ...user } = item.user._doc;
            delete user.passwordHash;
            item.user._doc = user;
        }

        //find Like
        const findPostDependence = await Promise.allSettled(
            posts.map(async (post) => {
                const likeResult = await LikeInPostModal.find({
                    postId: post._id,
                });
                const likeCount = likeResult.length;
                const likes = await LikeInPostModal.find({
                    postId: post._id,
                    userId,
                }).count();
                const isLiked = likes > 0;

                const commentCount = await CommentModal.find({
                    postId: post._id,
                }).count();
                return { id: post._id, likeCount, isLiked, commentCount };
            })
        );

        //comment
        // const comment = await CommentModal.find({
        //     postId: { $in: posts.map((item) => item._id) },
        // });
        // console.log(comment);
        //tags
        const getTags = await TagsInPost.find({
            postId: { $in: posts.map((post) => post._id) },
        }).populate("tagsId");

        const postWithTagAndLike = posts.map((post) => {
            const tagFilter = getTags.filter(
                (tag) => tag.postId.toString() === post._doc._id.toString()
            );
            const postDependence = findPostDependence.filter(
                (like) => like.value.id.toString() === post._id.toString()
            );

            return {
                ...post._doc,
                tags: tagFilter.map((tag) => tag.tagsId.name),
                like: postDependence.reduce(
                    (_, like) => ({
                        likeCount: like.value.likeCount,
                        isLiked: like.value.isLiked,
                    }),
                    {}
                ),
                comment: postDependence.reduce(
                    (_, count) => count.value.commentCount,
                    0
                ),
            };
        });

        if (limit) {
            res.json({
                data: postWithTagAndLike,
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
    const token = (req.headers.authorization || "").replace(/Bearer\s?/, "");
    const { _id: userId } = token && jwt.verify(token, SECRET);

    try {
        const id = bodyStrReplace(req.params.id);
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

                    //tags
                    const findTags = await TagsInPost.find({
                        postId: { $in: doc._id },
                    }).populate("tagsId");

                    //likes
                    const likeCount = await LikeInPostModal.find({
                        postId: id,
                    }).count();

                    const isLiked = await LikeInPostModal.find({
                        postId: id,
                        userId,
                    }).count();

                    const like = {
                        likeCount,
                        isLiked: isLiked > 0,
                    };
                    //comment
                    const comment = await CommentModal.find({
                        postId: id,
                    }).count();
                    const post = {
                        ...doc._doc,
                        tags: findTags.map((tag) => tag.tagsId.name),
                        like,
                        comment,
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
        const id = bodyStrReplace(req.params.id);

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

            //comments
            await CommentModal.deleteMany({ postId: id });
            //likes
            await LikeInPostModal.deleteMany({ postId: id });

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
        const postId = bodyStrReplace(req.body.postId);
        const userId = bodyStrReplace(req.body.userId);

        if (!postId || !userId) {
            return res
                .status(403)
                .json({ message: "missing UserId or PostsId" });
        }
        const findLike = await LikeInPostModal.find({ userId, postId });
        if (findLike.length > 0) {
            return res
                .status(403)
                .json(`post ${postId} liked, usage unLike method`);
        }

        const postLiked = new LikeInPostModal({ postId, userId });
        await postLiked.save();

        res.status(200).json(`post ${postId} liked`);
    } catch (err) {
        res.status(500).json({
            message: `Post like failed, server error`,
        });
        console.log(`[PostController.likePost] ${err}`);
    }
};

export const unLikePost = async (req, res) => {
    try {
        const postId = bodyStrReplace(req.body.postId);
        const userId = bodyStrReplace(req.body.userId);

        if (!postId || !userId) {
            return res
                .status(403)
                .json({ message: "missing UserId or PostsId" });
        }
        const findLike = await LikeInPostModal.find({ userId, postId });

        if (!findLike.length) {
            return res
                .status(404)
                .json(`this user not liked post ${postId}, not found`);
        }
        await LikeInPostModal.findOneAndRemove({ postId, userId });

        res.status(200).json(`post ${postId} unLiked`);
    } catch (e) {
        res.status(500).json({
            message: `Post like failed, server error`,
        });
        console.log(`[PostController.likePost] ${err}`);
    }
};
