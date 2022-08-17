import express from 'express';
import mongoose from "mongoose";
import multer from 'multer';
import { PostController, UserController } from './controllers/index.js';
import {registerValidation, loginValidation, postCreateValidation} from './validation/validation.js';
import {handelsValidationErrors, checkAuth} from './utils/index.js';
import fs from 'fs';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

mongoose.connect(process.env.DB_URL)
.then(() => console.log('[DataBase] Connect OK'))
.catch(err => console.log('[DataBase] Connect error', err))

export const SECRET = process.env.SECRET;

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if(!fs.existsSync('uploads')){
         fs.mkdirSync('uploads');
      }
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  });

const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'image/jpeg'
    ||file.mimetype === 'image/jpg'
    ||file.mimetype === 'image/png'){
      cb(null, true);
    }else{
      cb(null, false)
    }
}

const upload = multer({storage, fileFilter});

app.use('/uploads',checkAuth, upload.single('image'), (req,res)=>{
    
    const file = req.file;
    if(!file){
      return res.status(500).json({msg: 'Ошибка загрузки файла'});
    }

    res.json({msg: `/uploads/${req.file.originalname}`})
});


app.post('/auth/login', loginValidation, handelsValidationErrors, UserController.login);

app.post('/auth/register', registerValidation, handelsValidationErrors, UserController.register);

app.get('/auth/me', checkAuth, UserController.getMe);

app.post('/posts', checkAuth, postCreateValidation, handelsValidationErrors, PostController.createPost); 

app.get('/posts', PostController.getAllPosts);

app.get('/posts/:id', PostController.getOnesPost);

app.delete('/posts/:id', checkAuth, PostController.removePost);

app.patch('/posts/:id', checkAuth, postCreateValidation, handelsValidationErrors, PostController.updatePost);

app.listen(process.env.PORT , (err)=> {
    if(err){
       return console.log(err);
    }
    console.log('Server OK');
});