import LikedCommentModal from "../../models/LikedComment.js";
import DislikeCommentModal from "../../models/DislikeComment.js";

export const userReaction = async (userId, commentIdArray) => {
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
