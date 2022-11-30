import TagsInPost from "../models/TagsInPost.js";
import TagsModal from "../models/Tags.js";

export const getAllTags = async (req, res) => {
    try {
        const { limit } = req.query;

        const getTagsByPopular = await TagsInPost.aggregate([
            { $group: { _id: "$tagsId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]).limit(parseInt(limit ?? 4));

        const tagsName = await TagsModal.find({
            _id: { $in: getTagsByPopular.map((tag) => tag._id) },
        }).select("name");

        const tags = getTagsByPopular.map((item) => {
            return tagsName.find(
                (tag) => tag._id.toString() === item._id.toString()
            );
        });

        res.json(tags);
    } catch (err) {
        console.log(`[GET_ALL_POST] : ${err}`);
    }
};
