import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        tags: {
            type: Array,
            default: [],
        },
        viewCount: {
            type: Number,
            default: 0,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserModal",
            required: true,
        },
        imageUrl: String || Undefined,
        like: {
            type: Array,
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("PostModal", PostSchema);
