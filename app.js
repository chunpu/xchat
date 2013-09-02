var express = require('express')
var app = express()
var http = require('http')
var server = http.createServer(app) // socekt.io need http.server instance
var io = require('socket.io').listen(server)
io.set('log level', 0)
app.roomHash = {}
app.roomArr = []
var redis = require('redis')
var client = redis.createClient()
client.p = redis.print
client.setnx('next_user_id', 10000, redis.print)
client.on('error', function(err) {
  console.log(err)
})

var user = require('./lib/user.js')
var socket = require('./lib/socket.js')


app.set('views', __dirname + '/views') // template
app.engine('html', require('ejs').renderFile) // fuck .ejs
app.use(express.cookieParser())
app.use(express.bodyParser())

socket(io, client, app)
user(app, client) // check isLogin


app.use(express.static('www')) // only html

server.listen(80)
