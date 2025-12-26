
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MeshSettings } from '../types';
import { createSolidGeometry } from '../lib/stl-utils';

interface Viewer3DProps {
  pixelData: Uint8ClampedArray | null;
  settings: MeshSettings;
  onMeshCreated: (mesh: THREE.Mesh) => void;
}

const Viewer3D: React.FC<Viewer3DProps> = ({ pixelData, settings, onMeshCreated }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    mesh?: THREE.Mesh;
  } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050506);

    const camera = new THREE.PerspectiveCamera(40, mountRef.current.clientWidth / mountRef.current.clientHeight, 1, 5000);
    camera.position.set(120, 150, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;

    // Scale grid
    const grid = new THREE.GridHelper(200, 20, 0x111111, 0x080808);
    scene.add(grid);

    // Studio lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    
    const fillLight = new THREE.PointLight(0x00ffff, 0.4);
    fillLight.position.set(-100, 50, -50);
    scene.add(fillLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(100, 200, 100);
    mainLight.castShadow = true;
    scene.add(mainLight);

    sceneRef.current = { scene, camera, renderer, controls };

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !pixelData) return;

    const { scene } = sceneRef.current;
    
    if (sceneRef.current.mesh) {
      scene.remove(sceneRef.current.mesh);
      sceneRef.current.mesh.geometry.dispose();
      (sceneRef.current.mesh.material as THREE.Material).dispose();
    }

    const geometry = createSolidGeometry(pixelData, settings.resolution, settings);
    
    // Using a sharper material to emphasize structural integrity
    const material = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: settings.flatTop, // Sharp edges for extrusions
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Flat on grid
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    sceneRef.current.mesh = mesh;
    onMeshCreated(mesh);

  }, [pixelData, settings, onMeshCreated]);

  return <div ref={mountRef} className="w-full h-full cursor-move" />;
};

export default Viewer3D;
