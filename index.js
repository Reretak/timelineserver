import express from 'express'
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.json([{ id: 0, user: 'mister cato' , message: 'glass'},
    { id: 1, user: 'mister dogo' , message: 'dirt'},
    { id: 2, user: 'mister thrumbo' , message: 'perish'},
    { id: 3, user: 'mister worm' , message: 'blub blub blub'},
    { id: 4, user: 'mister ant' , message: 'woe unto me!'}]);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
