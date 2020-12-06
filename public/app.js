$(document).on('ready', () => {
  // used to ensure all HTML is loaded before running the JS
    // creating variables for selecting elements within the DOM to reference within the JS
  const userGrid = $('.grid-user')
  const computerGrid = $('.grid-computer')
  const displayGrid = $('.grid-display')
  const ships = $('.ship')// select everything with class name of ship i.e. parent div of each square
  const destroyer = $('.destroyer-container')// individual ships
  const submarine = $('.submarine-container')
  const cruiser = $('.cruiser-container')
  const battleship = $('.battleship-container')
  const carrier = $('.carrier-container')
  const startButton = $('#start')
  const replayButton = $('#replay-button')
  const rotateButton = $('#rotate')
  const turnDisplay = $('#whose-go')
  const infoDisplay = $('#info')
  const setupButtons = $('#setup-buttons')

   // used to render the grid individual squares 
  const userSquares = []
  const computerSquares = []
  let isHorizontal = true  // rotating the ships
  let isGameOver = false
  let currentPlayer = 'user'

  //grid width
  const width = 10 // TODO get user input

  let playerNum = 0
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false // ensures all ships are placed before playing
  let shotFired = -1

    //creates an array of ship objects
    const shipArray = [
      {
        name: 'destroyer',
        directions: [
          [0, 1], // horizontal ship (x,y axis)
          [0, width] // vertical ship
        ]
      },
      {
        name: 'submarine',
        directions: [
          [0, 1, 2],
          [0, width, width*2]
        ]
      },
      {
        name: 'cruiser',
        directions: [
          [0, 1, 2],
          [0, width, width*2]
        ]
      },
      {
        name: 'battleship',
        directions: [
          [0, 1, 2, 3],
          [0, width, width*2, width*3]
        ]
      },
      {
        name: 'carrier',
        directions: [
          [0, 1, 2, 3, 4],
          [0, width, width*2, width*3, width*4]
        ]
      },
    ]

    createGrid(userGrid, userSquares)
    createGrid(computerGrid, computerSquares)

  // select player mode
    if (gameMode === 'singlePlayer') {
      startSinglePlayer()
    } else {
      startMultiPlayer()
    }

  // multi player mode
  function startMultiPlayer() {

    const socket = io(); // allows the client to connect

    // get player number
    socket.on('player-number', num => {
      if (num === -1) {
        infoDisplay.html("Sorry, server is full");
      } else {
        playerNum = parseInt(num) // player 0
        if (playerNum === 1 ){
          currentPlayer = "enemy"
        }
  
        console.log(playerNum)

        // check if any enemys and get enemy status
        socket.emit('check-players')
      }
    })

    // recieve message to see what player has connnected or disconnected
    socket.on('player-connection', num => {
      console.log(`player ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    }) 

    // enemy ready
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if (ready) {
        playGameMulti(socket)
        setupButtons.css("display", "none")
      }
    })

    // check if any players and their status
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if (p.connected) {
          // update visual status
          playerConnectedOrDisconnected(i)
        }
        if (p.ready) {
          playerReady(i)
          if (i !== playerNum) {
            enemyReady = true
          }
        }
      })
    })

    // timeout
    socket.on('timeout', () => {
      infoDisplay.html('10min limit reached');
    })

    // ready mode
    startButton.on('click', () => {
      if(allShipsPlaced) playGameMulti(socket)
      else infoDisplay.html("Please place all ships");
    })

    // event listeners for shots fired
    computerSquares.forEach(square => {
      square.on('click', () => {
        if (currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.attr("data-id")
          socket.emit('fire', shotFired)
        }        
      })
    })

    // shot fired recieved
    socket.on('fire', id => {
      enemyGo(id)
      const square = userSquares[id]
      var classSquare = square.attr('class') ? square.attr('class').split(/\s+/) : [];
      socket.emit('fire-reply', classSquare) // reply with the class of taken and ship type
      playGameMulti(socket) // changes the user go
    })

    // fire reply recieved
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket) // switch go
    })

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      // set class
      $(`${player} .connected`).toggleClass('active')
      if(parseInt(num) === playerNum) $(player).css("fontWeight", 'bold')
    }
  }

  

  // single player mode
  function startSinglePlayer() {
    generate(shipArray[0])
    generate(shipArray[1])
    generate(shipArray[2])
    generate(shipArray[3])
    generate(shipArray[4])

    startButton.on('click', () => {
      setupButtons.css("display", "none")
      playGameSingle()
    })
  }

  //Create Board using parameters to develop board for user and computer
  function createGrid(grid, squares) {
    // generate 100 squares
    for (let i = 0; i < width*width; i++) {
      const square = $("<div></div>")
      square.attr("data-id", i) // give each square an id
      grid.append(square)// square adding to the div x amount of time of the for loop
      squares.push(square)
    }
  }

  //Randomly locate computer ships
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length) //Randomly locate computer ships
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10

    // picks a random number from the grid i.e. 0-99 if width is 10 
    // - (ship.directions[0].length * direction) checks that if ship rendered vertically isnt placed on any of the bottom squares
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

    // over ships rendering in the same square
    // checks the computerSquares array and passes through the number we begin at, 
    // then loop through the direction and add each square
    // if any of the squares contain the list taken then square is occupied
    const isTaken = current.some(index => computerSquares[randomStart + index].hasClass('taken'))
    
    // (randomStart + index) % width === width - 1) checks that you are on the last square on the right & vice versa
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) 
    // add the class of the ship to the square
    current.forEach(index => computerSquares[randomStart + index].addClass('taken ' + ship.name))

    else generate(ship)
  }

  //Rotate the ships
  function rotate() {
    if (isHorizontal) {
      // using toggle class to change the ships to vertical by using flex-wrap and changing height and width
      // worth refactoring as lot of repetition 
      destroyer.toggleClass('destroyer-container-vertical')
      submarine.toggleClass('submarine-container-vertical')
      cruiser.toggleClass('cruiser-container-vertical')
      battleship.toggleClass('battleship-container-vertical')
      carrier.toggleClass('carrier-container-vertical')
      isHorizontal = false
      // console.log(isHorizontal)
      return
    }
    if (!isHorizontal) {
      destroyer.toggleClass('destroyer-container-vertical')
      submarine.toggleClass('submarine-container-vertical')
      cruiser.toggleClass('cruiser-container-vertical')
      battleship.toggleClass('battleship-container-vertical')
      carrier.toggleClass('carrier-container-vertical')
      isHorizontal = true
      // console.log(isHorizontal)
      return
    }
  }
  rotateButton.on('click', rotate) // invoke rotate function on click

  //move around user ship
  // for each to grab all the ships and invoke the dragStart function
  ships.each(index => $(this).on('dragstart', dragStart))
  // to get each square in the the array using all the drag events
  userSquares.forEach(square => square.on('dragstart', dragStart))
  userSquares.forEach(square => square.on('dragover', dragOver))
  userSquares.forEach(square => square.on('dragenter', dragEnter))
  userSquares.forEach(square => square.on('dragleave', dragLeave))
  userSquares.forEach(square => square.on('drop', dragDrop))
  userSquares.forEach(square => square.on('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

   ships.each(index => $(this).on('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))

  function dragStart(e) {
    draggedShip = $(e.target)
    draggedShipLength = draggedShip.children().length // chcecking to how many nodes the ship has
    // console.log(draggedShip)
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave(e) {
    e.preventDefault()
    // console.log('drag leave')
  }

  function dragDrop(e) {
    let shipNameWithLastId = draggedShip.children().last().attr("id")
    let shipClass = shipNameWithLastId.slice(0, -2)
    // console.log(shipClass)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1)) // gets the ship index from the end of the id
    let shipLastId = lastShipIndex + parseInt($(e.target).attr("data-id"))// parseInt() ensure it is a number
    // console.log(shipLastId)
    const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93] // edges
    const notAllowedVertical = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60]
    
    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    // detsroyer which is 2 the last index is 1 it would then only take the last 10
    let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1)) // gets the last item in the string and convert to number

    // used to idenitfy where the last id(square) of the ship is 
    // to know if the ship is on the left or right (edge) of the grid
    shipLastId = shipLastId - selectedShipIndex
    // example is placing edge ofthe ship in top righ to return 9
    console.log(shipLastId)

    // !newNotAllowedHorizontal.includes(shipLastId) 
    // last ship index is not any of the numbers within the array otherwise cant be placed
    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        // render the ship via class
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt($(e.target).attr("data-id")) - selectedShipIndex + i].addClass('taken horizontal ' + directionClass + ' ' + shipClass)
      }
    //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array
    // This means that sometimes if you drag the ship by its
    //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
    // stops the ship from being split/wrapped around the grid
    } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        // use width to render 10px vertically for each node/square
        userSquares[parseInt($(e.target).attr("data-id")) - selectedShipIndex + width*i].addClass('taken vertical ' +  directionClass + ' ' + shipClass)
      }
    } else return

    // remove it from the display grid
    draggedShip.remove()

    if(displayGrid.find('.ship').length == 0){
      allShipsPlaced = true
    }
  }

  function dragEnd(e) {
    e.preventDefault()
    // console.log('dragend')
  }

  // Game Logic how determine if user wins for multi player
  function playGameMulti(socket) {
    setupButtons.css("display", "none")
    if (isGameOver) return 
    if (!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if (enemyReady) {
      if (currentPlayer === 'user') {
        turnDisplay.html('Your Go');
      }
      if (currentPlayer === 'enemy') {
        turnDisplay.html("Enemy's Go");
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    $(`${player} .ready`).toggleClass('active')
  }

  //Game Logic how determine if user wins for single player
  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      turnDisplay.html('Your Go'); // DOM manipluation
      // clicking the squares
      computerSquares.forEach(square => square.on('click', function(e) {
        shotFired = square.attr("data-id");
        var classSquare = square.attr('class') ? square.attr('class').split(/\s+/) : [];
        revealSquare(classSquare) // pass the square that is clicked to the function
      }))
    }
    if (currentPlayer === 'enemy') {
      turnDisplay.html('Computers Go');
      setTimeout(enemyGo, 1000)
    }
  }

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0


  function revealSquare(classList) {
    const enemySquare = computerGrid.find(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (!enemySquare.hasClass('boom') && currentPlayer === 'user' && !isGameOver) { // prevent double clicking on already selected square
      // if the square that is clicked contains the class add to the count
      if (obj.includes('destroyer')) destroyerCount++
      if (obj.includes('submarine')) submarineCount++
      if (obj.includes('cruiser')) cruiserCount++
      if (obj.includes('battleship')) battleshipCount++
      if (obj.includes('carrier')) carrierCount++
    }
    if (obj.includes('taken')) {
      enemySquare.addClass('boom') // red square class
    } else {
      enemySquare.addClass('miss') // white square class
    }
    checkForWins()
    currentPlayer = 'enemy' // change player once the player has had a go
    if(gameMode === 'singlePlayer') playGameSingle()
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0


  function enemyGo(square) {
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
    if (!userSquares[square].hasClass('boom')) {
      const hit = userSquares[square].hasClass('taken')
      userSquares[square].addClass(hit ? 'boom' : 'miss')
      if (userSquares[square].hasClass('destroyer')) cpuDestroyerCount++
      if (userSquares[square].hasClass('submarine')) cpuSubmarineCount++
      if (userSquares[square].hasClass('cruiser')) cpuCruiserCount++
      if (userSquares[square].hasClass('battleship')) cpuBattleshipCount++
      if (userSquares[square].hasClass('carrier')) cpuCarrierCount++
      checkForWins()
    } else if (gameMode === 'singlePlayer') enemyGo()
    currentPlayer = 'user'
    turnDisplay.html('Your Go');
  }

  function checkForWins() {
    let enemy = 'computer'
    if(gameMode === 'multiPlayer') enemy = 'Enemy'
    if (destroyerCount === 2) {
      infoDisplay.html(`You sunk the ${enemy}'s destroyer`);
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.html(`You sunk the ${enemy}'s submarine`);
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.html(`You sunk the ${enemy}'s cruiser`);
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.html(`You sunk the ${enemy}'s battleship`);
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.html(`You sunk the ${enemy}'s carrier`);
      carrierCount = 10 
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.html(`${enemy} sunk your destroyer`);
      cpuDestroyerCount = 10
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.html(`${enemy} sunk your submarine`);
      cpuSubmarineCount = 10
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.html(`${enemy} sunk your cruiser`);
      cpuCruiserCount = 10
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.html(`${enemy} sunk your battleship`);
      cpuBattleshipCount = 10
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.html(`${enemy} sunk your carrier`);
      cpuCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.html("YOU WIN");
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.html(`${enemy.toUpperCase()} WINS`);
      gameOver()
      replayButton.css("display", "inline")
    replayButton.on('click', () => {
      window.location.href="../index.html"
    })
    }
  }

  function gameOver() {
    replayButton.css("display", "block")
    replayButton.on('click', () => {
      window.location.href="../index.html"
    })
    isGameOver = true
    startButton.off('click', playGameSingle)
  }
})