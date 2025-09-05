// Graph manipulation and visualization logic
class Graph {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.nodeIdCounter = 0;
        this.edgeIdCounter = 0;
        this.selectedNode = null;
        this.mode = 'addNode'; // 'addNode', 'addEdge', 'delete'
        this.isDirected = false; // false for undirected, true for directed
    }

    addNode(x, y) {
        // Ensure node stays within canvas boundaries
        const canvas = document.getElementById('graphCanvas');
        const margin = 25; // Keep nodes away from edges
        const boundedX = Math.max(margin, Math.min(x, canvas.width - margin));
        const boundedY = Math.max(margin, Math.min(y, canvas.height - margin));
        
        const node = {
            id: this.nodeIdCounter++,
            x: boundedX,
            y: boundedY,
            radius: 20,
            label: this.nodeIdCounter,
            isDragging: false,
            isIsolated: true // Will be updated when edges are added
        };
        this.nodes.push(node);
        this.updateNodeConnectivity();
        this.updateUI();
        return node;
    }

    addEdge(node1, node2) {
        // Check if edge already exists
        let existingEdge;
        if (this.isDirected) {
            // For directed graphs, only check one direction
            existingEdge = this.edges.find(edge => 
                edge.from === node1.id && edge.to === node2.id
            );
        } else {
            // For undirected graphs, check both directions
            existingEdge = this.edges.find(edge => 
                (edge.from === node1.id && edge.to === node2.id) ||
                (edge.from === node2.id && edge.to === node1.id)
            );
        }
        
        if (existingEdge || node1.id === node2.id) {
            return null;
        }

        const edge = {
            id: this.edgeIdCounter++,
            from: node1.id,
            to: node2.id,
            directed: this.isDirected
        };
        this.edges.push(edge);
        this.updateNodeConnectivity();
        this.updateUI();
        return edge;
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter(node => node.id !== nodeId);
        this.edges = this.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
        this.updateNodeConnectivity();
        this.updateUI();
    }

    removeEdge(edgeId) {
        this.edges = this.edges.filter(edge => edge.id !== edgeId);
        this.updateNodeConnectivity();
        this.updateUI();
    }

    clear() {
        this.nodes = [];
        this.edges = [];
        this.nodeIdCounter = 0;
        this.edgeIdCounter = 0;
        this.selectedNode = null;
        this.updateUI();
    }

    getNodeAt(x, y) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            if (distance <= node.radius) {
                return node;
            }
        }
        return null;
    }

    getEdgeAt(x, y) {
        for (const edge of this.edges) {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);
            
            if (!fromNode || !toNode) continue;

            // Calculate distance from point to line segment
            const distance = this.pointToLineDistance(x, y, fromNode.x, fromNode.y, toNode.x, toNode.y);
            if (distance <= 5) { // 5 pixel tolerance
                return edge;
            }
        }
        return null;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    setMode(mode) {
        this.mode = mode;
        this.selectedNode = null;
        // Stop any ongoing drag operations
        this.nodes.forEach(node => node.isDragging = false);
    }

    setDirected(isDirected) {
        this.isDirected = isDirected;
        // Update existing edges to reflect new direction setting
        this.edges.forEach(edge => {
            edge.directed = isDirected;
        });
        this.updateUI();
    }

    // Update node connectivity status
    updateNodeConnectivity() {
        this.nodes.forEach(node => {
            const hasEdges = this.edges.some(edge => 
                edge.from === node.id || edge.to === node.id
            );
            node.isIsolated = !hasEdges;
        });
    }

    // Move node with boundary checking
    moveNode(nodeId, newX, newY) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const canvas = document.getElementById('graphCanvas');
        const margin = 25;
        
        // Ensure node stays within canvas boundaries
        node.x = Math.max(margin, Math.min(newX, canvas.width - margin));
        node.y = Math.max(margin, Math.min(newY, canvas.height - margin));
        
        this.draw();
    }

    // Check if a position is valid for a node
    isValidNodePosition(x, y) {
        const canvas = document.getElementById('graphCanvas');
        const margin = 25;
        return x >= margin && x <= canvas.width - margin && 
               y >= margin && y <= canvas.height - margin;
    }

    // Auto-layout disconnected components
    autoLayoutDisconnectedComponents() {
        if (this.nodes.length === 0) return;

        const components = this.getConnectedComponents();
        const canvas = document.getElementById('graphCanvas');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const spacing = 200;

        components.forEach((component, index) => {
            const componentCenterX = centerX + (index - components.length / 2) * spacing;
            const componentCenterY = centerY;
            const radius = Math.max(80, component.length * 15);

            component.forEach((node, nodeIndex) => {
                const angle = (2 * Math.PI * nodeIndex) / component.length;
                const x = componentCenterX + radius * Math.cos(angle);
                const y = componentCenterY + radius * Math.sin(angle);
                this.moveNode(node.id, x, y);
            });
        });
    }

    // Get connected components using DFS
    getConnectedComponents() {
        const visited = new Set();
        const components = [];

        this.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const component = [];
                this.dfsComponent(node.id, visited, component);
                components.push(component);
            }
        });

        return components;
    }

    // DFS helper for finding connected components
    dfsComponent(nodeId, visited, component) {
        visited.add(nodeId);
        component.push(this.nodes.find(n => n.id === nodeId));

        // Find all connected nodes
        this.edges.forEach(edge => {
            let connectedNodeId = null;
            if (edge.from === nodeId) {
                connectedNodeId = edge.to;
            } else if (edge.to === nodeId) {
                connectedNodeId = edge.from;
            }

            if (connectedNodeId && !visited.has(connectedNodeId)) {
                this.dfsComponent(connectedNodeId, visited, component);
            }
        });
    }

    handleClick(x, y) {
        switch (this.mode) {
            case 'addNode':
                this.addNode(x, y);
                break;
            case 'addEdge':
                const node = this.getNodeAt(x, y);
                if (node) {
                    if (this.selectedNode === null) {
                        this.selectedNode = node;
                    } else if (this.selectedNode.id !== node.id) {
                        this.addEdge(this.selectedNode, node);
                        this.selectedNode = null;
                    }
                }
                break;
            case 'delete':
                const nodeToDelete = this.getNodeAt(x, y);
                if (nodeToDelete) {
                    this.removeNode(nodeToDelete.id);
                } else {
                    const edgeToDelete = this.getEdgeAt(x, y);
                    if (edgeToDelete) {
                        this.removeEdge(edgeToDelete.id);
                    }
                }
                break;
        }
    }

    updateUI() {
        // Update node and edge counts
        document.getElementById('nodeCount').textContent = this.nodes.length;
        document.getElementById('edgeCount').textContent = this.edges.length;
        
        // Redraw the graph
        this.draw();
    }

    draw() {
        const canvas = document.getElementById('graphCanvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw edges
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 2;
        for (const edge of this.edges) {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);
            
            if (fromNode && toNode) {
                ctx.beginPath();
                ctx.moveTo(fromNode.x, fromNode.y);
                ctx.lineTo(toNode.x, toNode.y);
                ctx.stroke();
                
                // Draw arrow for directed edges
                if (this.isDirected) {
                    this.drawArrow(ctx, fromNode.x, fromNode.y, toNode.x, toNode.y);
                }
            }
        }
        
        // Draw nodes
        for (const node of this.nodes) {
            // Node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
            
            if (node === this.selectedNode) {
                ctx.fillStyle = '#3498db';
                ctx.strokeStyle = '#2980b9';
                ctx.lineWidth = 3;
            } else if (node.isIsolated) {
                // Isolated nodes have a different color and dashed border
                ctx.fillStyle = '#95a5a6';
                ctx.strokeStyle = '#7f8c8d';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
            } else {
                ctx.fillStyle = '#2c3e50';
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
            }
            
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash
            
            // Node label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.label.toString(), node.x, node.y);
            
            // Add isolation indicator for isolated nodes
            if (node.isIsolated) {
                ctx.fillStyle = '#7f8c8d';
                ctx.font = 'bold 10px Arial';
                ctx.fillText('●', node.x + node.radius - 5, node.y - node.radius + 5);
            }
        }
    }

    // Get adjacency matrix
    getAdjacencyMatrix() {
        const n = this.nodes.length;
        const matrix = Array(n).fill().map(() => Array(n).fill(0));
        
        for (const edge of this.edges) {
            const fromIndex = this.nodes.findIndex(n => n.id === edge.from);
            const toIndex = this.nodes.findIndex(n => n.id === edge.to);
            
            if (fromIndex !== -1 && toIndex !== -1) {
                matrix[fromIndex][toIndex] = 1;
                if (!this.isDirected) {
                    matrix[toIndex][fromIndex] = 1; // Undirected graph
                }
            }
        }
        
        return matrix;
    }

    // Get degree matrix
    getDegreeMatrix() {
        const n = this.nodes.length;
        const matrix = Array(n).fill().map(() => Array(n).fill(0));
        const adjacency = this.getAdjacencyMatrix();
        
        for (let i = 0; i < n; i++) {
            let degree = 0;
            if (this.isDirected) {
                // For directed graphs, use out-degree
                for (let j = 0; j < n; j++) {
                    degree += adjacency[i][j];
                }
            } else {
                // For undirected graphs, use total degree
                for (let j = 0; j < n; j++) {
                    degree += adjacency[i][j];
                }
            }
            matrix[i][i] = degree;
        }
        
        return matrix;
    }

    // Get Laplacian matrix (L = D - A)
    getLaplacianMatrix() {
        const n = this.nodes.length;
        const adjacency = this.getAdjacencyMatrix();
        const degree = this.getDegreeMatrix();
        const laplacian = Array(n).fill().map(() => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                laplacian[i][j] = degree[i][j] - adjacency[i][j];
            }
        }
        
        return laplacian;
    }

    // Draw arrow for directed edges
    drawArrow(ctx, fromX, fromY, toX, toY) {
        const headLength = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Calculate arrow position (offset from target node)
        const offset = 20; // Node radius
        const arrowX = toX - offset * Math.cos(angle);
        const arrowY = toY - offset * Math.sin(angle);
        
        // Draw arrow head
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - headLength * Math.cos(angle - Math.PI / 6), 
                   arrowY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - headLength * Math.cos(angle + Math.PI / 6), 
                   arrowY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }
}

// Initialize graph instance
const graph = new Graph();
