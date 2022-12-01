import mongoose from "mongoose";

const LikeSchema = new mongoose.Schema({
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
});

export default mongoose.model("LikeInPostModal", LikeSchema);
