import express from 'express'
import cors from 'cors';
import session from 'express-session'
import bcrypt from 'bcrypt'
import mysql from 'mysql2'
import 'dotenv/config';

const app = express()
app.use(express.json()); 
const port = process.env.PORT || 3000
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  resave: false, 
  saveUninitialized: false, 
  secret: process.env.SESSION_SECRET,
  cookie: {
    sameSite: 'lax'
  }
}));
const pool = mysql.createPool({
  port: parseInt(process.env.DB_PORT),
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
})

function restrict(req,res,next){
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/404')
  }
}
app.get('/testetstes', restrict, (req, res) => {
  res.json([{ id: 0, user: 'mister cato' , message: 'glass'},
    { id: 1, user: 'mister dogo' , message: 'dirt'},
    { id: 2, user: 'mister thrumbo' , message: 'perish'},
    { id: 3, user: 'mister worm' , message: 'blub blub blub'},
    { id: 4, user: 'mister ant' , message: 'woe unto me!'}]);
})
app.post('/login', async (req,res) => {
  let result = await new Promise((resolve,reject) => {
    pool.query("SELECT password FROM Users WHERE name = ?",[req.body.name],(err,results) =>{
      if (err) {
        console.error("Query Error:", err.message);
        return;
      }
      else{
        resolve(results)
      }
    })
  });
  
  if(result.length == 0){
    console.log("Wrongusername!");
    res.json([{message : "NUH UH BIG GUY"}])
  }
  else{
    console.log('authenticating %s:%s', req.body.name, req.body.password);
      if(await checkPw(req.body.password,result[0].password)){
        req.session.regenerate(()=>{})
        req.session.user = req.body.name;
        res.redirect(req.get('Referrer') || '/');
      }
      else{
        console.log("WrongPassword!");
        res.json([{message : "NUH UH BIG GUY"}])
      }
  }
})

async function checkPw(pw, hashed){
  try{
    const match = await bcrypt.compare(pw,hashed);
    if(match){
      return true
    }
    else{
      return false
    }
  }
  catch(err){
    console.error("CheckPW Err : " + err)
    return false
  }
}
app.get("*splat", (req, res) => {
  res.send("WEE WOO")
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
