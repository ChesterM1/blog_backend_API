import bodyStrReplace from "../utils/bodyStrReplace.js";
import CommentModal from "../models/Comment.js";

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
        const postId = bodyStrReplace(req.params.id);
        if (!postId) {
            return res.status(400).json({ message: "enter postId" });
        }
        const comment = await CommentModal.find({ postId })
            .populate("userId")
            .sort({ createdAt: -1 });

        const responseComment = comment.map((item, i) => {
            const { _id, fullName, createdAt } = item.userId;
            return { ...comment[i]._doc, user: { _id, fullName, createdAt } };
        });

        return res.status(200).json(responseComment);
    } catch (err) {
        console.log("[GET_COMMENT]", err);
        res.status(500).json({ message: "server error" });
    }
};
