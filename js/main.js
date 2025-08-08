$(document).ready(function() {
    const canvas = $('<canvas id="gameCanvas" width="500" height="400"></canvas>').appendTo('#flyarea');
    const ctx = canvas[0].getContext('2d');
    const scoreDisplay = $('#bigscore');
    const leaderboardDisplay = $('#highscore-number');
    const payoutForm = $('#payoutForm');
    const finalScore = $('#finalScore');
    const payoutAmount = $('#payoutAmount');
    const walletAddressInput = $('#walletAddress');
    const captcha = $('#captcha');
    const submitButton = $('#submitButton');
    const payoutMessage = $('#payoutMessage');
    const replayButton = $('#replay');
    const volumeSlider = $('#volume');
    const volumeValue = $('#volume-value');

    let score = 0;
    let gameActive = false;
    let gameStarted = false;
    let paused = false;
    let startAnimation = 0;
    let bird = { x: 100, y: 200, size: 40, velocity: 0 };
    let pipes = [];
    let frameCount = 0;
    let animationFrame;
    let gameOverAnimation = 0;
    let payoutSubmitted = false;
    let bgX = 0;
    let assetsLoaded = 0;
    const GRAVITY = 0.15;
    const JUMP = -6;
    const PIPE_WIDTH = 50;
    const PIPE_GAP = 220;
    const PIPE_SPEED = 1.5;
    const PAYOUT_RATE = 1;
    const BG_SPEED = 0.5;
    const BG_WIDTH = 711; // 1920 * 400 / 1080

    const logo = new Image();
    logo.src = '/assets/logo.png';
    const background = new Image();
    background.src = '/assets/background.jpg';
    logo.onerror = background.onerror = () => {
        console.error('Asset load failed');
        assetsLoaded++;
        if (assetsLoaded === 2) drawStartScreen();
    };
    logo.onload = background.onload = () => {
        assetsLoaded++;
        if (assetsLoaded === 2) drawStartScreen();
    };

    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    function updateLeaderboard() {
        leaderboard.push(score);
        leaderboard.sort((a, b) => b - a);
        leaderboard = leaderboard.slice(0, 5);
        localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
        document.cookie = `highscore=${leaderboard[0] || 0};path=/`;
        leaderboardDisplay.text(highscore);
        $('#payout').text(`Highscore: ${leaderboard[0] || 0}`);
    }

    function drawBackground() {
        if (background.complete && background.naturalWidth !== 0) {
            ctx.drawImage(background, bgX, 0, BG_WIDTH, canvas.height);
            ctx.drawImage(background, bgX + BG_WIDTH, 0, BG_WIDTH, canvas.height);
        } else {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (gameActive && !paused) {
            bgX -= BG_SPEED;
            if (bgX <= -BG_WIDTH) bgX += BG_WIDTH;
        }
    }

    function drawBird(x, y, scale = 1) {
        if (logo.complete && logo.naturalWidth !== 0) {
            ctx.save();
            ctx.translate(x + bird.size / 2, y + bird.size / 2);
            ctx.rotate(bird.velocity * 0.05);
            ctx.drawImage(logo, -bird.size / 2 * scale, -bird.size / 2 * scale, bird.size * scale, bird.size * scale);
            ctx.restore();
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(x, y, bird.size * scale, bird.size * scale);
        }
    }

    function drawPipes() {
        pipes.forEach(pipe => {
            const yOffset = Math.sin((frameCount + pipe.x) * 0.05) * 10;
            const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
            gradient.addColorStop(0, '#1e40af');
            gradient.addColorStop(1, '#60a5fa');
            ctx.fillStyle = gradient;
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top + yOffset);
            ctx.fillRect(pipe.x, pipe.top + PIPE_GAP + yOffset, PIPE_WIDTH, canvas.height - pipe.top - PIPE_GAP);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(pipe.x + 5, 0, 10, pipe.top + yOffset);
            ctx.fillRect(pipe.x + 5, pipe.top + PIPE_GAP + yOffset, 10, canvas.height - pipe.top - PIPE_GAP);
        });
    }

    function drawStartScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawBird(bird.x, bird.y, 1 + 0.1 * Math.sin(startAnimation * 0.1));
        ctx.font = '40px Caveat';
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(startAnimation / 60, 1)})`;
        ctx.textAlign = 'center';
        ctx.fillText('Flappy PEPE!', canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillText('Click to start', canvas.width / 2, canvas.height / 2 + 40);
        startAnimation++;
        if (!gameStarted) requestAnimationFrame(drawStartScreen);
    }

    function drawGameOver() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawBird(bird.x, bird.y + Math.sin(gameOverAnimation * 0.2) * 10, 1);
        ctx.font = '40px Caveat';
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(gameOverAnimation / 60, 1)})`;
        ctx.textAlign = 'center';
        ctx.fillText(`Game Over! Score: ${score}`, canvas.width / 2, canvas.height / 2 - 20);
        $('#scoreboard').show();
        $('#score-number').text(score);
        payoutForm.show();
        finalScore.text(score);
        payoutAmount.text((score * PAYOUT_RATE).toFixed(2));
        gameOverAnimation++;
        if (!gameStarted) requestAnimationFrame(drawGameOver);
    }

    async function submitPayout() {
        if (payoutSubmitted) {
            payoutMessage.text('Payout already submitted!');
            return;
        }
        const address = walletAddressInput.val().trim();
        if (!captcha.is(':checked')) {
            payoutMessage.text('Please check the CAPTCHA!');
            return;
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            payoutMessage.text('Invalid wallet address!');
            return;
        }
        payoutSubmitted = true;
        submitButton.prop('disabled', true);
        payoutMessage.text('Submitting payout request...');
        const payoutData = {
            address,
            score,
            payout: score * PAYOUT_RATE,
            currency: 'PEPE',
            timestamp: new Date().toISOString()
        };
        try {
            const response = await fetch('/api/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payoutData)
            });
            const data = await response.json();
            if (response.ok) {
                payoutMessage.text(data.message);
            } else {
                payoutMessage.text(`Error: ${data.message}`);
                payoutSubmitted = false;
                submitButton.prop('disabled', false);
            }
        } catch (error) {
            console.error('Payout error:', error);
            payoutMessage.text('Network error. Try again.');
            payoutSubmitted = false;
            submitButton.prop('disabled', false);
        }
    }

    function spawnPipe() {
        const gapY = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
        pipes.push({ x: canvas.width, top: gapY, scored: false });
    }

    function updatePipes() {
        pipes.forEach(pipe => {
            pipe.x -= PIPE_SPEED;
            if (pipe.x + PIPE_WIDTH < bird.x && !pipe.scored) {
                score++;
                scoreDisplay.text(score);
                $('#score-number').text(score);
                pipe.scored = true;
            }
        });
        pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);
    }

    function checkCollision() {
        if (bird.y < 0 || bird.y + bird.size > canvas.height) return true;
        for (let pipe of pipes) {
            const yOffset = Math.sin((frameCount + pipe.x) * 0.05) * 10;
            if (
                bird.x + bird.size > pipe.x &&
                bird.x < pipe.x + PIPE_WIDTH &&
                (bird.y < pipe.top + yOffset || bird.y + bird.size > pipe.top + PIPE_GAP + yOffset)
            ) return true;
        }
        return false;
    }

    function updateGame() {
        if (!gameActive || paused) {
            if (paused) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawBackground();
                drawPipes();
                drawBird(bird.x, bird.y);
                ctx.font = '40px Caveat';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.textAlign = 'center';
                ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
            }
            return;
        }
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;
        frameCount++;
        if (frameCount % 150 === 0) spawnPipe();
        updatePipes();
        if (checkCollision()) endGame();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPipes();
        drawBird(bird.x, bird.y);
        animationFrame = requestAnimationFrame(updateGame);
    }

    function startGame() {
        if (!gameStarted) {
            gameStarted = true;
            gameActive = true;
            paused = false;
            score = 0;
            bird = { x: 100, y: 200, size: 40, velocity: 0 };
            pipes = [];
            frameCount = 0;
            startAnimation = 0;
            gameOverAnimation = 0;
            payoutSubmitted = false;
            payoutForm.hide();
            walletAddressInput.val('');
            captcha.prop('checked', false);
            submitButton.prop('disabled', false);
            payoutMessage.text('');
            scoreDisplay.text(score);
            $('#score-number').text(score);
            $('#scoreboard').hide();
            animationFrame = requestAnimationFrame(updateGame);
        }
    }

    function endGame() {
        gameActive = false;
        gameStarted = false;
        paused = false;
        cancelAnimationFrame(animationFrame);
        updateLeaderboard();
        drawGameOver();
    }

    function togglePause() {
        if (!gameActive) return;
        paused = !paused;
        if (!paused) animationFrame = requestAnimationFrame(updateGame);
    }

    canvas.on('click', () => {
        if (!gameStarted && !gameActive) startGame();
        else if (!gameActive) startGame();
        else if (!paused) bird.velocity = JUMP;
    });

    canvas.on('touchstart', (e) => {
        e.preventDefault();
        if (!gameStarted && !gameActive) startGame();
        else if (!gameActive) startGame();
        else if (!paused) bird.velocity = JUMP;
    });

    replayButton.on('click', startGame);
    $(document).on('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P') togglePause();
    });

    volumeSlider.on('input', function() {
        const volume = $(this).val();
        volumeValue.text(volume);
        // Adjust game audio volume here if using buzz.js
    });

    submitButton.on('click', submitPayout);
});