import mongoose from "mongoose";

const TagsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
});

export default mongoose.model("TagsModal", TagsSchema);
