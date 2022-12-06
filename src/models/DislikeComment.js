import mongoose from "mongoose";

const DislikeCommentSchema = new mongoose.Schema({
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommentModal",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModal",
        required: true,
    },
});

export default mongoose.model("DislikeCommentModal", DislikeCommentSchema);
