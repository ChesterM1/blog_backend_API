import TagsModal from "../../models/Tags.js";
import TagsInPost from "../../models/TagsInPost.js";
export const findPostForId = async (tag) => {
    if (!tag) {
        return;
    }
    const tagsId = await TagsModal.find({ name: tag });

    const findPostInTags = await TagsInPost.find({
        tagsId: tagsId[0]._id,
    });
    if (findPostInTags.length < 0) {
        return;
    }
    return findPostInTags?.map((item) => item.postId);
};
