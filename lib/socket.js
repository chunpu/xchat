
module.exports = function(io, client, app) {

  var roomHash = app.roomHash


  function getUserByName(user, cb) {
    var name = user.name
    client.hget('name2id', name, function(err, id) {
      if (err || id === null) {
        user.anony = true
        cb(null, user)
        return
      }
      client.hgetall('user:'+id, function(err, user) {
        if (err || user === null) {
          cb('null')
          return
        }
        user.id = id
        cb(err, user)
      })
    })
  }

  function updateRoomMember(room) {
    var rooms = io.sockets.manager.rooms
    roomHash[room] = []
    if (room && rooms['/'+room]) {
      // emit to all
      io.sockets.in(room).emit('collect', {})
    } else if (room === undefined) {
      // update all room
      for (var i in roomHash) {
        updateRoomMember(roomHash[i])
      }
    }
  }

  io.sockets.on('connection', function(socket) {

    socket.emit('test', {hello: 'asds'})

    socket.on('disconnect', function() {
      var rooms = io.sockets.manager.roomClients[socket.id]
      for (var key in rooms) {
        if (key) {
          var str = key.substr(1)
          updateRoomMember(str) // we cannot know who leave by socket id
        }
      }
    })

    socket.on('collect', function(data) {
      var room = data.room
      var name = data.name
      roomHash[room].push(name)
    })
   
    socket.on('room', function(data) {
      var room = data.room
      var name = data.name
      socket.join(room)
      // emit to all member
      updateRoomMember(room)
      //console.log(io.sockets.manager.rooms)
      // tell others who is in 

      function changeRoom(user, room) {
        socket.leave(user.room) // leave socket
        updateRoomMember(user.room)
        client.srem('room:'+user.room+':users', user.name, function(err, data) {
        }) // fuck away
        client.sadd('room:'+room+':users', user.name, client.p) // add, don't need
        client.hset('user:'+user.id, 'room', room, client.p) // change user
      }
      
      getUserByName(data, function(err, user) {
        if (user.anony) {
          return
        }
        if (user.room !== room) {
          // change room
          changeRoom(user, room)
        }
      })

      io.sockets.in(room).emit('members', {
        type: 'join',
        who: name
      })

      if (name && room) {
        client.sadd('room:'+room+':users', name)
      } else {
        console.log('ERROR!!!', data)
      }
      client.lrange('room:'+room+':timeline', 0, 9, function(err, list) {
        socket.emit('timeline', list)
      })
    })

    socket.on('members', function(room) {
      client.smembers('room:'+room+':users', function(err, members) {
        socket.emit('members', members)
      })
    })

    socket.on('post', function(data) {
      // redis: add to room timeline list
      var name = data.name
      // get room by name
      client.hget('name2id', name, function(err, id) {
        client.hgetall('user:'+id, function(err, user) {
          var output = name + '|' + (+new Date()) + '|' + data.text
          client.rpush('room:'+user.room+':timeline', output)
          io.sockets.in(user.room).emit('timeline', output)
        })
      })
    })

  })

  io.sockets.on('hi', function(data) {
  })


}
