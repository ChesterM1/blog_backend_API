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
        const fileName = Date.now() + file.originalname;
        req.fileName = fileName;
        cb(null, Date.now() + file.originalname);
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

export const removeImg = (imgName) => {
    if (!imgName) {
        return;
    }
    try {
        fs.unlink(`.${imgName}`, (err) => {
            if (err) {
                console.log(`[REMOVE IMG ERROR] ${err}`);
            } else {
                console.log(`[REMOVE IMG COMPILE`);
            }
        });
    } catch (err) {
        console.log(`[REMOVE IMG ERROR] ${err}`);
    }
};
