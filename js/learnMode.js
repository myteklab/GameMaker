// ============================================
// LEARN MODE
// ============================================

function showLearnModal() {
    const modal = document.getElementById('learn-modal');
    modal.classList.add('visible');
    currentLearnPage = 1;
    updateLearnPage();
    initLearnDemo();
}

function closeLearnModal() {
    document.getElementById('learn-modal').classList.remove('visible');
}

function learnNext() {
    if (currentLearnPage < totalLearnPages) {
        currentLearnPage++;
        updateLearnPage();
    } else {
        // On last page, close the modal
        closeLearnModal();
    }
}

function learnPrev() {
    if (currentLearnPage > 1) {
        currentLearnPage--;
        updateLearnPage();
    }
}

function learnGoTo(page) {
    currentLearnPage = page;
    updateLearnPage();
}

function updateLearnPage() {
    // Show/hide pages
    document.querySelectorAll('.learn-page').forEach(page => {
        page.style.display = parseInt(page.dataset.page) === currentLearnPage ? 'block' : 'none';
    });

    // Update dots
    document.querySelectorAll('.learn-nav-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index + 1 === currentLearnPage);
    });

    // Update buttons
    document.getElementById('learn-prev').disabled = currentLearnPage === 1;
    const nextBtn = document.getElementById('learn-next');
    if (currentLearnPage === totalLearnPages) {
        nextBtn.textContent = 'Done ✓';
    } else {
        nextBtn.textContent = 'Next →';
    }

    // Initialize demo if on page 1
    if (currentLearnPage === 1) {
        initLearnDemo();
    }
}

function initLearnDemo() {
    const demoCanvas = document.getElementById('learn-grid-demo');
    if (!demoCanvas) return;

    const ctx = demoCanvas.getContext('2d');
    const cellSize = 40;

    // Reset demo grid (6x6)
    learnDemoGrid = [
        ['.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.']
    ];

    function drawDemoGrid() {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, demoCanvas.width, demoCanvas.height);

        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                const char = learnDemoGrid[y][x];

                // Draw cell background
                if (char === 'G') {
                    ctx.fillStyle = '#4ade80';
                } else if (char === 'B') {
                    ctx.fillStyle = '#c45c3e';
                } else {
                    ctx.fillStyle = '#0d0d1a';
                }
                ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);

                // Draw character
                ctx.fillStyle = char === '.' ? '#333' : '#fff';
                ctx.font = '14px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char, x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
            }
        }

        // Update output
        updateLearnDemoOutput();
    }

    function updateLearnDemoOutput() {
        const output = document.getElementById('learn-grid-output');
        if (!output) return;

        let html = '<span class="comment">// Your level as data:</span><br>';
        html += '<span style="color: #c792ea">const</span> level = [<br>';
        learnDemoGrid.forEach((row, i) => {
            const rowStr = row.join('');
            html += `&nbsp;&nbsp;<span style="color: #c3e88d">"${rowStr}"</span>`;
            if (i < 5) html += ',';
            html += '<br>';
        });
        html += '];';
        output.innerHTML = html;
    }

    // Click handler
    demoCanvas.onclick = function(e) {
        const rect = demoCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / cellSize);
        const y = Math.floor((e.clientY - rect.top) / cellSize);

        if (x >= 0 && x < 6 && y >= 0 && y < 6) {
            // Cycle through: . -> G -> B -> .
            const current = learnDemoGrid[y][x];
            if (current === '.') {
                learnDemoGrid[y][x] = 'G';
            } else if (current === 'G') {
                learnDemoGrid[y][x] = 'B';
            } else {
                learnDemoGrid[y][x] = '.';
            }
            drawDemoGrid();
        }
    };

    drawDemoGrid();
}
