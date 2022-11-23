import mongoose from "mongoose";

const TagsInPostSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PostModal",
        required: true,
    },
    tagsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TagsModal",
        required: true,
    },
});

export default mongoose.model("TagsInPost", TagsInPostSchema);
