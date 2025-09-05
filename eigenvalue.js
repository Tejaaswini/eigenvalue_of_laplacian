// Eigenvalue computation using numerical methods
class EigenvalueCalculator {
    constructor() {
        this.tolerance = 1e-10;
        this.maxIterations = 1000;
    }

    // Power iteration method for finding the largest eigenvalue
    powerIteration(matrix, maxIterations = 1000) {
        const n = matrix.length;
        let vector = Array(n).fill().map(() => Math.random());
        
        // Normalize initial vector
        let norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        vector = vector.map(val => val / norm);
        
        let eigenvalue = 0;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Multiply matrix by vector
            const newVector = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    newVector[i] += matrix[i][j] * vector[j];
                }
            }
            
            // Calculate eigenvalue (Rayleigh quotient)
            eigenvalue = this.dotProduct(vector, newVector);
            
            // Normalize new vector
            norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
            if (norm < this.tolerance) break;
            
            vector = newVector.map(val => val / norm);
            
            // Check convergence
            if (iter > 0 && Math.abs(eigenvalue - this.previousEigenvalue) < this.tolerance) {
                break;
            }
            this.previousEigenvalue = eigenvalue;
        }
        
        return { eigenvalue, eigenvector: vector };
    }

    // QR decomposition for finding all eigenvalues
    qrDecomposition(matrix) {
        const n = matrix.length;
        let A = matrix.map(row => [...row]); // Copy matrix
        let Q = Array(n).fill().map(() => Array(n).fill(0));
        let R = Array(n).fill().map(() => Array(n).fill(0));
        
        // Initialize Q as identity matrix
        for (let i = 0; i < n; i++) {
            Q[i][i] = 1;
        }
        
        for (let k = 0; k < n; k++) {
            // Calculate Householder vector
            let norm = 0;
            for (let i = k; i < n; i++) {
                norm += A[i][k] * A[i][k];
            }
            norm = Math.sqrt(norm);
            
            if (norm < this.tolerance) continue;
            
            const sign = A[k][k] >= 0 ? 1 : -1;
            const alpha = -sign * norm;
            const v = Array(n).fill(0);
            v[k] = A[k][k] - alpha;
            
            for (let i = k + 1; i < n; i++) {
                v[i] = A[i][k];
            }
            
            // Normalize v
            const vNorm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
            if (vNorm > this.tolerance) {
                for (let i = 0; i < n; i++) {
                    v[i] /= vNorm;
                }
            }
            
            // Apply Householder transformation
            for (let j = k; j < n; j++) {
                let dot = 0;
                for (let i = k; i < n; i++) {
                    dot += v[i] * A[i][j];
                }
                for (let i = k; i < n; i++) {
                    A[i][j] -= 2 * v[i] * dot;
                }
            }
            
            // Update Q
            for (let j = 0; j < n; j++) {
                let dot = 0;
                for (let i = k; i < n; i++) {
                    dot += v[i] * Q[i][j];
                }
                for (let i = k; i < n; i++) {
                    Q[i][j] -= 2 * v[i] * dot;
                }
            }
        }
        
        // Extract R matrix
        for (let i = 0; i < n; i++) {
            for (let j = i; j < n; j++) {
                R[i][j] = A[i][j];
            }
        }
        
        return { Q, R };
    }

    // QR algorithm for finding all eigenvalues
    qrAlgorithm(matrix, maxIterations = 1000) {
        let A = matrix.map(row => [...row]); // Copy matrix
        const n = matrix.length;
        const eigenvalues = [];
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Check for convergence (2x2 blocks on diagonal)
            let converged = true;
            for (let i = 0; i < n - 1; i++) {
                if (Math.abs(A[i + 1][i]) > this.tolerance) {
                    converged = false;
                    break;
                }
            }
            
            if (converged) {
                // Extract eigenvalues from diagonal
                for (let i = 0; i < n; i++) {
                    eigenvalues.push(A[i][i]);
                }
                break;
            }
            
            // Perform QR decomposition
            const { Q, R } = this.qrDecomposition(A);
            
            // Update A = R * Q
            A = this.matrixMultiply(R, Q);
        }
        
        // If no convergence, extract diagonal elements anyway
        if (eigenvalues.length === 0) {
            for (let i = 0; i < n; i++) {
                eigenvalues.push(A[i][i]);
            }
        }
        
        return eigenvalues.sort((a, b) => b - a); // Sort in descending order
    }

    // Simplified eigenvalue calculation for small matrices
    calculateEigenvalues(matrix) {
        const n = matrix.length;
        
        if (n === 0) return [];
        if (n === 1) return [matrix[0][0]];
        
        // For small matrices, use analytical solutions
        if (n === 2) {
            return this.eigenvalues2x2(matrix);
        } else if (n === 3) {
            return this.eigenvalues3x3(matrix);
        }
        
        // For larger matrices, use a more reliable method
        return this.findAllEigenvalues(matrix);
    }

    // Find all eigenvalues using deflation and power iteration
    findAllEigenvalues(matrix) {
        const n = matrix.length;
        const eigenvalues = [];
        
        // For small matrices, use a simpler approach
        if (n <= 4) {
            return this.simpleEigenvalueMethod(matrix);
        }
        
        let A = matrix.map(row => [...row]); // Copy matrix
        
        for (let i = 0; i < n; i++) {
            // Find the largest eigenvalue using power iteration
            const result = this.powerIteration(A, 100);
            const eigenvalue = result.eigenvalue;
            eigenvalues.push(eigenvalue);
            
            // Deflate the matrix by removing the found eigenvalue
            if (i < n - 1) {
                A = this.deflateMatrix(A, eigenvalue, result.eigenvector);
            }
        }
        
        return eigenvalues.sort((a, b) => b - a);
    }

    // Simple eigenvalue method for small matrices
    simpleEigenvalueMethod(matrix) {
        const n = matrix.length;
        const eigenvalues = [];
        
        // Use characteristic polynomial for small matrices
        if (n === 2) {
            return this.eigenvalues2x2(matrix);
        } else if (n === 3) {
            return this.eigenvalues3x3(matrix);
        } else if (n === 4) {
            return this.eigenvalues4x4(matrix);
        }
        
        return [];
    }

    // Eigenvalues for 4x4 matrix using characteristic polynomial
    eigenvalues4x4(matrix) {
        // For 4x4, we'll use a simplified approach
        // Find eigenvalues by solving det(A - λI) = 0
        const eigenvalues = [];
        
        // Use power iteration to find largest eigenvalue
        const result1 = this.powerIteration(matrix, 200);
        eigenvalues.push(result1.eigenvalue);
        
        // Use deflation to find remaining eigenvalues
        let A = this.deflateMatrix(matrix, result1.eigenvalue, result1.eigenvector);
        const result2 = this.powerIteration(A, 200);
        eigenvalues.push(result2.eigenvalue);
        
        A = this.deflateMatrix(A, result2.eigenvalue, result2.eigenvector);
        const result3 = this.powerIteration(A, 200);
        eigenvalues.push(result3.eigenvalue);
        
        A = this.deflateMatrix(A, result3.eigenvalue, result3.eigenvector);
        const result4 = this.powerIteration(A, 200);
        eigenvalues.push(result4.eigenvalue);
        
        return eigenvalues.sort((a, b) => b - a);
    }

    // Deflate matrix by removing one eigenvalue
    deflateMatrix(matrix, eigenvalue, eigenvector) {
        const n = matrix.length;
        const deflated = Array(n).fill().map(() => Array(n).fill(0));
        
        // Create outer product of eigenvector
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                deflated[i][j] = eigenvector[i] * eigenvector[j];
            }
        }
        
        // Subtract eigenvalue * outer product from original matrix
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                deflated[i][j] = matrix[i][j] - eigenvalue * deflated[i][j];
            }
        }
        
        return deflated;
    }

    // Calculate eigenvalues for small matrices (2x2, 3x3)
    smallMatrixEigenvalues(matrix) {
        const n = matrix.length;
        
        if (n === 2) {
            return this.eigenvalues2x2(matrix);
        } else if (n === 3) {
            return this.eigenvalues3x3(matrix);
        }
        
        return [];
    }

    // Eigenvalues for 2x2 matrix
    eigenvalues2x2(matrix) {
        const a = matrix[0][0];
        const b = matrix[0][1];
        const c = matrix[1][0];
        const d = matrix[1][1];
        
        const trace = a + d;
        const det = a * d - b * c;
        
        const discriminant = trace * trace - 4 * det;
        
        if (discriminant < 0) {
            // Complex eigenvalues - return real parts
            const realPart = trace / 2;
            return [realPart, realPart];
        }
        
        const sqrtDisc = Math.sqrt(discriminant);
        const lambda1 = (trace + sqrtDisc) / 2;
        const lambda2 = (trace - sqrtDisc) / 2;
        
        return [lambda1, lambda2].sort((a, b) => b - a);
    }

    // Eigenvalues for 3x3 matrix using characteristic polynomial
    eigenvalues3x3(matrix) {
        const a = matrix[0][0];
        const b = matrix[0][1];
        const c = matrix[0][2];
        const d = matrix[1][0];
        const e = matrix[1][1];
        const f = matrix[1][2];
        const g = matrix[2][0];
        const h = matrix[2][1];
        const i = matrix[2][2];
        
        // Characteristic polynomial: λ³ - trace·λ² + (sum of minors)·λ - det = 0
        const trace = a + e + i;
        const sumOfMinors = (a * e - b * d) + (a * i - c * g) + (e * i - f * h);
        const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
        
        // Use Cardano's formula for cubic equation
        const p = sumOfMinors - trace * trace / 3;
        const q = det - trace * sumOfMinors / 3 + 2 * trace * trace * trace / 27;
        
        const discriminant = (q / 2) * (q / 2) + (p / 3) * (p / 3) * (p / 3);
        
        if (discriminant > 0) {
            // One real root, two complex
            const u = Math.cbrt(-q / 2 + Math.sqrt(discriminant));
            const v = Math.cbrt(-q / 2 - Math.sqrt(discriminant));
            const realRoot = u + v - trace / 3;
            return [realRoot, realRoot, realRoot];
        } else if (discriminant === 0) {
            // Three real roots, two equal
            const u = Math.cbrt(-q / 2);
            const root1 = 2 * u - trace / 3;
            const root2 = -u - trace / 3;
            return [root1, root2, root2].sort((a, b) => b - a);
        } else {
            // Three distinct real roots
            const r = Math.sqrt(-p / 3);
            const theta = Math.acos(-q / (2 * r * r * r));
            const root1 = 2 * r * Math.cos(theta / 3) - trace / 3;
            const root2 = 2 * r * Math.cos((theta + 2 * Math.PI) / 3) - trace / 3;
            const root3 = 2 * r * Math.cos((theta + 4 * Math.PI) / 3) - trace / 3;
            return [root1, root2, root3].sort((a, b) => b - a);
        }
    }

    // Helper function for matrix multiplication
    matrixMultiply(A, B) {
        const rows = A.length;
        const cols = B[0].length;
        const result = Array(rows).fill().map(() => Array(cols).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                for (let k = 0; k < A[0].length; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        
        return result;
    }

    // Helper function for dot product
    dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }

    // Format matrix for display
    formatMatrix(matrix, precision = 3) {
        if (matrix.length === 0) return "Empty matrix";
        
        return matrix.map(row => 
            row.map(val => val.toFixed(precision)).join('\t')
        ).join('\n');
    }

    // Calculate and display eigenvalues for a graph
    calculateGraphEigenvalues(graph) {
        if (graph.nodes.length === 0) {
            return { eigenvalues: [], laplacian: [] };
        }
        
        const laplacian = graph.getLaplacianMatrix();
        console.log('Laplacian matrix:', laplacian);
        
        const eigenvalues = this.calculateEigenvalues(laplacian);
        console.log('Calculated eigenvalues:', eigenvalues);
        
        return { eigenvalues, laplacian };
    }
}

// Initialize eigenvalue calculator
const eigenvalueCalculator = new EigenvalueCalculator();
