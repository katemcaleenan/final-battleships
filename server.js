const express = require('express')
const path = require('path')
// needed to create the server with express which is then passed into socketio
const http = require('http')
const PORT = 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)
const logger = require('logs.js');

// create and set the static folder
app.use(express.static(path.join(__dirname, "public")))

// start server
server.listen(PORT, () => logger.info(`Listening on port ${PORT}`))

// handle socket connection request from web client
const connections = [null, null] // two connections
// socket is the actual client that is connecting
io.on('connection', socket => {
    // console.log('new socket connection')
    // find player number available
    let playerIndex = -1;
    for (const i in connections) {
        if (connections[i] === null) {
            playerIndex = i
            break
        }
    }

    // tell client what player number they are
    socket.emit('player-number', playerIndex)

    logger.info(`Player ${playerIndex} is connected`)

    // ignore if third player
    if (playerIndex === -1) return

    // allow players know when someone connects
    connections[playerIndex] = false // initially not ready

    // broadcast what player has just connected
    socket.broadcast.emit('player-connection', playerIndex)

    // handle disconnection
    socket.on('disconnect', () => {
        logger.warning(`player ${playerIndex} disconnected`)
        connections[playerIndex] = null
        //broadcast disconnection
        socket.broadcast.emit('player-connection', playerIndex)
    })

    // player ready
    socket.on('player-ready', () => {
        // broadcast to the other player the the client is ready
        socket.broadcast.emit('enemy-ready', playerIndex)
        connections[playerIndex] = true
    })

    // check player connections
    socket.on('check-players', () => {
        const players =[]
        for (const i in connections) {
            // check if connection is null (no one connected or ready) else push in their ready status 
            connections[i] === null ? players.push({connected: false, ready: false}) :
            players.push({connected: true, ready: connections[i]})
        }
        // emit back to the socket that asked for it 
        socket.emit('check-players', players)
    })

    // shot fired recieved
    socket.on('fire', id => {
        logger.info(`Shot fired by player ${playerIndex} at square: ${id}`)

        // emit the move to the other player
        socket.broadcast.emit('fire', id)
    })

    // fire reply
    socket.on('fire-reply', square => {
        logger.obj(square)

        // pass reply to other player
        socket.broadcast.emit('fire-reply', square)
    })

    // timeout
    setTimeout(() => {
        connections[playerIndex] = null
        socket.emit('timeout')
        socket.disconnect()
    }, 600000) // 10min limit
})