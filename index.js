import express from 'express'
import cors from 'cors';
import session from 'express-session'
import bcrypt from 'bcrypt'
import 'dotenv/config';

const app = express()
const port = process.env.PORT || 3000
const saltRounds = 5;
app.use(cors());
app.use(session({
  resave: false, 
  saveUninitialized: false, 
  secret: process.env.SESSION_SECRET
}));
let tempusers = {
  admin : {
    name: 'admin',
  }
}
bcrypt.hash('admin123',saltRounds, function(err,hash){
  if (err) throw err;
  tempusers.admin.hash = hash;
})
function auth(thename,pass,func){
  console.log('authenticating %s:%s', thename, pass);
  if(!tempusers[thename]){return func(null,null)}

  bcrypt.compare(pass,tempusers[thename].hash,
    function(err,success){
      if (err) return func(err)
      if(success){
        return func(null,tempusers[thename])
      }
      else{
        return func(null,null)
      }
    })
}
function restrict(req,res,next){
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/fuckyou')
  }
}
app.get('/login',function(req,res,next){
  //No form yet so use placeholder
  auth('admin','admin123',function(err,user){
    if (err) {return next (err)}
    if(user){
      req.session.regenerate(function(){
          req.session.user = user;
          res.redirect(req.get('Referrer') || '/');
      })
    }
    else{
      res.redirect('/perish')
    }
  })
})
app.get('/', restrict, (req, res) => {
  res.json([{ id: 0, user: 'mister cato' , message: 'glass'},
    { id: 1, user: 'mister dogo' , message: 'dirt'},
    { id: 2, user: 'mister thrumbo' , message: 'perish'},
    { id: 3, user: 'mister worm' , message: 'blub blub blub'},
    { id: 4, user: 'mister ant' , message: 'woe unto me!'}]);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
