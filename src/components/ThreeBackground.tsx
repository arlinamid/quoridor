import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;

    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0704);
    scene.fog = new THREE.FogExp2(0x0d0704, 0.028);

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(8, 13, 15);
    camera.lookAt(0, 0, 0);

    function makeWoodTex(r: number, g: number, b: number, grainCount: number, noiseCount: number) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < grainCount; i++) {
        const y = Math.random() * 256, w = Math.random() * 3 + 0.5;
        ctx.fillStyle = `rgba(${r - 30},${g - 25},${b - 20},${Math.random() * 0.3 + 0.1})`;
        ctx.fillRect(0, y, 256, w);
      }
      for (let i = 0; i < noiseCount; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    function makeNormalMap() {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 80; i++) {
        const y = Math.random() * 256;
        ctx.fillStyle = `rgba(${120 + Math.random() * 20},${120 + Math.random() * 20},255,0.3)`;
        ctx.fillRect(0, y, 256, Math.random() * 2 + 0.5);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    const woodDark = makeWoodTex(42, 24, 16, 60, 4000);
    const woodLight = makeWoodTex(180, 138, 98, 50, 3000);
    const woodWall = makeWoodTex(220, 185, 90, 40, 2000);
    const normalMap = makeNormalMap();

    const boardGeo = new THREE.BoxGeometry(10.5, 0.5, 10.5);
    const boardMat = new THREE.MeshStandardMaterial({ map: woodDark, normalMap, roughness: 0.75, metalness: 0.05 });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.position.y = -0.25;
    boardMesh.receiveShadow = true;
    boardMesh.castShadow = true;
    scene.add(boardMesh);

    const rimGeo = new THREE.BoxGeometry(11.2, 0.6, 11.2);
    const rimMat = new THREE.MeshStandardMaterial({ map: makeWoodTex(32, 18, 10, 70, 5000), normalMap, roughness: 0.8, metalness: 0.02 });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = -0.55;
    rimMesh.receiveShadow = true;
    scene.add(rimMesh);

    const cellSize = 0.92, gap = 0.18;
    const cellMat = new THREE.MeshStandardMaterial({ map: woodLight, normalMap, roughness: 0.6, metalness: 0.02 });
    const cellGroup = new THREE.Group();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const geo = new THREE.BoxGeometry(cellSize, 0.14, cellSize);
        const mesh = new THREE.Mesh(geo, cellMat);
        mesh.position.set((c - 4) * (cellSize + gap), 0.07, (r - 4) * (cellSize + gap));
        mesh.receiveShadow = true;
        cellGroup.add(mesh);
      }
    }
    scene.add(cellGroup);

    const wallMat = new THREE.MeshStandardMaterial({
      map: woodWall, normalMap, roughness: 0.45, metalness: 0.1,
      emissive: new THREE.Color(0x3a2800), emissiveIntensity: 0.2
    });

    const walls3D: any[] = [];
    const wallData = [
      { x: -2.0, z: -1.5, ry: 0, h: 1.2 },
      { x: 1.5, z: 2.0, ry: 1.57, h: 1.8 },
      { x: 3.2, z: -3.2, ry: 0.3, h: 2.6 },
      { x: -3.8, z: 3.8, ry: 1.8, h: 1.4 },
      { x: 0.2, z: -4.2, ry: -0.2, h: 3.2 },
      { x: -1.5, z: 1.0, ry: 0.8, h: 2.3 },
      { x: 4.2, z: 0.5, ry: 0.78, h: 3.6 },
      { x: -4.0, z: -3.5, ry: 1.2, h: 4.0 },
    ];

    wallData.forEach(d => {
      const geo = new THREE.BoxGeometry(2.1, 0.2, 0.16);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(d.x, d.h, d.z);
      mesh.rotation.y = d.ry;
      mesh.castShadow = true;
      scene.add(mesh);
      walls3D.push({ mesh, baseY: d.h, phase: Math.random() * Math.PI * 2, speed: 0.25 + Math.random() * 0.35 });
    });

    const s1Mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.25, metalness: 0.45, emissive: 0x4a1008, emissiveIntensity: 0.35 });
    const s2Mat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.25, metalness: 0.45, emissive: 0x0a1520, emissiveIntensity: 0.35 });
    const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 32), s1Mat);
    sphere1.position.set(-2.5, 2.2, -3.5); sphere1.castShadow = true; scene.add(sphere1);
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 32), s2Mat);
    sphere2.position.set(3.2, 3.0, 2.5); sphere2.castShadow = true; scene.add(sphere2);

    const pCount = 300;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 28;
      pPos[i * 3 + 1] = Math.random() * 12;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xf0c866, size: 0.04, transparent: true, opacity: 0.35, sizeAttenuation: true });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    scene.add(new THREE.AmbientLight(0x1a0f08, 0.7));

    const keyLight = new THREE.DirectionalLight(0xffe8c0, 1.3);
    keyLight.position.set(6, 12, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1; keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8; keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8; keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6688aa, 0.2);
    fillLight.position.set(-5, 6, -3);
    scene.add(fillLight);

    const goldPt = new THREE.PointLight(0xf0c866, 0.5, 22);
    goldPt.position.set(0, 6, 0); scene.add(goldPt);

    const redPt = new THREE.PointLight(0xe74c3c, 0.15, 16);
    redPt.position.set(-6, 3, -6); scene.add(redPt);

    const bluePt = new THREE.PointLight(0x2c3e50, 0.12, 16);
    bluePt.position.set(6, 3, 6); scene.add(bluePt);

    const clock = new THREE.Clock();
    let mx = 0, my = 0;
    const onMouseMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    document.addEventListener('mousemove', onMouseMove);

    let animationId: number;
    function loop() {
      animationId = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();

      const angle = Math.sin(t * 0.06) * 0.15;
      boardMesh.rotation.y = angle;
      rimMesh.rotation.y = angle;
      cellGroup.rotation.y = angle;

      walls3D.forEach(w => {
        w.mesh.position.y = w.baseY + Math.sin(t * w.speed + w.phase) * 0.35;
        w.mesh.rotation.x = Math.sin(t * 0.18 + w.phase) * 0.06;
        w.mesh.rotation.z = Math.cos(t * 0.12 + w.phase) * 0.05;
      });

      sphere1.position.y = 2.2 + Math.sin(t * 0.55) * 0.45;
      sphere1.rotation.x = t * 0.3; sphere1.rotation.z = t * 0.15;
      sphere2.position.y = 3.0 + Math.sin(t * 0.45 + 1) * 0.4;
      sphere2.rotation.z = t * 0.25; sphere2.rotation.x = t * 0.1;

      const arr = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < pCount; i++) {
        arr[i * 3 + 1] += 0.003;
        if (arr[i * 3 + 1] > 12) arr[i * 3 + 1] = 0;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particles.rotation.y = t * 0.015;

      goldPt.intensity = 0.5 + Math.sin(t * 0.4) * 0.15;

      camera.position.x = 8 + mx * 1.8;
      camera.position.y = 13 + my * -1.0;
      camera.lookAt(0, 0.5, 0);

      renderer.render(scene, camera);
    }
    loop();

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, []);

  return <div ref={mountRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />;
}
