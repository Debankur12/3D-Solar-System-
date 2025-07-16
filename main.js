document.addEventListener('DOMContentLoaded', () => {
  const requiredElements = [
    'loadingScreen', 'infoPanel', 'pauseResumeBtn',
    'resetCameraBtn', 'themeToggleBtn', 'planetSpeedControls',
    'planetLabel', 'colorPicker', 'resetColorsBtn'
  ];

  for (const id of requiredElements) {
    if (!document.getElementById(id)) {
      console.error(`Element with ID ${id} not found`);
      return;
    }
  }


  let scene, camera, renderer, controls;
  const clock = new THREE.Clock();
  let isPaused = false;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredPlanetMesh = null;
  let currentTheme = 'dark';


  const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    infoPanel: document.getElementById('infoPanel'),
    pauseResumeBtn: document.getElementById('pauseResumeBtn'),
    resetCameraBtn: document.getElementById('resetCameraBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    planetSpeedControls: document.getElementById('planetSpeedControls'),
    planetLabel: document.getElementById('planetLabel'),
    colorPicker: document.getElementById('colorPicker'),
    resetColorsBtn: document.getElementById('resetColorsBtn'),
    planetInfoDisplay: document.getElementById('planetInfoDisplay')
  };


  const planetsData = [
    { name: 'Mercury', radius: 0.8, distance: 70, orbitSpeed: 0.03, color: 0x8A8A8A, defaultColor: 0x8A8A8A },
    { name: 'Venus', radius: 1.5, distance: 100, orbitSpeed: 0.02, color: 0xE6C229, defaultColor: 0xE6C229 },
    { name: 'Earth', radius: 1.6, distance: 140, orbitSpeed: 0.015, color: 0x6B93D6, defaultColor: 0x6B93D6 },
    { name: 'Mars', radius: 1.1, distance: 190, orbitSpeed: 0.012, color: 0xE27B58, defaultColor: 0xE27B58 },
    { name: 'Jupiter', radius: 6, distance: 280, orbitSpeed: 0.008, color: 0xC88B3A, defaultColor: 0xC88B3A },
    { name: 'Saturn', radius: 5, distance: 380, orbitSpeed: 0.006, color: 0xE4D191, defaultColor: 0xE4D191, hasRing: true },
    { name: 'Uranus', radius: 4, distance: 450, orbitSpeed: 0.004, color: 0xD1E7E7, defaultColor: 0xD1E7E7 },
    { name: 'Neptune', radius: 3.8, distance: 520, orbitSpeed: 0.003, color: 0x5B5DDF, defaultColor: 0x5B5DDF }
  ];

  const planetObjects = [];


  init();

  function init() {
    setupScene();
    setupCamera();
    setupRenderer();
    setupUIToggle();
    setupControls();
    setupLights();
    createCelestialBodies();
    setupEventListeners();
    elements.loadingScreen.style.display = 'none';
    animate();
  }

  function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
  }

  function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 300, 600);
  }

  function setupRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
  }

  function setupControls() {
    // Use THREE.OrbitControls when loading via script tags
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxDistance = 1000;
    controls.minDistance = 50;
  }
  function setupLights() {
    const sunLight = new THREE.PointLight(0xFFFFFF, 2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
  }

  function createCelestialBodies() {
    createSun();
    createPlanets();
    createStars();
  }

  function createSun() {
    const sunGeometry = new THREE.SphereGeometry(20, 64, 64);
    const sunMaterial = new THREE.MeshStandardMaterial({
      color: 0xFDB813,
      emissive: 0xFDB813,
      emissiveIntensity: 0.5
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);
  }

  function createPlanets() {
    planetsData.forEach(planetData => {
      const planetGeometry = new THREE.SphereGeometry(planetData.radius, 64, 64);
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: planetData.color,
        roughness: 0.8,
        metalness: 0.2
      });

      const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
      planetMesh.userData = planetData;

      const orbitGroup = new THREE.Object3D();
      scene.add(orbitGroup);

      planetMesh.position.set(planetData.distance, 0, 0);
      orbitGroup.add(planetMesh);

      if (planetData.hasRing) {
        createPlanetRing(planetMesh, planetData.radius);
      }

      planetObjects.push({
        data: planetData,
        mesh: planetMesh,
        orbitGroup,
        material: planetMaterial
      });

      createOrbitPath(planetData.distance);
      createPlanetSpeedControl(planetData);
    });
  }
  function setupUIToggle() {
    const toggleBtn = document.getElementById('toggleUI');
    const infoPanel = document.getElementById('infoPanel');

    toggleBtn.addEventListener('click', () => {
      infoPanel.classList.toggle('collapsed');

      // Update button text based on state
      if (infoPanel.classList.contains('collapsed')) {
        toggleBtn.innerHTML = '☰ Show Controls';
      } else {
        toggleBtn.innerHTML = '☰ Hide Controls';
      }
    });
  }

  function createPlanetRing(planetMesh, planetRadius) {
    const ringGeometry = new THREE.RingGeometry(planetRadius * 1.2, planetRadius * 2, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xAAAAAA,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    planetMesh.add(ringMesh);
  }

  function createOrbitPath(distance) {
    const segments = 128;
    const orbitGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);

    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions[i * 3] = distance * Math.cos(theta);
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = distance * Math.sin(theta);
    }

    orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.5,
      linewidth: 2
    });
    const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
    scene.add(orbitLine);
  }

  function createStars() {
    const starCount = 5000;
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];

    for (let i = 0; i < starCount; i++) {
      const x = THREE.MathUtils.randFloatSpread(2000);
      const y = THREE.MathUtils.randFloatSpread(2000);
      const z = THREE.MathUtils.randFloatSpread(2000);
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  function createPlanetSpeedControl(planetData) {
    const controlItem = document.createElement('div');
    controlItem.className = 'planet-control-item';
    controlItem.innerHTML = `
      <label for="${planetData.name.toLowerCase()}Speed">${planetData.name} Speed:</label>
      <div class="slider-wrapper">
        <input type="range" id="${planetData.name.toLowerCase()}Speed" min="0" max="0.1" step="0.001" value="${planetData.orbitSpeed}">
        <span class="slider-value" id="${planetData.name.toLowerCase()}SpeedValue">${planetData.orbitSpeed.toFixed(3)}</span>
      </div>
    `;
    elements.planetSpeedControls.appendChild(controlItem);

    const slider = controlItem.querySelector(`#${planetData.name.toLowerCase()}Speed`);
    const valueDisplay = controlItem.querySelector(`#${planetData.name.toLowerCase()}SpeedValue`);

    slider.addEventListener('input', (e) => {
      const newSpeed = parseFloat(e.target.value);
      planetData.orbitSpeed = newSpeed;
      valueDisplay.textContent = newSpeed.toFixed(3);
    });
  }

  function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    elements.pauseResumeBtn.addEventListener('click', togglePause);
    elements.resetCameraBtn.addEventListener('click', resetCamera);
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.resetColorsBtn.addEventListener('click', resetPlanetColors);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onPlanetClick);
    renderer.domElement.addEventListener('mouseleave', () => {
      hoveredPlanetMesh = null;
      hidePlanetLabel();
    });

    elements.colorPicker.addEventListener('input', (e) => {
      if (hoveredPlanetMesh) {
        const planetObj = planetObjects.find(p => p.mesh === hoveredPlanetMesh);
        if (planetObj) {
          const hexColor = parseInt(e.target.value.substring(1), 16);
          planetObj.material.color.setHex(hexColor);
          planetObj.data.color = hexColor;
        }
      }
    });
  }

  function togglePause() {
    isPaused = !isPaused;
    elements.pauseResumeBtn.textContent = isPaused ? 'Resume' : 'Pause';
  }

  function resetCamera() {
    controls.reset();
    camera.position.set(0, 300, 600);
    controls.update();
  }

  function toggleTheme() {
    if (currentTheme === 'dark') {
      elements.infoPanel.classList.add('light-theme');
      document.body.style.backgroundColor = '#f0f0f0';
      scene.background = new THREE.Color(0xf0f0f0);
      currentTheme = 'light';
      elements.themeToggleBtn.textContent = 'Dark Mode';
    } else {
      elements.infoPanel.classList.remove('light-theme');
      document.body.style.backgroundColor = '#000';
      scene.background = new THREE.Color(0x000000);
      currentTheme = 'dark';
      elements.themeToggleBtn.textContent = 'Light Mode';
    }
  }

  function resetPlanetColors() {
    planetObjects.forEach(planetObj => {
      planetObj.material.color.setHex(planetObj.data.defaultColor);
      planetObj.data.color = planetObj.data.defaultColor;
      elements.colorPicker.value = `#${planetObj.data.defaultColor.toString(16).padStart(6, '0')}`;
    });
  }

  function onPlanetClick() {
    if (hoveredPlanetMesh) {
      const planetObj = planetObjects.find(p => p.mesh === hoveredPlanetMesh);
      if (planetObj) {
        showPlanetInfo(planetObj.data);
      }
    }
  }

  function showPlanetInfo(planetData) {
    elements.planetInfoDisplay.innerHTML = `
      <h2>${planetData.name}</h2>
      <p>Orbit Speed: ${planetData.orbitSpeed.toFixed(3)}</p>
      <p>Distance from Sun: ${planetData.distance} units</p>
      <p>Radius: ${planetData.radius} units</p>
    `;
    elements.planetInfoDisplay.style.display = 'block';
  }

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (!isPaused) {
      planetObjects.forEach(p => {
        p.orbitGroup.rotation.y += p.data.orbitSpeed * delta * 50;
        p.mesh.rotation.y += 0.5 * delta;
      });
    }

    controls.update();

    if (hoveredPlanetMesh) {
      updatePlanetLabelPosition(hoveredPlanetMesh);
    }

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planetObjects.map(p => p.mesh));

    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      if (hoveredPlanetMesh !== intersectedObject) {
        hoveredPlanetMesh = intersectedObject;
        showPlanetLabel(hoveredPlanetMesh.userData.name, e.clientX, e.clientY);
        elements.colorPicker.value = `#${planetObjects.find(p => p.mesh === hoveredPlanetMesh).data.color.toString(16).padStart(6, '0')}`;
      } else {
        updatePlanetLabelPosition(hoveredPlanetMesh, e.clientX, e.clientY);
      }
    } else {
      if (hoveredPlanetMesh) {
        hoveredPlanetMesh = null;
        hidePlanetLabel();
      }
    }
  }

  function showPlanetLabel(name, clientX, clientY) {
    elements.planetLabel.textContent = name;
    elements.planetLabel.style.left = `${clientX}px`;
    elements.planetLabel.style.top = `${clientY}px`;
    elements.planetLabel.classList.add('show');
  }

  function hidePlanetLabel() {
    elements.planetLabel.classList.remove('show');
  }

  function updatePlanetLabelPosition(mesh, clientX = null, clientY = null) {
    if (clientX === null || clientY === null) {
      const vector = new THREE.Vector3();
      mesh.getWorldPosition(vector);
      vector.project(camera);

      clientX = (vector.x * 0.5 + 0.5) * window.innerWidth;
      clientY = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    }
    elements.planetLabel.style.left = `${clientX}px`;
    elements.planetLabel.style.top = `${clientY}px`;
  }
});