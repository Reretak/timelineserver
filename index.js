import express from 'express'
import cors from 'cors';
import session from 'express-session'
import bcrypt from 'bcrypt'
import Database from 'better-sqlite3';
import DatabasesessionFactory from 'better-sqlite3-session-store';
const  Databasesession = DatabasesessionFactory(session);
import 'dotenv/config';

const app = express()
app.use(express.json()); 
const port = process.env.PORT || 3000
const corsOptions = {
  origin: ['https://reretak.github.io', 'http://localhost:5173'],
  credentials: true, 
};
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));

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

app.use(session({
  store: new Databasesession({
      client: db, 
      expired: {
        clear: true,
        intervalMs: 900000 //ms = 15min
      }
    }),
  resave: false, 
  saveUninitialized: false, 
  secret: process.env.SESSION_SECRET,
  cookie: {
    sameSite: 'lax'
  }
}));
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
    return res.json({ success: true, message: "ACCESS DENIEDDD!!!!" });
  }
}
app.post('/post', restrict, (req,res)=>{
  try {
        const query = db.prepare("INSERT INTO Posts (title,content) VALUES (@title, @content)")
        query.run(req.body);
        return res.json({ success: true, message: "SUKSES!!!! POST!!" });
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.get('/post', (req,res)=>{
   try {
      const posts = db.prepare("SELECT Posts.*, Tags.id as tagId, Tags.name as tagName FROM Posts LEFT JOIN PostsTags ON Posts.id = PostsTags.post_id LEFT JOIN Tags ON PostsTags.tag_id = Tags.id LIMIT 10").all()
      const grouped = posts.reduce((before,current)=>{
        if(!before[current.id])
        {
          before[current.id] = {
            id : current.id,
            title : current.title,
            content : current.content,
            tags : []
          }
        }
        if(current.tagId){
          before[current.id].tags.push(
            {
              tag_id : current.tagId,
              tag_name : current.tagName
            }
          )
        }
        
        return before
      },{})
      return res.json(Object.values(grouped));
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.get('/post/:id', (req,res)=>{
   try {
      const post = db.prepare("SELECT Posts.*, Tags.id as tagId, Tags.name as tagName FROM Posts LEFT JOIN PostsTags ON Posts.id = PostsTags.post_id LEFT JOIN Tags ON PostsTags.tag_id = Tags.id WHERE Posts.id = ?").all(req.params.id);      
      const grouped = post.reduce((before,current)=>{
        if(!before[current.id])
        {
          before[current.id] = {
            id : current.id,
            title : current.title,
            content : current.content,
            tags : []
          }
        }
        if(current.tagId){
          before[current.id].tags.push(
            {
              tag_id : current.tagId,
              tag_name : current.tagName
            }
          )
        }
        
        return before
      },{})
      return res.json(Object.values(grouped));
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.delete('/post/:id',restrict,(req,res)=>{
    try {
      const post = db.prepare("SELECT id FROM Posts WHERE id = ?").get(req.params.id);
      if (!post) {
        console.log("No Post with that ID!!");
        return res.json({ success: false, message: "CANT FIND POST WITH THAT IDDDD!!!!" });
      }
      const isDeletus = db.prepare("DELETE FROM Posts WHERE id = ?").run(req.params.id);
      if (isDeletus.changes > 0) {
        return res.json({ success: true, message: "SUKSES!!!! POST DELETEEE" });
      } else {
        return res.json({ success: false, message: "FAILLLL!!!!" });
      }
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.put('/post/:id',restrict,(req,res)=>{
  try{
    const post = db.prepare("SELECT id FROM Posts WHERE id = ?").get(req.params.id);
    if (!post) {
      console.log("No Post with that ID!!");
      return res.json({ success: false, message: "NO POST WITHTAHT ID!!!!!!!" });
    }
    else{
      const isUpdate = db.prepare("UPDATE Posts SET title = ?, content = ? WHERE id = ?").run(req.body.title, req.body.content,req.params.id);
      if (isUpdate.changes > 0) {
        return res.json({ success: true, message: "SUKSES!!!! POST UPDATE!" });
      } else {
        return res.json({ success: false, message: "FAILLL!!!!" });
      }
    }

  } catch(error){
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})

app.post('/tag', restrict, (req,res)=>{
  try {
        const query = db.prepare("INSERT INTO Tags (name) VALUES (@name)")
        query.run(req.body);
        return res.json({ success: true, message: "SUKSES!!!!" });
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.get('/tag', (req,res)=>{
   try {
      const tags = db.prepare("SELECT * FROM Tags LIMIT 10").all()
      return res.json(tags);
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.get('/tag/:id', (req,res)=>{
   try {
      const tag = db.prepare("SELECT * FROM Tags WHERE id = ?").get(req.params.id);
      return res.json(tag);
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.delete('/tag/:id',restrict,(req,res)=>{
    try {
      const tag = db.prepare("SELECT id FROM Tags WHERE id = ?").get(req.params.id);
      if (!tag) {
        console.log("No Tag with that ID!!");
        return res.json({ success: false, message: "CANT FIND THE TAG WITH THAT IDD!!!" });
      }
      const isDeletus = db.prepare("DELETE FROM Tags WHERE id = ?").run(req.params.id);
      if (isDeletus.changes > 0) {
        return res.json({ success: true, message: "SUKSES!!!! TAG DELETED" });
      } else {
        return res.json({ success: false, message: "FAILLLL!!!!" });
      }
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.put('/tag/:id',restrict,(req,res)=>{
  try{
    const tag = db.prepare("SELECT id FROM Tags WHERE id = ?").get(req.params.id);
    if (!tag) {
      console.log("No Tag with that ID!!");
      return res.json({ success: false, message: "CANT FIND THAT TAG WITH THAT ID WITH THAT IUCHDSUYC GISDUYIED" });
    }
    else{
      const isUpdate = db.prepare("UPDATE Tags SET name = ? WHERE id = ?").run(req.body.name, req.params.id);
      if (isUpdate.changes > 0) {
        return res.json({ success: true, message: "SUKSES!!!!" });
      } else {
        return res.json({ success: false, message: "FAILLL!!!!" });
      }
    }

  } catch(error){
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})

app.post('/post/:id/tag', restrict, (req,res)=>{
  try {
      const query = db.prepare("INSERT INTO PostsTags (post_id, tag_id) VALUES (?,?)")
      const multiquery = db.transaction((tags) => {
        for (const t of tags){
          query.run(req.params.id,t)
        }
      })
      multiquery(req.body.tag_id);
      return res.json({ success: true, message: "SUKSES!!!!" });
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.delete('/post/:id/tag/', restrict, (req,res)=>{
  try {
      const query = db.prepare("DELETE FROM PostsTags WHERE post_id = ? AND tag_id = ?")
      const multiquery = db.transaction((tags) => {
        for (const t of tags){
          query.run(req.params.id,t)
        }
      })
      multiquery(req.body.tag_id);
      return res.json({ success: true, message: "SUKSES!!!!" });
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
  }
})
app.post('/login', async (req,res) => {
  try {
      const pw = db.prepare("SELECT password FROM Users WHERE name = ?").get(req.body.name);
      if (!pw) {
        console.log("Wrongusername!");
        return res.json({ success: false, message: "SHOO SHOO!" });
      }
      console.log('authenticating %s:%s', req.body.name, req.body.password);
      const isMatch = await checkPw(req.body.password, pw.password);
      if (isMatch) {
        req.session.regenerate(() => {});
        req.session.user = req.body.name;
        console.log("NICE!")
        return res.json({ success: true, message: "Logged in" });
      } else {
        console.log("WrongPassword!");
        return res.json({ success: false, message: "SHOO SHOO!" });
      }
  } catch (error) {
    console.log(error)
    return res.status(500).json({success: false, message: "BEEP BOOP ERROR!!" });
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
  return res.json({ success: false, message: "How the hell did you get here?" });
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
