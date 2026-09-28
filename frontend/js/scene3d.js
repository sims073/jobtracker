(function () {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  s.onload = init;
  document.head.appendChild(s);

  function init() {
    const c = document.createElement("canvas");
    c.id = "bg3d";
    document.body.prepend(c);
    const r = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    cam.position.z = 30;
    const N = 1600, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p.set([(Math.random() - .5) * 90, (Math.random() - .5) * 60, (Math.random() - .5) * 60], i * 3);
      col.set(Math.random() < .5 ? [.36, .55, 1] : [.56, .42, 1], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .25, vertexColors: true, transparent: true, opacity: .85 }));
    sc.add(pts);
    const shapes = [];
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(i % 2 ? new THREE.OctahedronGeometry(2) : new THREE.IcosahedronGeometry(2),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5b8cff : 0x8f6bff, wireframe: true, transparent: true, opacity: .35 }));
      m.position.set((Math.random() - .5) * 50, (Math.random() - .5) * 30, -5 - Math.random() * 15);
      sc.add(m); shapes.push(m);
    }
    let mx = 0, my = 0;
    addEventListener("mousemove", e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
    const size = () => { r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
    addEventListener("resize", size); size();
    (function loop() {
      if (!still) {
        pts.rotation.y += .0006; pts.rotation.x += .0002;
        shapes.forEach((m, i) => { m.rotation.x += .004 + i * .0008; m.rotation.y += .005; });
      }
      cam.position.x += (mx * 8 - cam.position.x) * .03;
      cam.position.y += (-my * 6 - cam.position.y) * .03;
      cam.lookAt(0, 0, 0);
      r.render(sc, cam);
      requestAnimationFrame(loop);
    })();
  }

  // 3D tilt on cards
  if (still) return;
  addEventListener("mousemove", e => {
    const c = e.target.closest && e.target.closest(".card,.appcard");
    document.querySelectorAll(".tilt-on").forEach(x => { if (x !== c) { x.style.transform = ""; x.classList.remove("tilt-on"); } });
    if (!c) return;
    const b = c.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
    c.classList.add("tilt-on");
    c.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(8px)`;
  });
})();
