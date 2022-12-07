import bodyStrReplace from "../utils/bodyStrReplace.js";
import CommentModal from "../models/Comment.js";
import LikedCommentModal from "../models/LikedComment.js";
import DislikeCommentModal from "../models/DislikeComment.js";
import jwt from "jsonwebtoken";
import { SECRET } from "../index.js";

export const AddComment = async (req, res) => {
    try {
        const userId = bodyStrReplace(req.body.userId);
        const postId = bodyStrReplace(req.body.postId);
        const text = bodyStrReplace(req.body.text);

        const doc = new CommentModal({ userId, postId, text });
        const comment = await doc.save();

        res.json(comment);
    } catch (err) {
        console.log("[ADD_COMMENT]", err);
        res.status(500).json({ message: "server error" });
    }
};

export const getComment = async (req, res) => {
    try {
        const token = (req.headers.authorization || "").replace(
            /Bearer\s?/,
            ""
        );
        const { _id: userId } = token && jwt.verify(token, SECRET);

        const postId = bodyStrReplace(req.params.id);
        if (!postId) {
            return res.status(400).json({ message: "enter postId" });
        }
        const comment = await CommentModal.find({ postId })
            .populate("userId")
            .sort({ createdAt: -1 });

        const sliceComment = comment.map((item) => {
            const { _id, fullName, createdAt } = item.userId;
            const { userId, ...other } = item._doc;
            return { ...other, user: { _id, fullName, createdAt } };
        });

        const commentIdArray = sliceComment.map((item) => item._id);

        const findReactionCountToJson = await Promise.allSettled(
            sliceComment.map(async (item) => {
                const likedCount = await LikedCommentModal.find({
                    commentId: item._id,
                }).count();

                const dislikeCount = await DislikeCommentModal.find({
                    commentId: item._id,
                }).count();
                return { _id: item._id, likedCount, dislikeCount };
            })
        );

        const userReaction = async (userId) => {
            if (!userId) {
                return { like: [], dislike: [] };
            }
            const like = await LikedCommentModal.find({
                userId,
                commentId: { $in: commentIdArray },
            });

            const dislike = await DislikeCommentModal.find({
                userId,
                commentId: { $in: commentIdArray },
            });
            return { like, dislike };
        };
        const { like, dislike } = await userReaction(userId);

        const enrichmentOfComment = sliceComment.map((comment) => {
            const isLiked = like.filter(
                (item) => item.commentId.toString() === comment._id.toString()
            );
            const IsDisliked = dislike.filter(
                (item) => item.commentId.toString() === comment._id.toString()
            );
            const commentReaction = findReactionCountToJson.filter(
                (item) => item.value._id.toString() === comment._id.toString()
            );

            return {
                ...comment,
                likedCount: commentReaction[0].value.likedCount,
                dislikeCount: commentReaction[0].value.dislikeCount,
                isLiked: isLiked.length > 0,
                IsDisliked: IsDisliked.length > 0,
            };
        });

        return res.status(200).json(enrichmentOfComment);
    } catch (err) {
        console.log("[GET_COMMENT]", err);
        res.status(500).json({ message: "server error" });
    }
};

export const lastComment = async (req, res) => {
    try {
        const limit = req.query.limit ? bodyStrReplace(req.query.limit) : 2;
        const comment = await CommentModal.find()
            .populate("userId")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const responseComment = comment.map((item) => {
            const { _id, fullName, createdAt } = item.userId;
            const { userId, ...other } = item._doc;
            return { ...other, user: { _id, fullName, createdAt } };
        });

        res.json(responseComment);
    } catch (err) {
        console.log("[LAST_COMMENT]", err);
        res.status(500).json({ message: "server error" });
    }
};

export const removeComment = async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ message: "comment id not found" });
        }

        const id = bodyStrReplace(req.params.id);

        await CommentModal.deleteOne({ _id: id });
        await LikedCommentModal.deleteMany({ commentId: id });
        await DislikeCommentModal.deleteMany({ commentId: id });

        res.json({ message: `remove comment ${id} success` });
    } catch (err) {
        console.log("[REMOVE_COMMENT]", err);
        return res.status(500).json({ message: "server error" });
    }
};

export const like = async (req, res) => {
    try {
        const commentId = bodyStrReplace(req.body.commentId);
        const userId = bodyStrReplace(req.body.userId);

        if (!commentId || !userId) {
            return res
                .status(403)
                .json({ message: "commentId or userId not found" });
        }

        const findLike = await LikedCommentModal.find({
            commentId,
            userId,
        }).count();

        if (findLike > 0) {
            return res.status(400).json({
                message:
                    "user has already liked the comment, use removeLike method",
            });
        }

        await DislikeCommentModal.findOneAndDelete({ commentId, userId });

        const doc = new LikedCommentModal({ commentId, userId });
        await doc.save();
        res.json(doc);
    } catch (err) {
        console.log("[LIKE_COMMENT]", err);
        return res.status(500).json({ message: "server error" });
    }
};

export const removeLike = async (req, res) => {
    try {
        const commentId = bodyStrReplace(req.body.commentId);
        const userId = bodyStrReplace(req.body.userId);
        if (!commentId || !userId) {
            return res
                .status(403)
                .json({ message: "commentId or userId not found" });
        }
        const findLike = await LikedCommentModal.find({
            commentId,
            userId,
        }).count();

        if (findLike === 0) {
            return res.status(400).json({
                message: "user didn't like the comment, use like method",
            });
        }

        await LikedCommentModal.deleteOne({ userId, commentId });
        res.json({ message: `comment ${commentId} remove like` });
    } catch (err) {
        console.log("[REMOVE_LIKE_COMMENT]", err);
        return res.status(500).json({ message: "server error" });
    }
};

export const dislike = async (req, res) => {
    try {
        const commentId = bodyStrReplace(req.body.commentId);
        const userId = bodyStrReplace(req.body.userId);
        if (!commentId || !userId) {
            return res
                .status(403)
                .json({ message: "commentId or userId not found" });
        }

        const findDislike = await DislikeCommentModal.find({
            commentId,
            userId,
        }).count();

        if (findDislike > 0) {
            return res.status(400).json({
                message:
                    "user has already dislike the comment, use removeDislike method",
            });
        }

        await LikedCommentModal.findOneAndDelete({
            commentId,
            userId,
        });

        const doc = new DislikeCommentModal({
            commentId,
            userId,
        });
        await doc.save();
        res.json(doc);
    } catch (err) {
        console.log("[DISLIKE_COMMENT]", err);
        return res.status(500).json({ message: "server error" });
    }
};

export const removeDislike = async (req, res) => {
    try {
        const commentId = bodyStrReplace(req.body.commentId);
        const userId = bodyStrReplace(req.body.userId);
        if (!commentId || !userId) {
            return res
                .status(403)
                .json({ message: "commentId or userId not found" });
        }
        const findDislike = await DislikeCommentModal.find({
            commentId,
            userId,
        }).count();

        if (findDislike === 0) {
            return res.status(400).json({
                message: "user didn't dislike the comment, use like method",
            });
        }

        await DislikeCommentModal.deleteOne({ userId, commentId });
        res.json({ message: `comment ${commentId} remove like` });
    } catch (err) {
        console.log("[REMOVE_LIKE_COMMENT]", err);
        return res.status(500).json({ message: "server error" });
    }
};

export const editComment = async (req, res) => {
    try {
        const id = bodyStrReplace(req.body.id);
        const text = bodyStrReplace(req.body.text);
        if (!id || !text) {
            return res
                .status(400)
                .json({ message: "comment id or text not found" });
        }

        await CommentModal.updateOne(
            {
                _id: id,
            },
            { text }
        );

        res.json({ message: true });
    } catch (err) {
        console.log("[EDIT_COMMENT]", err);
        return res.status(500).json({ message: "server error" });
    }
};
