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

        document.getElementById('autoLayoutBtn').addEventListener('click', () => {
            graph.autoLayoutDisconnectedComponents();
        });

        // Graph type toggle
        document.getElementById('graphType').addEventListener('change', (e) => {
            graph.setDirected(e.target.value === 'directed');
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
            'addEdge': document.getElementById('addEdgeBtn')
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

        // Sort eigenvalues in descending order
        const sortedEigenvalues = [...eigenvalues].sort((a, b) => b - a);
        
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

        // Add some analysis
        html += this.analyzeEigenvalues(sortedEigenvalues);
        
        container.innerHTML = html;
    }

    getEigenvalueColor(eigenvalue) {
        if (eigenvalue < 0) return '#ff6b6b'; // Red for negative
        if (eigenvalue < 0.1) return '#4facfe'; // Blue for near zero
        if (eigenvalue < 1) return '#f093fb'; // Purple for small positive
        return '#667eea'; // Default blue for larger values
    }

    analyzeEigenvalues(eigenvalues) {
        if (eigenvalues.length === 0) return '';
        
        let analysis = '<div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">';
        analysis += '<h5>Analysis:</h5>';
        
        // Check for zero eigenvalues (connected components)
        const zeroEigenvalues = eigenvalues.filter(λ => Math.abs(λ) < 0.001).length;
        if (zeroEigenvalues > 0) {
            analysis += `<p>• ${zeroEigenvalues} zero eigenvalue(s) - indicates ${zeroEigenvalues} connected component(s)</p>`;
        }
        
        // Check for isolated nodes
        const isolatedNodes = graph.nodes.filter(node => node.isIsolated).length;
        if (isolatedNodes > 0) {
            analysis += `<p>• ${isolatedNodes} isolated node(s) - nodes with no connections (shown in red with dashed border)</p>`;
        }
        
        // Check for negative eigenvalues
        const negativeEigenvalues = eigenvalues.filter(λ => λ < -0.001).length;
        if (negativeEigenvalues > 0) {
            analysis += `<p>• ${negativeEigenvalues} negative eigenvalue(s) - check matrix properties</p>`;
        }
        
        // Spectral gap
        if (eigenvalues.length > 1) {
            const spectralGap = eigenvalues[0] - eigenvalues[1];
            analysis += `<p>• Spectral gap: ${spectralGap.toFixed(3)}</p>`;
        }
        
        // Largest eigenvalue
        analysis += `<p>• Largest eigenvalue: ${eigenvalues[0].toFixed(3)}</p>`;
        
        // Graph connectivity info
        const components = graph.getConnectedComponents();
        if (components.length > 1) {
            analysis += `<p>• Graph has ${components.length} disconnected components</p>`;
        } else if (components.length === 1 && graph.nodes.length > 0) {
            analysis += `<p>• Graph is fully connected</p>`;
        }
        
        analysis += '</div>';
        return analysis;
    }

    displayLaplacianMatrix(matrix) {
        const container = document.getElementById('laplacianMatrix');
        
        if (matrix.length === 0) {
            container.innerHTML = '<p>No matrix data available</p>';
            return;
        }

        let html = '<div style="font-family: monospace; font-size: 12px;">';
        html += '<table style="border-collapse: collapse; width: 100%;">';
        
        matrix.forEach((row, i) => {
            html += '<tr>';
            row.forEach((val, j) => {
                const rounded = Math.round(val * 100) / 100;
                const style = `padding: 4px 8px; border: 1px solid #ddd; text-align: center; ${
                    i === j ? 'background-color: #f0f8ff; font-weight: bold;' : ''
                }`;
                html += `<td style="${style}">${rounded}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</table></div>';
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
