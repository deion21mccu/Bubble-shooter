window.onload = function() {
    // Get the canvas and context
    var canvas = document.getElementById("viewport");
    var context = canvas.getContext("2d");
    
    // Timing/second
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;
    
    var initialized = false;
    
    // Level
    var level = {
        x: 4,          
        y: 83,        
        width: 0,      
        height: 0,     
        columns: 15,   
        rows: 14,      
        tilewidth: 40,  
        tileheight: 40, 
        rowheight: 34,  
        radius: 20,    
        tiles: []    
    };

    // Define a tile class
    var Tile = function(x, y, type, shift) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.removed = false;
        this.shift = shift;
        this.velocity = 0;
        this.alpha = 1;
        this.processed = false;
    };
    
    // Player
    var player = {
        x: 0,
        y: 0,
        angle: 0,
        tiletype: 0,
        bubble: {
                    x: 0,
                    y: 0,
                    angle: 0,
                    speed: 1000,
                    dropspeed: 900,
                    tiletype: 0,
                    visible: false
                },
        // ADDED BUBBLE 2
        bubble2: {
                    x: 0,
                    y: 0,
                    angle: 0,
                    speed: 1000,
                    dropspeed: 900,
                    tiletype: 0,
                    visible: false
                },
        nextbubble: {
                        x: 0,
                        y: 0,
                        tiletype: 0
                    }
    };
    
    // Neighbor offset table
    var neighborsoffsets = [[[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row tiles
                            [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]];  // Odd row tiles
    
    // Number of different colors
    var bubblecolors = 7;
    
    // Game states
    var gamestates = { init: 0, ready: 1, shootbubble: 2, removecluster: 3, gameover: 4 };
    var gamestate = gamestates.init;
    
    // Score
    var score = 0;
    
    var turncounter = 0;
    var rowoffset = 0;
    
    // Animation variables
    var animationstate = 0;
    var animationtime = 0;
    
    // Clusters
    var showcluster = false;
    var cluster = [];
    var floatingclusters = [];
    
    // Images
    var images = [];
    var bubbleimage;
    
    // Image loading global variables
    var loadcount = 0;
    var loadtotal = 0;
    var preloaded = false;
    
    // Load images
    function loadImages(imagefiles) {
        // Initialize variables
        loadcount = 0;
        loadtotal = imagefiles.length;
        preloaded = false;
        
        // Load the images
        var loadedimages = [];
        for (var i=0; i<imagefiles.length; i++) {
            // Create the image object
            var image = new Image();
            
            // Add onload event handler
            image.onload = function () {
                loadcount++;
                if (loadcount == loadtotal) {
                    // Done loading
                    preloaded = true;
                }
            };
            
            // Set the source url of the image
            image.src = imagefiles[i];
            
            // Save to the image array
            loadedimages[i] = image;
        }
        
        // Return an array of images
        return loadedimages;
    }
    
    // Initialize the game
    function init() {
        // Load images
        images = loadImages(["bubble-sprites.png"]);
        bubbleimage = images[0];
    
        // Add mouse events
        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mousedown", onMouseDown);
        
        // Initialize the two-dimensional tile array
        for (var i=0; i<level.columns; i++) {
            level.tiles[i] = [];
            for (var j=0; j<level.rows; j++) {
                // Define a tile type and a shift parameter for animation
                level.tiles[i][j] = new Tile(i, j, 0, 0);
            }
        }
        
        level.width = level.columns * level.tilewidth + level.tilewidth/2;
        level.height = (level.rows-1) * level.rowheight + level.tileheight;
        
        // Init the player
        player.x = level.x + level.width/2 - level.tilewidth/2;
        player.y = level.y + level.height;
        player.angle = 90;
        player.tiletype = 0;
        
        player.nextbubble.x = player.x - 2 * level.tilewidth;
        player.nextbubble.y = player.y;
        
        // New game
        newGame();
        
        // Enter main loop
        main(0);
    }
    
    // Main loop
    function main(tframe) {
        // Request animation frames
        window.requestAnimationFrame(main);
    
        if (!initialized) {
            // Preloader
            
            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the frame
            drawFrame();
            
            // Draw a progress bar
            var loadpercentage = loadcount/loadtotal;
            context.strokeStyle = "#ff8080";
            context.lineWidth=3;
            context.strokeRect(18.5, 0.5 + canvas.height - 51, canvas.width-37, 32);
            context.fillStyle = "#ff8080";
            context.fillRect(18.5, 0.5 + canvas.height - 51, loadpercentage*(canvas.width-37), 32);
            
            // Draw the progress text
            var loadtext = "Loaded " + loadcount + "/" + loadtotal + " images";
            context.fillStyle = "#000000";
            context.font = "16px Verdana";
            context.fillText(loadtext, 18, 0.5 + canvas.height - 63);
            
            if (preloaded) {
        _       // Add a delay for demonstration purposes
                setTimeout(function(){initialized = true;}, 1000);
            }
        } else {
            // Update and render the game
            update(tframe);
            render();
        }
    }
    
    // Update the game state
    function update(tframe) {
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;
        
        // Update the fps counter
        updateFps(dt);
        
        if (gamestate == gamestates.ready) {
            // Game is ready for player input
        } else if (gamestate == gamestates.shootbubble) {
            // Bubble is moving
            stateShootBubble(dt);
        } else if (gamestate == gamestates.removecluster) {
            // Remove cluster and drop tiles
            stateRemoveCluster(dt);
        }
    }
    
    function setGameState(newgamestate) {
        gamestate = newgamestate;
        
        animationstate = 0;
        animationtime = 0;
    }
    
    // MODIFIED to dispatch to moveBubble helper
    function stateShootBubble(dt) {
        // Update moving bubbles
        if (player.bubble.visible) {
            moveBubble(player.bubble, dt);
        }
        
        if (player.bubble2.visible) {
            moveBubble(player.bubble2, dt);
        }
    }
    
    // NEW HELPER FUNCTION created from old stateShootBubble logic
    function moveBubble(bubble, dt) {
        // Bubble is moving
        
        // Move the bubble in the direction of the mouse
        bubble.x += dt * bubble.speed * Math.cos(degToRad(bubble.angle));
        bubble.y += dt * bubble.speed * -1*Math.sin(degToRad(bubble.angle));
        
        // Handle left and right collisions with the level
        if (bubble.x <= level.x) {
            // Left edge
            bubble.angle = 180 - bubble.angle;
            bubble.x = level.x;
        } else if (bubble.x + level.tilewidth >= level.x + level.width) {
            // Right edge
            bubble.angle = 180 - bubble.angle;
            bubble.x = level.x + level.width - level.tilewidth;
      _}
 
        // Collisions with the top of the level
        if (bubble.y <= level.y) {
            // Top collision
            bubble.y = level.y;
            snapBubble(bubble); // Pass the specific bubble
            return;
        }
        
        // Collisions with other tiles
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                
                // Skip empty tiles
                if (tile.type < 0) {
                    continue;
                }
                
                // Check for intersections
                var coord = getTileCoordinate(i, j);
                if (circleIntersection(bubble.x + level.tilewidth/2,
                                       bubble.y + level.tileheight/2,
                                       level.radius,
                                       coord.tilex + level.tilewidth/2,
                                       coord.tiley + level.tileheight/2,
                                       level.radius)) {
                                        
                    // Intersection with a level bubble
                    snapBubble(bubble); // Pass the specific bubble
                    return;
                }
            }
        }
    }
    
    // MODIFIED to check both bubbles before changing state
    function stateRemoveCluster(dt) {
        if (animationstate == 0) {
            resetRemoved();
            
            // Mark the tiles as removed
            for (var i=0; i<cluster.length; i++) {
                // Set the removed flag
  _             cluster[i].removed = true;
            }
            
            // Add cluster score
            score += cluster.length * 100;
            
            // Find floating clusters
            floatingclusters = findFloatingClusters();
            
            if (floatingclusters.length > 0) {
                // Setup drop animation
                for (var i=0; i<floatingclusters.length; i++) {
                    for (var j=0; j<floatingclusters[i].length; j++) {
                        var tile = floatingclusters[i][j];
                        tile.shift = 0;
                        tile.shift = 1;
                        tile.velocity = player.bubble.dropspeed;
                        
                        score += 100;
                    }
                }
            }
            
            animationstate = 1;
        }
        
        if (animationstate == 1) {
            // Pop bubbles
            var tilesleft = false;
            for (var i=0; i<cluster.length; i++) {
                var tile = cluster[i];
                
                if (tile.type >= 0) {
                    tilesleft = true;
                    
                    // Alpha animation
                    tile.alpha -= dt * 15;
                    if (tile.alpha < 0) {
                        tile.alpha = 0;
                    }

                    if (tile.alpha == 0) {
                        tile.type = -1;
                        tile.alpha = 1;
                    }
                }                
            }
            
            // Drop bubbles
            for (var i=0; i<floatingclusters.length; i++) {
                for (var j=0; j<floatingclusters[i].length; j++) {
                    var tile = floatingclusters[i][j];
                    
                    if (tile.type >= 0) {
                        tilesleft = true;
                        
                        // Accelerate dropped tiles
              _         tile.velocity += dt * 700;
                        tile.shift += dt * tile.velocity;
                            
                        // Alpha animation
                        tile.alpha -= dt * 8;
                        if (tile.alpha < 0) {
                            tile.alpha = 0;
                        }

                        // Check if the bubbles are past the bottom of the level
                        if (tile.alpha == 0 || (tile.y * level.rowheight + tile.shift > (level.rows - 1) * level.rowheight + level.tileheight)) {
                            tile.type = -1;
                            tile.shift = 0;
                            tile.alpha = 1;
                        }
              _     }

                }
            }
            
            if (!tilesleft) {
                // nextBubble(); // <-- REMOVED from here
                
                // Check for game over
                var tilefound = false
                for (var i=0; i<level.columns; i++) {
                    for (var j=0; j<level.rows; j++) {
                        if (level.tiles[i][j].type != -1) {
                            tilefound = true;
                            break;
                        }
                    }
                }
                
                if (tilefound) {
                    // Only go to ready state if both bubbles have landed
                    if (!player.bubble.visible && !player.bubble2.visible) {
                        setGameState(gamestates.ready);
                    } else {
                        // Bubbles are still in flight, return to shoot state
                        setGameState(gamestates.shootbubble);
                    }
                } else {
                    // No tiles left, game over
                    setGameState(gamestates.gameover);
          _     }
            }
        }
    }
    
    // MODIFIED to accept a bubble argument and check both bubbles
    // Snap bubble to the grid
    function snapBubble(bubble) {
        // Get the grid position
        var centerx = bubble.x + level.tilewidth/2;
        var centery = bubble.y + level.tileheight/2;
        var gridpos = getGridPosition(centerx, centery);

        // Make sure the grid position is valid
        if (gridpos.x < 0) {
            gridpos.x = 0;
        }
            
        if (gridpos.x >= level.columns) {
            gridpos.x = level.columns - 1;
        }

        if (gridpos.y < 0) {
            gridpos.y = 0;
        }
            
        if (gridpos.y >= level.rows) {
            gridpos.y = level.rows - 1;
        }

        // Check if the tile is empty
        var addtile = false;
        if (level.tiles[gridpos.x][gridpos.y].type != -1) {
            // Tile is not empty, shift the new tile downwards
            for (var newrow=gridpos.y+1; newrow<level.rows; newrow++) {
                if (level.tiles[gridpos.x][newrow].type == -1) {
                    gridpos.y = newrow;
                    addtile = true;
                    break;
                }
            }
        } else {
            addtile = true;
        }

        // Add the tile to the grid
        if (addtile) {
            // Hide the player bubble
            bubble.visible = false;
        
            // Set the tile
            level.tiles[gridpos.x][gridpos.y].type = bubble.tiletype;
            
            // Check for game over
            if (checkGameOver()) {
                return;
            }
            
            // Find clusters
            cluster = findCluster(gridpos.x, gridpos.y, true, true, false);
            
            if (cluster.length >= 3) {
                // Remove the cluster
                setGameState(gamestates.removecluster);
content_              return;
            }
        }
        
        // No clusters found, check if game should return to ready
        // Check if *both* bubbles are done
        if (!player.bubble.visible && !player.bubble2.visible) {
            turncounter++;
            if (turncounter >= 5) {
                // Add a row of bubbles
                addBubbles();
                turncounter = 0;
                rowoffset = (rowoffset + 1) % 2;
                
                if (checkGameOver()) {
                    return;
                }
            }

            // nextBubble(); // <-- REMOVED from here
            setGameState(gamestates.ready);
        }
    }
    
    function checkGameOver() {
        // Check for game over
        for (var i=0; i<level.columns; i++) {
            
            if (level.tiles[i][level.rows-1].type != -1) {
                // Game over
                // nextBubble(); // This was in original, but removing to prevent stray bubbles
                setGameState(gamestates.gameover);
                return true;
            }
        }
       _
        return false;
    }
    
    function addBubbles() {
        // Move the rows downwards
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows-1; j++) {
                level.tiles[i][level.rows-1-j].type = level.tiles[i][level.rows-1-j-1].type;
            }
        }
        
        // Add a new row of bubbles at the top
        for (var i=0; i<level.columns; i++) {
            // Add random, existing, colors
            level.tiles[i][0].type = getExistingColor();
        }
    }
    
    // Find the remaining colors
    function findColors() {
        var foundcolors = [];
        var colortable = [];
        for (var i=0; i<bubblecolors; i++) {
            colortable.push(false);
        }
        
        // Check all tiles
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (tile.type >= 0) {
                    if (!colortable[tile.type]) {
                        colortable[tile.type] = true;
                        foundcolors.push(tile.type);
                    }
                }
            }
        }
        
        return foundcolors;
    }
    
   
    function findCluster(tx, ty, matchtype, reset, skipremoved) {
        // Reset the processed flags
        if (reset) {
            resetProcessed();
        }
       
        var targettile = level.tiles[tx][ty];
        
        var toprocess = [targettile];
        targettile.processed = true;
        var foundcluster = [];

        while (toprocess.length > 0) {
            // Pop the last element from the array
            var currenttile = toprocess.pop();
            
            // Skip processed and empty tiles
            if (currenttile.type == -1) {
                continue;
            }
            
            // Skip tiles with the removed flag
            if (skipremoved && currenttile.removed) {
                continue;
            }
            
          
            if (!matchtype || (currenttile.type == targettile.type)) {
                // Add current tile to the cluster
                foundcluster.push(currenttile);
                
                // Get the neighbors of the current tile
                var neighbors = getNeighbors(currenttile);
                
                // Check the type of each neighbor
                for (var i=0; i<neighbors.length; i++) {
                    if (!neighbors[i].processed) {
                _       // Add the neighbor to the toprocess array
                        toprocess.push(neighbors[i]);
  _                     neighbors[i].processed = true;
                    }
                }
            }
        }
        
        // Return the found cluster
        return foundcluster;
    }
    
    // Find floating clusters
    function findFloatingClusters() {
        // Reset the processed flags
        resetProcessed();
        
        var foundclusters = [];
        
        // Check all tiles
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (!tile.processed) {
                    // Find all attached tiles
                    var foundcluster = findCluster(i, j, false, false, true);
                    
                    // There must be a tile in the cluster
                    if (foundcluster.length <= 0) {
                        continue;
                    }
                    
                    // Check if the cluster is floating
                    var floating = true;
                    for (var k=0; k<foundcluster.length; k++) {
                        if (foundcluster[k].y == 0) {
                            // Tile is attached to the roof
logo                         floating = false;
                            break;
                        }
                    }
                    
                    if (floating) {
                        // Found a floating cluster
                        foundclusters.push(foundcluster);
                    }
                }
    _       }
        }
        
        return foundclusters;
    }
    
    // Reset the processed flags
    function resetProcessed() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].processed = false;
            }
        }
    }
    
    // Reset the removed flags
    function resetRemoved() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].removed = false;
            }
        }
    }
    
    // Get the neighbors of the specified tile
    function getNeighbors(tile) {
        var tilerow = (tile.y + rowoffset) % 2; // Even or odd row
        var neighbors = [];
        
       
        var n = neighborsoffsets[tilerow];
        
        // Get the neighbors
        for (var i=0; i<n.length; i++) {
            // Neighbor coordinate
            var nx = tile.x + n[i][0];
            var ny = tile.y + n[i][1];
            
            // Make sure the tile is valid
            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                neighbors.push(level.tiles[nx][ny]);
            }
        }
        
        return neighbors;
    }
    
    function updateFps(dt) {
        if (fpstime > 0.25) {
            // Calculate fps
            fps = Math.round(framecount / fpstime);
            
            // Reset time and framecount
            fpstime = 0;
            framecount = 0;
        }
        
        // Increase time and framecount
content      fpstime += dt;
        framecount++;
    }
    
    // Draw text that is centered
    function drawCenterText(text, x, y, width) {
        var textdim = context.measureText(text);
        context.fillText(text, x + (width-textdim.width)/2, y);
    }
    
    // Render the game
    function render() {
        // Draw the frame around the game
        drawFrame();
        
        var yoffset =  level.tileheight/2;
        
        // Draw level background
        context.fillStyle = "#319F24";
        context.fillRect(level.x - 4, level.y - 4, level.width + 8, level.height + 4 - yoffset);
        
        // Render tiles
        renderTiles();
        
        // Draw level bottom
        context.fillStyle = "#A6341E";
        context.fillRect(level.x - 4, level.y - 4 + level.height + 4 - yoffset, level.width + 8, 2*level.tileheight + 3);
        
        // Draw score
        context.fillStyle = "#ffffff";
        context.font = "18px Verdana";
        var scorex = level.x + level.width - 150;
        var scorey = level.y+level.height + level.tileheight - yoffset - 8;
        drawCenterText("Your Score:", scorex, scorey, 150);
        context.font = "24px Verdana";
        drawCenterText(score, scorex, scorey+30, 150);

        // Render cluster
        if (showcluster) {
            renderCluster(cluster, 255, 128, 128);
            
            for (var i=0; i<floatingclusters.length; i++) {
                var col = Math.floor(100 + 100 * i / floatingclusters.length);
                renderCluster(floatingclusters[i], col, col, col);
            }
content      }
        
        
        // Render player bubble
        renderPlayer();
        
        // Game Over overlay
        if (gamestate == gamestates.gameover) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x - 4, level.y - 4, level.width + 8, level.height + 2 * level.tileheight + 8 - yoffset);
            
            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            drawCenterText("Game Over!", level.x, level.y + level.height / 2 + 10, level.width);
            drawCenterText("Click to start", level.x, level.y + level.height / 2 + 40, level.width);
        }
    }
    
    // Draw a frame around the game
    function drawFrame() {
        // Draw background
        context.fillStyle = "yellow";
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw header
        context.fillStyle = "#840A0A";
        context.fillRect(0, 0, canvas.width, 79);
        
        // Draw title
        context.fillStyle = "#ffffff";
        context.font = "24px Verdana";
ci      context.fillText("Bubble Shooter Game🎱🥎⚾", 10, 37);
        
        // Display fps
        context.fillStyle = "whitesmoke";
        context.font = "12px cursive";
        context.fillText("Fps: " + fps, 13, 57);
    }
    
    // Render tiles
    function renderTiles() {
        // Top to bottom
        for (var j=0; j<level.rows; j++) {
            for (var i=0; i<level.columns; i++) {
                // Get the tile
                var tile = level.tiles[i][j];
            
                
                var shift = tile.shift;
                
               
                var coord = getTileCoordinate(i, j);
                
              
                if (tile.type >= 0) {
                    // Support transparency
                    context.save();
                    context.globalAlpha = tile.alpha;
                    
                    // Draw the tile using the color
                    drawBubble(coord.tilex, coord.tiley + shift, tile.type);
                    
                    context.restore();
A               }
            }
        }
    }
    
    // Render cluster
    function renderCluster(cluster, r, g, b) {
        for (var i=0; i<cluster.length; i++) {
Ci         // Calculate the tile coordinates
            var coord = getTileCoordinate(cluster[i].x, cluster[i].y);
            
            // Draw the tile using the color
            context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
            context.fillRect(coord.tilex+level.tilewidth/4, coord.tiley+level.tileheight/4, level.tilewidth/2, level.tileheight/2);
        }
    }
    
    // MODIFIED to render bubble2
    // Render the player bubble
    function renderPlayer() {
        var centerx = player.x + level.tilewidth/2;
        var centery = player.y + level.tileheight/2;
        
        // Draw player background circle
        context.fillStyle = "skyblue";
        context.beginPath();
        context.arc(centerx, centery, level.radius+12, 0, 2*Math.PI, false);
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "yellow";
        context.stroke();

        // Draw the angle
        context.lineWidth = 2;
        context.strokeStyle = "purple";
        context.beginPath();
        context.moveTo(centerx, centery);
        context.lineTo(centerx + 1.5*level.tilewidth * Math.cos(degToRad(player.angle)), centery - 1.5*level.tileheight * Math.sin(degToRad(player.angle)));
        context.stroke();
        
        // Draw the next bubble
        drawBubble(player.nextbubble.x, player.nextbubble.y, player.nextbubble.tiletype);
        
        // Draw the bubble
        if (player.bubble.visible) {
            drawBubble(player.bubble.x, player.bubble.y, player.bubble.tiletype);
        }
        
        // Draw bubble 2
        if (player.bubble2.visible) {
            drawBubble(player.bubble2.x, player.bubble2.y, player.bubble2.tiletype);
        }
        
    }
    
    // Get the tile coordinate
    function getTileCoordinate(column, row) {
        var tilex = level.x + column * level.tilewidth;
        
        // X offset for odd or even rows
        if ((row + rowoffset) % 2) {
            tilex += level.tilewidth/2;
        }
        
        var tiley = level.y + row * level.rowheight;
        return { tilex: tilex, tiley: tiley };
    }
    
    // Get the closest grid position
    function getGridPosition(x, y) {
        var gridy = Math.floor((y - level.y) / level.rowheight);
        
        // Check for offset
        var xoffset = 0;
        if ((gridy + rowoffset) % 2) {
            xoffset = level.tilewidth / 2;
        }
        var gridx = Math.floor(((x - xoffset) - level.x) / level.tilewidth);
        
        return { x: gridx, y: gridy };
    }

    
    // Draw the bubble
    function drawBubble(x, y, index) {
        if (index < 0 || index >= bubblecolors)
            return;
        
        // Draw the bubble sprite
        context.drawImage(bubbleimage, index * 40, 0, 40, 40, x, y, level.tilewidth,
         level.tileheight);
    }
    
    // Start a new game
    function newGame() {
        // Reset score
        score = 0;
        
        turncounter = 0;
        rowoffset = 0;
        
        // Set the gamestate to ready
        setGameState(gamestates.ready);
        
        // Create the level
        createLevel();

        
        // Get the first bubble
        player.nextbubble.tiletype = getExistingColor();
        nextBubble();
    }
    
    // Create a random level
    function createLevel() {
        // Create a level with random tiles
        for (var j=0; j<level.rows; j++) {
            var randomtile = randRange(0, bubblecolors-1);
            var count = 0;
            for (var i=0; i<level.columns; i++) {
                if (count >= 2) {
                    // Change the random tile
                    var newtile = randRange(0, bubblecolors-1);
                    
                  
                    if (newtile == randomtile) {
                        newtile = (newtile + 1) % bubblecolors;
                    }
                    randomtile = newtile;
                    count = 0;
                }
                count++;
                
                if (j < level.rows/2) {
                    level.tiles[i][j].type = randomtile;
                } else {
                    level.tiles[i][j].type = -1;
          _   }
            }
        }
    }
    
    // Create a random bubble for the player
    function nextBubble() {
        // Set the current bubble
        player.tiletype = player.nextbubble.tiletype;
        // player.bubble.tiletype = player.nextbubble.tiletype; // shootBubble does this
        // player.bubble.x = player.x; // shootBubble does this
        // player.bubble.y = player.y; // shootBubble does this
        // player.bubble.visible = true; // shootBubble does this
        
        // Get a random type from the existing colors
        var nextcolor = getExistingColor();
        
        // Set the next bubble
        player.nextbubble.tiletype = nextcolor;
    }
    
    // Get a random existing color
    function getExistingColor() {
        existingcolors = findColors();
        
        var bubbletype = 0;
        if (existingcolors.length > 0) {
            bubbletype = existingcolors[randRange(0, existingcolors.length-1)];
        }
        
        return bubbletype;
    }
    
    // Get a random int between low and high, inclusive
    function randRange(low, high) {
        return Math.floor(low + Math.random()*(high-low+1));
    }
    
    // MODIFIED to set up both bubbles
    // Shoot the bubble
    function shootBubble() {
        // Shoot bubble 1
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.angle = player.angle - 3; // Offset angle
        player.bubble.tiletype = player.tiletype;
        player.bubble.visible = true;

        // Shoot bubble 2
        player.bubble2.x = player.x;
        player.bubble2.y = player.y;
        player.bubble2.angle = player.angle + 3; // Offset angle
        player.bubble2.tiletype = player.tiletype;
        player.bubble2.visible = true;

        // Set the gamestate
        setGameState(gamestates.shootbubble);
    }
    
    // Check if two circles intersect
    function circleIntersection(x1, y1, r1, x2, y2, r2) {
        // Calculate the distance between the centers
        var dx = x1 - x2;
        var dy = y1 - y2;
        var len = Math.sqrt(dx * dx + dy * dy);
        
        if (len < r1 + r2) {
            // Circles intersect
            return true;
        }
        
        return false;
    }
    
    // Convert radians to degrees
    function radToDeg(angle) {
        return angle * (180 / Math.PI);
    }
    
    // Convert degrees to radians
    function degToRad(angle) {
        return angle * (Math.PI / 180);
    }

    // On mouse movement
    function onMouseMove(e) {
        // Get the mouse position
        var pos = getMousePos(canvas, e);

        // Get the mouse angle
        var mouseangle = radToDeg(Math.atan2((player.y+level.tileheight/2) - pos.y, pos.x - (player.x+level.tilewidth/2)));

    
        if (mouseangle < 0) {
            mouseangle = 180 + (180 + mouseangle);
        }

      
        var lbound = 8;
        var ubound = 172;
A       if (mouseangle > 90 && mouseangle < 270) {
            // Left
            if (mouseangle > ubound) {
                mouseangle = ubound;
            }
        } else {
            // Right
            if (mouseangle < lbound || mouseangle >= 270) {
                mouseangle = lbound;
            }
        }

        // Set the player angle
        player.angle = mouseangle;
    }
    
    // MODIFIED to call nextBubble after shooting
    // On mouse button click
    function onMouseDown(e) {
       
        var pos = getMousePos(canvas, e);
        
        if (gamestate == gamestates.ready) {
            shootBubble();
  t         nextBubble(); // Get the next bubble ready for the next turn
        } else if (gamestate == gamestates.gameover) {
            newGame();
        }
    }
    
    // Get the mouse position
    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width),
            y: Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height)
        };
    }
    
    // Call init to start 
    init();
};
