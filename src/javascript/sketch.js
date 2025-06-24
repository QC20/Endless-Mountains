class EndlessMountains {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrainMeshes = [];
        this.terrainCount = 3;
        this.terrainWidth = 2000;
        this.terrainHeight = 2000;
        this.gridResolution = 128;
        this.scrollSpeed = 1;
        this.mountainHeight = 200;
        this.roughness = 0.8;
        this.time = 0;
        this.noiseOffset = 0;
        
        this.init();
        this.setupControls();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        this.scene.fog = new THREE.Fog(0xffffff, 1000, 4000);

        // Camera setup
        const container = document.getElementById('container');
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.offsetWidth / container.offsetHeight,
            1,
            5000
        );
        this.camera.position.set(0, 400, 800);
        this.camera.lookAt(0, 0, -500);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false 
        });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Create initial terrain segments
        this.createTerrainSegments();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(500, 1000, 300);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 3000;
        directionalLight.shadow.camera.left = -1000;
        directionalLight.shadow.camera.right = 1000;
        directionalLight.shadow.camera.top = 1000;
        directionalLight.shadow.camera.bottom = -1000;
        this.scene.add(directionalLight);

        // Fill light from opposite direction
        const fillLight = new THREE.DirectionalLight(0x8899aa, 0.3);
        fillLight.position.set(-300, 200, -500);
        this.scene.add(fillLight);
    }

    // Enhanced noise function for more realistic terrain
    noise(x, z, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            const n = Math.sin(x * frequency * 0.01 + this.noiseOffset) * 
                     Math.cos(z * frequency * 0.01 + this.noiseOffset * 0.7) +
                     Math.sin((x + z) * frequency * 0.007 + this.noiseOffset * 1.3) * 0.7;
            
            value += n * amplitude;
            maxValue += amplitude;
            amplitude *= this.roughness;
            frequency *= 2;
        }

        return value / maxValue;
    }

    generateHeightData(offsetZ = 0) {
        const heights = [];
        const size = this.gridResolution + 1;
        
        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                const worldX = (x / this.gridResolution) * this.terrainWidth - this.terrainWidth / 2;
                const worldZ = ((z / this.gridResolution) * this.terrainHeight - this.terrainHeight / 2) + offsetZ;
                
                // Generate base terrain height
                let height = this.noise(worldX, worldZ, 6) * this.mountainHeight;
                
                // Add ridge details
                const ridgeNoise = Math.abs(this.noise(worldX * 0.5, worldZ * 0.5, 3));
                height += (1 - ridgeNoise) * this.mountainHeight * 0.3;
                
                // Add some sharp peaks
                const peakNoise = Math.pow(Math.abs(this.noise(worldX * 2, worldZ * 2, 2)), 3);
                height += peakNoise * this.mountainHeight * 0.5;
                
                // Ensure reasonable height range
                height = Math.max(height, -20);
                
                heights.push(height);
            }
        }
        
        return heights;
    }

    createTerrainSegment(offsetZ = 0) {
        const geometry = new THREE.PlaneGeometry(
            this.terrainWidth,
            this.terrainHeight,
            this.gridResolution,
            this.gridResolution
        );

        // Generate height data
        const heights = this.generateHeightData(offsetZ);
        const positions = geometry.attributes.position.array;

        // Apply heights to vertices
        for (let i = 0; i < positions.length; i += 3) {
            const vertexIndex = i / 3;
            positions[i + 2] = heights[vertexIndex];
        }

        geometry.rotateX(-Math.PI / 2);
        geometry.computeVertexNormals();

        // Create material
        const material = new THREE.MeshLambertMaterial({
            color: 0x000000,
            wireframe: false,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.position.z = offsetZ;

        return mesh;
    }

    createTerrainSegments() {
        for (let i = 0; i < this.terrainCount; i++) {
            const offsetZ = i * this.terrainHeight - this.terrainHeight;
            const terrain = this.createTerrainSegment(offsetZ);
            this.terrainMeshes.push(terrain);
            this.scene.add(terrain);
        }
    }

    updateTerrain() {
        // Update noise offset for smooth terrain generation
        this.noiseOffset += this.scrollSpeed * 0.001;
        
        this.terrainMeshes.forEach(mesh => {
            mesh.position.z += this.scrollSpeed;
            
            // If terrain segment has moved too far forward, move it to the back
            if (mesh.position.z > this.terrainHeight) {
                mesh.position.z -= this.terrainCount * this.terrainHeight;
                
                // Regenerate the terrain with new height data
                const heights = this.generateHeightData(mesh.position.z);
                const positions = mesh.geometry.attributes.position.array;
                
                // Reset geometry rotation to apply new heights
                mesh.geometry.rotateX(Math.PI / 2);
                
                for (let i = 0; i < positions.length; i += 3) {
                    const vertexIndex = i / 3;
                    positions[i + 2] = heights[vertexIndex];
                }
                
                mesh.geometry.rotateX(-Math.PI / 2);
                mesh.geometry.attributes.position.needsUpdate = true;
                mesh.geometry.computeVertexNormals();
            }
        });
    }

    setupControls() {
        const speedSlider = document.getElementById('speedSlider');
        const heightSlider = document.getElementById('heightSlider');
        const roughnessSlider = document.getElementById('roughnessSlider');
        const speedValue = document.getElementById('speedValue');
        const heightValue = document.getElementById('heightValue');
        const roughnessValue = document.getElementById('roughnessValue');

        speedSlider.addEventListener('input', (e) => {
            this.scrollSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.scrollSpeed.toFixed(1);
        });

        heightSlider.addEventListener('input', (e) => {
            this.mountainHeight = parseInt(e.target.value);
            heightValue.textContent = this.mountainHeight;
        });

        roughnessSlider.addEventListener('input', (e) => {
            this.roughness = parseFloat(e.target.value);
            roughnessValue.textContent = this.roughness.toFixed(1);
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'ArrowUp':
                    this.scrollSpeed = Math.min(this.scrollSpeed + 0.1, 5);
                    speedSlider.value = this.scrollSpeed;
                    speedValue.textContent = this.scrollSpeed.toFixed(1);
                    break;
                case 'ArrowDown':
                    this.scrollSpeed = Math.max(this.scrollSpeed - 0.1, 0.1);
                    speedSlider.value = this.scrollSpeed;
                    speedValue.textContent = this.scrollSpeed.toFixed(1);
                    break;
                case 'Space':
                    e.preventDefault();
                    this.scrollSpeed = this.scrollSpeed > 0.1 ? 0 : 1;
                    speedSlider.value = this.scrollSpeed;
                    speedValue.textContent = this.scrollSpeed.toFixed(1);
                    break;
            }
        });
    }

    onWindowResize() {
        const container = document.getElementById('container');
        this.camera.aspect = container.offsetWidth / container.offsetHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.time += 0.01;
        this.updateTerrain();
        
        // Gentle camera movement for more dynamic feel
        this.camera.position.x = Math.sin(this.time * 0.1) * 50;
        this.camera.position.y = 400 + Math.sin(this.time * 0.07) * 20;
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new EndlessMountains();
});