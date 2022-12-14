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
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("PostModal", PostSchema);
