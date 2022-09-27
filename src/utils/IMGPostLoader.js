import fs from "fs";
import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync("uploads")) {
            fs.mkdirSync("uploads");
        }
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/png"
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

export const upload = multer({ storage, fileFilter });
