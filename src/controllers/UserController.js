import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import UserModal from "../models/User.js";
import { SECRET } from "../index.js";

export const register = async (req, res) => {
    try {
        

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(req.body.password, salt);

        const doc = new UserModal({
            email: req.body.email,
            fullName: req.body.fullName,
            avatarUrl: req.body.avatarUrl,
            passwordHash: password,
        });

        const user = await doc.save();

        const token = jwt.sign(
            {
                _id: user._id,
            },
            SECRET,
            {
                expiresIn: "30d",
            }
        );

        const { passwordHash, ...userData } = user._doc;
        res.json({
            success: true,
            user: {
                ...userData,
                token,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            massage: "Не удалось зарегистрироваться",
        });
    }
};

export const login = async (req, res) => {
    try {
        const user = await UserModal.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({
                message: "Неверный логин или пароль",
            });
        }

        const isValidPassword = await bcrypt.compare(
            req.body.password,
            user._doc.passwordHash
        );

        if (!isValidPassword) {
            return res.status(400).json({
                message: "Неверный логин или пароль",
            });
        }

        const token = jwt.sign(
            {
                _id: user._id,
            },
            SECRET,
            {
                expiresIn: "30d",
            }
        );

        const { passwordHash, ...userData } = user._doc;
        res.json({
            success: true,
            user: {
                ...userData,
                token,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Неудалось авторизоватся",
        });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await UserModal.findById(req.userId);

        if (!user) {
            res.status(404).json({
                message: "Пользователь не найден",
            });
        }

        const { passwordHash, ...userData } = user._doc;
        res.status(200).json({
            success: true,
            user: {
                ...userData,
            },
        });
    } catch (err) {
        res.status(404).json("Пользователь не найден");
    }
};
