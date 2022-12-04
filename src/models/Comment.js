import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
    {
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PostModal",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserModal",
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("CommentModal", CommentSchema);
