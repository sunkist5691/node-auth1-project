const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const session = require('express-session')

const sessionStore = require('connect-session-knex')(session)

const Users = require('../users/users-model')
const usersRouter = require('../users/users-router')
const server = express()

server.use(helmet())
server.use(express.json())
server.use(cors())

server.use(session({
   name: 'banana',
   secret: 'this should come from process.env',
   cookie: {
      maxAge: 1000 * 10 * 60,
      secure: false,
      httpOnly: true,
   },
   resave: false,
   saveUninitialized: false,
   store: new sessionStore({
      knex: require('../data/connection'),
      tablename: 'sessions',
      sidfieldname: 'sid',
      createTable: true,
      clearInterval: 1000 * 10 * 60,
   })

}))

server.post('/api/register', async (req, res) => {
   try {
      const { username, password } = req.body
      const hash = bcrypt.hashSync(password, 10)
      const user = { username, password: hash }
      const addedUser = await Users.add(user)
      res.json(addedUser)
   } catch (error) {
      res.status(500).json({ message: error.message })
   }
})

server.post('/api/login', async (req, res) => {
   console.log(req.headers)
   try {
      const [user] = await Users.findBy({ username: req.body.username })
      if(user && bcrypt.compareSync(req.body.password, user.password )){
         req.session.user = user
         res.json({ message: `Logged in`, cookie_id: req.headers.cookie})
      }
   } catch(error) {
      res.status(500).json({ message: 'You shall not pass!' })
   }
})

server.get('/api/logout', (req, res) => {
   if(req.session && req.session.user){
      req.session.destroy(error => {
         if(error) res.json({ message: 'You cannot leave' })
         else res.json({ message: 'Good Bye' })
      })
   } else {
      res.json({ message: 'You had no session actually!' })
   }
})

server.use('/api/users', usersRouter)

// 이건 그냥 기본 중 기본 api
server.get('/', (req, res) => {
   res.json({ api: 'up' })
})

module.exports = server