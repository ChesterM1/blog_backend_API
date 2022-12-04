import { body } from "express-validator";

export const registerValidation = [
    body("email", "Невеный Email").isEmail(),
    body("password", "Пароль должен содержать минимум 5 символов").isLength({
        min: 5,
    }),
    body("fullName", "Имя должено содержать минимум 3 символа").isLength({
        min: 3,
    }),
    body("avatarUrl", "Аватар должен быть ссылкой").optional().isURL(),
];

export const loginValidation = [
    body("email", "Невеный Email").isEmail(),
    body("password", "Пароль должен содержать минимум 5 символов").isLength({
        min: 5,
    }),
];

export const postCreateValidation = [
    body("title", "Заголовок минимум 3 символа")
        .isLength({ min: 3 })
        .isString(),
    body("text", "Текс статьи минимум 10 символов")
        .isLength({ min: 5 })
        .isString(),
    body("tags", "Неверный формат тегов (формат #one, #two)")
        .isString()
        .matches(/(^#\S\w*)(,\s#\w*)*?\S$/),
    body("imageUrl", "Неверная ссылка на изображжение").optional().isString(),
];

export const AddCommentValidation = [
    body("userId").isString().notEmpty().withMessage("required field"),
    body("postId").isString().notEmpty().withMessage("required field"),
    body("text", "Minimum 3 chars").isLength({ min: 3 }).isString(),
];
