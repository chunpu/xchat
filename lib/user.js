var expires = 3 * 24 * 60 * 60 * 1000

module.exports = function(app, client) {

var roomHash = app.roomHash
var roomArr = app.roomArr
var anonycount = 1

app.get('/members/:room', function(req, res) {
  var members = roomHash[req.params.room]
  res.render('members.html', {members: members})
  /*
  client.smembers('room:'+req.params.room+':users', function(err, members) {
    console.log(members)
    res.render('members.html', {members: members})
  })
  */
})

app.get('/room/:room', function(req, res) {
  var token = req.cookies.token
  client.get('token:'+token, function(err, id) {
    if (id) {
      // get!
      client.hgetall('user:'+id, function(err, user) {
        // get user
        // no need to change room here
        user.room = req.params.room
        res.render('index.html', user)
      })
    } else {
      // no token or wrong token
      var user = {
        room: req.params.room,
        name: '匿名用户'+(anonycount++),
        anony: true
      }
      res.render('index.html', user)
    }
  })

})

app.get('/signout', function(req, res) {
  res.clearCookie('token')
  res.render('redirect.html', {url: '/'})
})

app.get('/signup', function(req, res) {
  res.render('signup.html')
})

app.post('/signup', function(req, res) {
  var name = req.body.name
  client.hget('name2id', name, function(err, id) {
    if (err || !id) {
      var passwd = req.body.passwd
      var str = name + (+new Date()) + 'xchat'
      var token = md5(str)
      addUser({
        name: name,
        passwd: md5(passwd),
        expires: expires,
        room: 'default',
        token: token
      })
      // console.log(str, token)
      res.cookie('token', token, {expires: new Date(Date.now() + expires)})
      res.render('redirect.html', {url: '/room/default'}) // why redirect is no use now fuck!
         
    } else {
      // chongfule
      res.render('error.html', {err: '用户名已存在', rooms: roomArr})
      // res.end('error')
    }
  })
})

function addUser(o) {
  client.get('next_user_id', function(err, id) {
    var uid = 'user:' + id
    client.hset(uid, 'name', o.name)
    client.hset(uid, 'passwd', o.passwd)
    client.hset(uid, 'room', o.room)
    client.incr('next_user_id') // next_user_id++
    client.hset('name2id', o.name, id) // add name 2 id
    client.setex('token:'+o.token, o.expires/1000, id) // add token
  })
  //client.hset('user'+)
}

// signin
app.get('/signin', function(req, res) {
  res.render('signin.html')
})

function getUserByName(name, cb) {
  client.hget('name2id', name, function(err, id) {
    client.hgetall('user:'+id, function(err, user) {
      user.id = id
      cb(err, user)
    })
  })
}

app.post('/signin', function(req, res) {
  var name = req.body.name
  var passwd = req.body.passwd
  getUserByName(name, function(err, user) {
    if (user.passwd === md5(passwd)) {
      // check ok
      var str = name + (+new Date()) + 'xchat'
      var token = md5(str)
      res.cookie('token', token, {expires: new Date(Date.now() + expires)})
      client.setex('token:'+token, expires/1000, user.id) // add token
      res.render('redirect.html', {url: '/room/'+user.room}) // why redirect is no use now fuck!
    } else {
      // else what?
      res.render('error.html', {err: '用户名或密码错误', rooms: roomArr})
      res.end('error!')
    }
  })
})

function updateRoomArr() {
  var rooms = Object.keys(roomHash)
  rooms.sort(function(a, b) {
    return roomHash[a].length - roomHash[b].length
  })
  for (var i = 0; i < rooms.length; i++) {
    rooms[i] = [rooms[i], roomHash[rooms[i]].length]
  }
  roomArr = rooms
}

app.get('/', function(req, res) {
  var token = req.cookies.token
  //console.log(token)
  // check token
  // get userinfo
  client.get('token:'+token, function(err, id) {
    if (id) {
      // get!
      client.hgetall('user:'+id, function(err, user) {
        // get user
        res.render('myindex.html', {rooms: roomArr, user: user})
      })
    } else {
      // no token or wrong token
      updateRoomArr()
      res.render('welcome.html', {rooms: roomArr})
    }
  })
  /*
  if (token) {
    var name = 'user1'
    res.render('index.html', {room: 'welcome', name: name})
  } else {
    if (req.path == '/register') {
      res.render('refister.html')
    } else if (req.path == '/login'){
      res.render('login.html')
    }
    res.render('welcome.html', {})
  }
  */
})

}

function md5(str) {
  var crypto = require('crypto')
  var md5sum = crypto.createHash('md5')
  md5sum.update(str)
  str = md5sum.digest('hex')
  return str
}
