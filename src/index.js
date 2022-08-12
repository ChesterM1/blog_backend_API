import express from 'express';
import mongoose from "mongoose";
import multer from 'multer';
import { PostController, UserController } from './controllers/index.js';
import {registerValidation, loginValidation, postCreateValidation} from './validation/validation.js';
import {handelsValidationErrors, checkAuth} from './utils/index.js';
import fs from 'fs';

mongoose.connect('mongodb+srv://admin:wwwwww@cluster0.wuld65p.mongodb.net/blog?retryWrites=true&w=majority')
.then(() => console.log('[DataBase] Connect OK'))
.catch(err => console.log('[DataBase] Connect error', err))

const PORT = 4444;
export const SECRET = '10'

const app = express();

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

    res.json({msg: `http://localhost:4444/uploads/${req.file.originalname}`})
});


app.post('/auth/login', loginValidation, handelsValidationErrors, UserController.login);

app.post('/auth/register', registerValidation, handelsValidationErrors, UserController.register);

app.get('/auth/me', checkAuth, UserController.getMe);

app.post('/posts', checkAuth, postCreateValidation, handelsValidationErrors, PostController.createPost); 

app.get('/posts', PostController.getAllPosts);

app.get('/posts/:id', PostController.getOnesPost);

app.delete('/posts/:id', checkAuth, PostController.removePost);

app.patch('/posts/:id', checkAuth, postCreateValidation, handelsValidationErrors, PostController.updatePost);

app.listen(PORT, (err)=> {
    if(err){
       return console.log(err);
    }
    console.log('Server OK');
});