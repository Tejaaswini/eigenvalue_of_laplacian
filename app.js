// Main application logic and event handlers
class GraphApp {
    constructor() {
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.initializeUI();
    }

    setupEventListeners() {
        // Canvas click events
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            graph.handleClick(x, y);
        });

        // Mouse events for dragging
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const node = graph.getNodeAt(x, y);
            
            if (node && graph.mode === 'addNode') {
                node.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const draggingNode = graph.nodes.find(node => node.isDragging);
            if (draggingNode) {
                graph.moveNode(draggingNode.id, x, y);
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            graph.nodes.forEach(node => {
                if (node.isDragging) {
                    node.isDragging = false;
                }
            });
            this.canvas.style.cursor = this.getCursorForMode(graph.mode);
        });

        this.canvas.addEventListener('mouseleave', (e) => {
            graph.nodes.forEach(node => {
                if (node.isDragging) {
                    node.isDragging = false;
                }
            });
        });

        // Mode selection
        const modeRadios = document.querySelectorAll('input[name="mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                graph.setMode(e.target.value);
                this.updateModeUI();
            });
        });

        // Button events
        document.getElementById('addNodeBtn').addEventListener('click', () => {
            graph.setMode('addNode');
            this.updateModeUI();
        });

        document.getElementById('addEdgeBtn').addEventListener('click', () => {
            graph.setMode('addEdge');
            this.updateModeUI();
        });

        document.getElementById('clearGraphBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the entire graph?')) {
                graph.clear();
                this.clearResults();
            }
        });

        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculateEigenvalues();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            graph.setMode('delete');
            this.updateModeUI();
        });

        document.getElementById('autoLayoutBtn').addEventListener('click', () => {
            graph.autoLayoutDisconnectedComponents();
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });


        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'n':
                case 'N':
                    graph.setMode('addNode');
                    this.updateModeUI();
                    break;
                case 'e':
                case 'E':
                    graph.setMode('addEdge');
                    this.updateModeUI();
                    break;
                case 'd':
                case 'D':
                    graph.setMode('delete');
                    this.updateModeUI();
                    break;
                case 'c':
                case 'C':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (confirm('Are you sure you want to clear the entire graph?')) {
                            graph.clear();
                            this.clearResults();
                        }
                    }
                    break;
                case 'Enter':
                    this.calculateEigenvalues();
                    break;
            }
        });
    }

    initializeUI() {
        this.updateModeUI();
        this.updateNodeCounts();
        this.initializeDarkMode();
    }

    updateModeUI() {
        // Update radio buttons
        const modeRadios = document.querySelectorAll('input[name="mode"]');
        modeRadios.forEach(radio => {
            radio.checked = radio.value === graph.mode;
        });

        // Update button states
        const buttons = {
            'addNode': document.getElementById('addNodeBtn'),
            'addEdge': document.getElementById('addEdgeBtn'),
            'delete': document.getElementById('deleteBtn')
        };

        Object.keys(buttons).forEach(mode => {
            if (buttons[mode]) {
                buttons[mode].classList.toggle('active', graph.mode === mode);
            }
        });

        // Update canvas cursor
        this.canvas.style.cursor = this.getCursorForMode(graph.mode);
    }

    updateNodeCounts() {
        document.getElementById('nodeCount').textContent = graph.nodes.length;
        document.getElementById('edgeCount').textContent = graph.edges.length;
    }

    getCursorForMode(mode) {
        const cursors = {
            'addNode': 'crosshair',
            'addEdge': 'pointer',
            'delete': 'not-allowed'
        };
        return cursors[mode] || 'default';
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        const icon = document.querySelector('#darkModeToggle span');
        icon.textContent = isDark ? '☀️' : '🌙';
        
        // Save preference to localStorage
        localStorage.setItem('darkMode', isDark);
        
        // Update graph colors for dark mode
        this.updateGraphColors();
    }

    initializeDarkMode() {
        const savedDarkMode = localStorage.getItem('darkMode');
        // Default to dark mode if no preference is saved
        const isDarkMode = savedDarkMode === null ? true : savedDarkMode === 'true';
        
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            const icon = document.querySelector('#darkModeToggle span');
            icon.textContent = '☀️';
        }
        this.updateGraphColors();
    }

    updateGraphColors() {
        const isDark = document.body.classList.contains('dark-mode');
        // Update graph colors based on dark mode
        // This will be handled by the graph's draw method
    }

    calculateEigenvalues() {
        if (graph.nodes.length === 0) {
            this.showError('Please add at least one node to the graph.');
            return;
        }

        try {
            // Show loading state
            this.showLoading();

            console.log('Starting eigenvalue calculation...');
            console.log('Graph nodes:', graph.nodes.length);
            console.log('Graph edges:', graph.edges.length);

            // Calculate eigenvalues
            const result = eigenvalueCalculator.calculateGraphEigenvalues(graph);
            
            console.log('Calculation result:', result);
            
            if (!result.eigenvalues || result.eigenvalues.length === 0) {
                this.showError('No eigenvalues calculated. Please check your graph structure.');
                return;
            }
            
            // Display results
            this.displayEigenvalues(result.eigenvalues);
            this.displayLaplacianMatrix(result.laplacian);
            
        } catch (error) {
            console.error('Error calculating eigenvalues:', error);
            this.showError(`Error calculating eigenvalues: ${error.message}. Please try again.`);
        }
    }

    displayEigenvalues(eigenvalues) {
        const container = document.getElementById('eigenvalues');
        
        if (eigenvalues.length === 0) {
            container.innerHTML = '<p>No eigenvalues calculated</p>';
            return;
        }

        // Sort eigenvalues in ascending order
        const sortedEigenvalues = [...eigenvalues].sort((a, b) => a - b);
        
        let html = '<h4>Eigenvalues (sorted by magnitude):</h4>';
        
        sortedEigenvalues.forEach((eigenvalue, index) => {
            const rounded = Math.round(eigenvalue * 1000) / 1000;
            const color = this.getEigenvalueColor(eigenvalue);
            html += `
                <div class="eigenvalue-item" style="border-left-color: ${color}">
                    <strong>λ${index + 1}:</strong> ${rounded}
                </div>
            `;
        });

        
        container.innerHTML = html;
    }

    getEigenvalueColor(eigenvalue) {
        if (eigenvalue < 0) return '#ff6b6b'; // Red for negative
        if (eigenvalue < 0.1) return '#4facfe'; // Blue for near zero
        if (eigenvalue < 1) return '#f093fb'; // Purple for small positive
        return '#667eea'; // Default blue for larger values
    }


    displayLaplacianMatrix(matrix) {
        const container = document.getElementById('laplacianMatrix');
        
        if (matrix.length === 0) {
            container.innerHTML = '<p>No matrix data available</p>';
            return;
        }

        let html = '<table>';
        
        matrix.forEach((row, i) => {
            html += '<tr>';
            row.forEach((val, j) => {
                const rounded = Math.round(val * 100) / 100;
                const diagonalClass = i === j ? ' diagonal' : '';
                html += `<td class="${diagonalClass}">${rounded}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</table>';
        container.innerHTML = html;
    }

    showLoading() {
        const container = document.getElementById('eigenvalues');
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="margin-top: 10px;">Calculating eigenvalues...</p></div>';
        
        // Add CSS animation if not already present
        if (!document.getElementById('loadingStyles')) {
            const style = document.createElement('style');
            style.id = 'loadingStyles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showError(message) {
        const container = document.getElementById('eigenvalues');
        container.innerHTML = `<div style="color: #ff6b6b; padding: 15px; background: #ffe6e6; border-radius: 6px; border-left: 4px solid #ff6b6b;">${message}</div>`;
    }

    clearResults() {
        document.getElementById('eigenvalues').innerHTML = '<p>Click "Calculate Eigenvalues" to see results</p>';
        document.getElementById('laplacianMatrix').innerHTML = '<p>No graph data available</p>';
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GraphApp();
    
    // Initial graph drawing
    graph.draw();
    
    // Update UI counts
    graph.updateUI();
});
