$(function() {
    (function() {
        var scene, camera, renderer;
        var terrain, geometry, material;
        var worldWidth, worldHeight, gridSize;
        var background = '#fff'; 
        var surface = '#000';
  
        var myCanvas = $("#Surface"),
            myCanvas_W = myCanvas.width(),
            myCanvas_H = myCanvas.height();
  
        function init() {
            setupScene();
            createTerrain();
            setupEventListeners();
            animate();
        }
  
        function setupScene() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(
                75,
                myCanvas_W / myCanvas_H,
                0.1,
                10000
            );
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
            renderer.setSize(myCanvas_W, myCanvas_H);
            renderer.setClearColor(background, 1);
            myCanvas.append(renderer.domElement);
        }
  
        function createTerrain() {
            gridSize = 128;
            worldWidth = 5000;
            worldHeight = 5000;
  
            geometry = new THREE.PlaneGeometry(
                worldWidth,
                worldHeight,
                gridSize - 1,
                gridSize - 1
            );
            
            material = new THREE.MeshPhongMaterial({
                color: surface,
                wireframe: false,
                flatShading: true
            });

            // Create height data
            const positions = geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                positions[i + 2] = Math.random() * 100 + Math.sin((x / worldWidth) * Math.PI * 2) * 50;
            }

            geometry.rotateX(-Math.PI / 2);
            geometry.computeVertexNormals();
  
            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
  
            terrain = new THREE.Mesh(geometry, material);
            scene.add(terrain);
  
            // Set up camera
            camera.position.set(-worldHeight / 4, 300, 500);
            camera.lookAt(0, 0, 0);

            scene.fog = new THREE.Fog(background, 1000, 3500);
        }
  
        function updateTerrain() {
            const positions = geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] = Math.random() * 100 + Math.sin((positions[i] / worldWidth) * Math.PI * 2) * 50;
            }
            geometry.attributes.position.needsUpdate = true;
            geometry.computeVertexNormals();
        }
  
        function setupEventListeners() {
            window.addEventListener('resize', function() {
                myCanvas_W = myCanvas.width();
                myCanvas_H = myCanvas.height();
  
                renderer.setSize(myCanvas_W, myCanvas_H);
                camera.aspect = myCanvas_W / myCanvas_H;
                camera.updateProjectionMatrix();
            });
        }
  
        function animate() {
            requestAnimationFrame(animate);
            terrain.position.x -= 2;
            if (terrain.position.x < -(worldWidth / gridSize)) {
                terrain.position.x += (worldWidth / gridSize);
                updateTerrain();
            }
            renderer.render(scene, camera);
        }
        
        init();
    })();
});