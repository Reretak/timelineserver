import express from 'express'
import cors from 'cors';
import session from 'express-session'
import bcrypt from 'bcrypt'
import Database from 'better-sqlite3';
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
let dbplace = 'database.db'
if(process.env.NODE_ENV == 'production'){
  dbplace = '/app/data/database.db'
}
const db = new Database(dbplace); 

db.pragma('foreign_keys = ON');

const initDb = db.transaction(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      name TEXT PRIMARY KEY,
      password TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS Posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS Tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS PostsTags (
      post_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES Tags(id) ON DELETE CASCADE
    )
  `);
});

initDb();

const adminExists = db.prepare('SELECT name FROM Users WHERE name = ?').get('admin');
if (!adminExists) {
  const hashedPassword = '$2a$12$er.h5R8Mzu3P841qp3ObmOVlDxZp50EHaDbcLTtUzzeeDbfIGb6zq';
  db.prepare('INSERT INTO Users (name, password) VALUES (?, ?)').run('admin', hashedPassword);
  console.log('Admin user created.');
} else {
  console.log('Admin user already exists.');
}

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
app.post('/post', (req,res)=>{
  try {
        const query = db.prepare("INSERT INTO Posts (title,content) VALUES (@title, @content)")
        const querymany = db.transaction((data) => {
          for(const obj of req.body.content){
            query.run(obj);
          }
        })
        querymany(req.body.content);
        return res.json("SUKSES")
  } catch (error) {
    console.log(error)
    return res.status(500).json([{ message: "Server error" }]);
  }
})

app.post('/login', async (req,res) => {
  try {
      const pw = db.prepare("SELECT password FROM Users WHERE name = ?").get(req.body.name);
      if (!pw) {
        console.log("Wrongusername!");
        return res.json([{ message: "NUH UH BIG GUY" }]); 
      }
      console.log('authenticating %s:%s', req.body.name, req.body.password);
      const isMatch = await checkPw(req.body.password, pw.password);
      if (isMatch) {
        req.session.regenerate(() => {});
        req.session.user = req.body.name;
        console.log("NICE!")
        return res.redirect(req.get('Referrer') || '/');
      } else {
        console.log("WrongPassword!");
        return res.json([{ message: "NUH UH BIG GUY" }]);
      }
  } catch (error) {
    console.log(error)
    return res.status(500).json([{ message: "Server error" }]);
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
