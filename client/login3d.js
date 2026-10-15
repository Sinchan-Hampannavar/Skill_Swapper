(function () {
    const canvas = document.getElementById("login-gl");
    const overlay = document.getElementById("login-overlay");
    if (!canvas || !overlay || typeof THREE === "undefined") return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 10;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(4, 6, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-6, -2, 4);
    scene.add(fill);

    const matte = (color, roughness = 0.55) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

    // two interlocked rings = "swap"
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.3, 40, 100), matte(0x059669));
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.3, 40, 100), matte(0x0f172a, 0.5));
    ringA.position.x = -0.65;
    ringB.position.x = 0.65;
    ringB.rotation.x = Math.PI / 2;

    const group = new THREE.Group();
    group.add(ringA, ringB);
    scene.add(group);

    const orbA = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), matte(0x059669, 0.6));
    const orbB = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), matte(0x0f172a, 0.6));
    scene.add(orbA, orbB);

    let anchor = { x: -3.7, y: 1.1, s: 1 };

    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        const halfWidth = Math.tan(THREE.MathUtils.degToRad(22.5)) * 10 * camera.aspect;
        anchor = w >= 768
            ? { x: -halfWidth / 2, y: 1.1, s: 1 }   // desktop: left half
            : { x: 0, y: 3.4, s: 0.5 };             // phone: above the card
        group.scale.setScalar(anchor.s);
    }
    window.addEventListener("resize", resize);
    resize();

    let mx = 0, my = 0;
    window.addEventListener("mousemove", (e) => {
        mx = e.clientX / window.innerWidth - 0.5;
        my = e.clientY / window.innerHeight - 0.5;
    });

    const clock = new THREE.Clock();
    function loop() {
        // stop animating once the user is logged in and the overlay is hidden
        if (overlay.classList.contains("hidden")) return;

        const t = clock.getElapsedTime();
        group.position.set(anchor.x, anchor.y + Math.sin(t * 0.8) * 0.12, 0);
        group.rotation.y = t * 0.35 + mx * 0.6;
        group.rotation.x = 0.35 + Math.sin(t * 0.5) * 0.12 + my * 0.4;

        orbA.position.set(anchor.x + 2.3 * anchor.s, anchor.y - 1.5 * anchor.s + Math.sin(t) * 0.15, -0.5);
        orbB.position.set(anchor.x - 2.2 * anchor.s, anchor.y + 1.6 * anchor.s + Math.cos(t * 0.9) * 0.15, -0.5);

        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    }
    loop();
})();