const BigNumber = require('big-integer');
const { readFileSync } = require('fs');

// Configuration constants
const CONFIG = {
    FIELD_PRIME: BigNumber("208351617316091241234326746312124448251235562226470491514186331217050270460481"),
    VICTORY_MESSAGE: "Israel wins",
    INPUT_FILE: 'input.json'
};

class SecretSharingEngine {
    constructor(prime) {
        this.prime = prime;
        this.rng = this._initializeRandomGenerator();
    }

    _initializeRandomGenerator() {
        return () => BigNumber.randBetween(BigNumber(1), this.prime.subtract(1));
    }

    _computeModInverse(a, m) {
        return BigNumber(a).modInv(m);
    }

    _modularArithmetic(a, b, operation) {
        const ops = {
            'add': (x, y) => x.add(y),
            'multiply': (x, y) => x.multiply(y),
            'subtract': (x, y) => x.subtract(y)
        };
        return ops[operation](BigNumber(a), BigNumber(b)).mod(this.prime);
    }

    generateRandomCoefficient() {
        return this.rng();
    }
}

class SecretReconstructor extends SecretSharingEngine {
    constructor(prime) {
        super(prime);
    }

    reconstructSecret(shareSubset) {
        let reconstructedValue = BigNumber.zero;

        // Lagrange interpolation at x = 0
        shareSubset.forEach((currentShare, i) => {
            const xi = currentShare.coordinate;
            const yi = currentShare.value;
            
            let numerator = BigNumber.one;
            let denominator = BigNumber.one;

            // Calculate Lagrange basis polynomial
            shareSubset.forEach((otherShare, j) => {
                if (i !== j) {
                    const xj = otherShare.coordinate;
                    // For x = 0: (0 - xj) = -xj
                    numerator = numerator.multiply(xj.negate()).mod(this.prime);
                    denominator = denominator.multiply(xi.subtract(xj)).mod(this.prime);
                }
            });

            // Calculate Lagrange coefficient
            const inverseDenom = this._computeModInverse(denominator, this.prime);
            const lagrangeCoeff = numerator.multiply(inverseDenom).mod(this.prime);
            
            // Add contribution to final result
            const contribution = yi.multiply(lagrangeCoeff).mod(this.prime);
            reconstructedValue = reconstructedValue.add(contribution).mod(this.prime);
        });

        return reconstructedValue;
    }

    verifyReconstruction(original, reconstructed) {
        const isValid = original.equals(reconstructed);
        console.log("\n Reconstruction Verification:");
        console.log("-".repeat(40));
        console.log(`Original Secret: ${original.toString()}`);
        console.log(`Reconstructed:   ${reconstructed.toString()}`);
        console.log(`Validation: ${isValid ? 'SUCCESS' : 'FAILED'}`);
        
        if (isValid) {
            console.log(`\n ${CONFIG.VICTORY_MESSAGE} - Secret Successfully Recovered! 🎉`);
        }
        
        return isValid;
    }
}

class FileProcessor {
    static loadConfiguration(filename) {
        try {
            const rawData = readFileSync(filename, 'utf8');
            const parsedData = JSON.parse(rawData);
            
            // Extract n and k from keys object
            const totalShares = parsedData.keys.n;
            const threshold = parsedData.keys.k;
            
            // Process shares and convert from different bases to decimal
            const shares = [];
            
            for (let key in parsedData) {
                if (key !== 'keys') {
                    const x = parseInt(key); // x-coordinate
                    const base = parseInt(parsedData[key].base);
                    const value = parsedData[key].value;
                    
                    // Convert from given base to decimal
                    const y = parseInt(value, base);
                    
                    shares.push({
                        coordinate: BigNumber(x),
                        value: BigNumber(y)
                    });
                    
                    console.log(`Share ${key}: base ${base} value "${value}" = decimal ${y}`);
                }
            }
            
            return {
                totalShares: totalShares,
                threshold: threshold,
                shares: shares
            };
        } catch (error) {
            throw new Error(`Configuration loading failed: ${error.message}`);
        }
    }
}

// Main execution workflow
function executeSecretSharingDemo() {
    try {
        console.log(` ${CONFIG.VICTORY_MESSAGE}! `);
        console.log("=".repeat(50));
        console.log(" Secret Sharing Protocol Initiated");
        console.log("=".repeat(50));
        
        // Load configuration
        const config = FileProcessor.loadConfiguration(CONFIG.INPUT_FILE);
        
        console.log(` Total shares (n): ${config.totalShares}`);
        console.log(` Threshold (k): ${config.threshold}`);
        console.log(` Available shares: ${config.shares.length}`);
        
        // Display all shares
        console.log("\n Loaded Share Distribution:");
        console.log("-".repeat(40));
        config.shares.forEach((share, index) => {
            console.log(`Share ${index + 1}: (${share.coordinate.toString()}, ${share.value.toString()})`);
        });
        
        // Initialize reconstructor
        const reconstructor = new SecretReconstructor(CONFIG.FIELD_PRIME);
        
        // Use all available shares for reconstruction (or first k shares if more available)
        const selectedShares = config.shares.slice(0, config.threshold);
        
        // Demonstrate reconstruction
        console.log("\n Reconstruction Process:");
        console.log("-".repeat(40));
        console.log(`Using ${selectedShares.length} shares for reconstruction...`);
        
        selectedShares.forEach((share, index) => {
            console.log(`  Share ${index + 1}: (${share.coordinate}, ${share.value})`);
        });
        
        const recoveredSecret = reconstructor.reconstructSecret(selectedShares);
        
        console.log(`\n Reconstructed Secret: ${recoveredSecret.toString()}`);
        console.log(`\n ${CONFIG.VICTORY_MESSAGE} - Secret Successfully Recovered! `);
        
    } catch (error) {
        console.error(` Execution failed: ${error.message}`);
    }
}

// Launch the demonstration
executeSecretSharingDemo();