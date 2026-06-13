import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParkingSpot } from '@/types/parking';
import { 
  FLOOR_HEIGHT, SPOT_WIDTH, SPOT_LENGTH, PARKING_WIDTH, PARKING_LENGTH,
  ENTRANCE_POSITION, getRampPosition
} from '@/utils/parkingData';
import { generateNavigationPath, createSmoothPath } from '@/utils/pathUtils';

export type CameraMode = 'orbit' | 'firstPerson';

export interface NavigationState {
  isActive: boolean;
  isPaused: boolean;
  progress: number;
  targetSpotId: string | null;
}

export interface ParkingSceneOptions {
  container: HTMLElement;
  onFloorChange?: (floor: number) => void;
  onDistanceChange?: (distance: number) => void;
  onProgressChange?: (progress: number) => void;
  onNavigationEnd?: () => void;
  onNavigationComplete?: () => void;
  onSpotClick?: (spotId: string) => void;
}

export class ParkingScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControls: OrbitControls;
  
  private spotMeshes: Map<string, THREE.Group> = new Map();
  private vehicleMeshes: Map<string, THREE.Group> = new Map();
  private highlightMesh: THREE.Mesh | null = null;
  private navigationLine: THREE.Line | null = null;
  private navigationCurve: THREE.CatmullRomCurve3 | null = null;
  private navigationProgress: number = 0;
  
  private navigationState: NavigationState = {
    isActive: false,
    isPaused: false,
    progress: 0,
    targetSpotId: null,
  };
  
  private targetSpot: ParkingSpot | null = null;
  private totalDistance: number = 0;
  
  private animationId: number | null = null;
  private clock: THREE.Clock;
  
  private cameraMode: CameraMode = 'orbit';
  private keys: Set<string> = new Set();
  private yaw: number = 0;
  private pitch: number = 0;
  private isPointerLocked: boolean = false;
  
  private floorGroup: THREE.Group[] = [];
  
  private onFloorChange?: (floor: number) => void;
  private onDistanceChange?: (distance: number) => void;
  private onProgressChange?: (progress: number) => void;
  private onNavigationEnd?: () => void;
  private onNavigationComplete?: () => void;
  private onSpotClick?: (spotId: string) => void;
  
  private materialCache: Map<string, THREE.Material> = new Map();
  private savedCameraState: { position: THREE.Vector3; target: THREE.Vector3; } | null = null;
  private firstPersonSavedProgress: number = 0;

  constructor(options: ParkingSceneOptions) {
    this.container = options.container;
    this.onFloorChange = options.onFloorChange;
    this.onDistanceChange = options.onDistanceChange;
    this.onProgressChange = options.onProgressChange;
    this.onNavigationEnd = options.onNavigationEnd;
    this.onNavigationComplete = options.onNavigationComplete;
    this.onSpotClick = options.onSpotClick;
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.Fog(0x0a0e1a, 30, 80);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(25, 20, 30);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.container.appendChild(this.renderer.domElement);
    
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.maxPolarAngle = Math.PI / 2.1;
    this.orbitControls.minDistance = 5;
    this.orbitControls.maxDistance = 60;
    this.orbitControls.target.set(0, 2, 0);
    
    this.setupLighting();
    this.createParkingStructure();
    this.setupEventListeners();
    this.animate();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
    mainLight.position.set(20, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -40;
    mainLight.shadow.camera.right = 40;
    mainLight.shadow.camera.top = 40;
    mainLight.shadow.camera.bottom = -40;
    this.scene.add(mainLight);
    
    for (let floor = 0; floor < 3; floor++) {
      const y = floor * FLOOR_HEIGHT + 2.5;
      
      const lightPositions = [
        { x: -PARKING_WIDTH / 3, z: -PARKING_LENGTH / 3 },
        { x: PARKING_WIDTH / 3, z: -PARKING_LENGTH / 3 },
        { x: -PARKING_WIDTH / 3, z: PARKING_LENGTH / 3 },
        { x: PARKING_WIDTH / 3, z: PARKING_LENGTH / 3 },
      ];
      
      lightPositions.forEach((pos, i) => {
        const pointLight = new THREE.PointLight(0x00f5ff, 0.5, 15, 2);
        pointLight.position.set(pos.x, y, pos.z);
        this.scene.add(pointLight);
        
        const lightGeo = new THREE.CircleGeometry(0.4, 16);
        const lightMat = new THREE.MeshBasicMaterial({ 
          color: 0x00f5ff,
          transparent: true,
          opacity: 0.8
        });
        const lightMesh = new THREE.Mesh(lightGeo, lightMat);
        lightMesh.rotation.x = -Math.PI / 2;
        lightMesh.position.set(pos.x, y + 0.9, pos.z);
        this.scene.add(lightMesh);
      });
    }
  }

  private getMaterial(color: number, type: 'standard' | 'basic' | 'transparent' = 'standard', opacity: number = 1): THREE.Material {
    const key = `${color}-${type}-${opacity}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }
    
    let material: THREE.Material;
    if (type === 'basic') {
      material = new THREE.MeshBasicMaterial({ color });
    } else if (type === 'transparent') {
      material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.1,
        roughness: 0.8,
      });
    }
    
    this.materialCache.set(key, material);
    return material;
  }

  private createParkingStructure() {
    for (let floor = 0; floor < 3; floor++) {
      const group = new THREE.Group();
      group.position.y = floor * FLOOR_HEIGHT;
      
      const floorGeo = new THREE.PlaneGeometry(PARKING_WIDTH + 6, PARKING_LENGTH + 6);
      const floorMat = this.getMaterial(0x1a1f2e) as THREE.MeshStandardMaterial;
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = true;
      group.add(floorMesh);
      
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.6 });
      for (let row = 0; row <= 5; row++) {
        const z = row * SPOT_LENGTH - PARKING_LENGTH / 2;
        const lineGeo = new THREE.PlaneGeometry(PARKING_WIDTH, 0.05);
        const lineMesh = new THREE.Mesh(lineGeo, lineMat);
        lineMesh.rotation.x = -Math.PI / 2;
        lineMesh.position.set(0, 0.01, z);
        group.add(lineMesh);
      }
      
      for (let col = 0; col <= 4; col++) {
        const x = col * SPOT_WIDTH - PARKING_WIDTH / 2 + SPOT_WIDTH / 2;
        const lineGeo = new THREE.PlaneGeometry(0.05, PARKING_LENGTH);
        const lineMesh = new THREE.Mesh(lineGeo, lineMat);
        lineMesh.rotation.x = -Math.PI / 2;
        lineMesh.position.set(x, 0.01, 0);
        group.add(lineMesh);
      }
      
      const ceilingGeo = new THREE.PlaneGeometry(PARKING_WIDTH + 6, PARKING_LENGTH + 6);
      const ceilingMat = this.getMaterial(0x151923) as THREE.MeshStandardMaterial;
      const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceilingMesh.rotation.x = Math.PI / 2;
      ceilingMesh.position.y = FLOOR_HEIGHT - 0.1;
      group.add(ceilingMesh);
      
      const wallMat = this.getMaterial(0x1e2535) as THREE.MeshStandardMaterial;
      
      const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(PARKING_WIDTH + 6, FLOOR_HEIGHT, 0.3),
        wallMat
      );
      backWall.position.set(0, FLOOR_HEIGHT / 2, -PARKING_LENGTH / 2 - 3);
      backWall.receiveShadow = true;
      group.add(backWall);
      
      const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, FLOOR_HEIGHT, PARKING_LENGTH + 6),
        wallMat
      );
      leftWall.position.set(-PARKING_WIDTH / 2 - 3, FLOOR_HEIGHT / 2, 0);
      leftWall.receiveShadow = true;
      group.add(leftWall);
      
      const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, FLOOR_HEIGHT, PARKING_LENGTH + 6),
        wallMat
      );
      rightWall.position.set(PARKING_WIDTH / 2 + 3, FLOOR_HEIGHT / 2, 0);
      rightWall.receiveShadow = true;
      group.add(rightWall);
      
      if (floor < 2) {
        const rampGeo = new THREE.BoxGeometry(4, FLOOR_HEIGHT, 8);
        const rampMat = this.getMaterial(0x2a3142) as THREE.MeshStandardMaterial;
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampMesh.position.set(PARKING_WIDTH / 2 + 1, FLOOR_HEIGHT / 2, -PARKING_LENGTH / 2 + 3);
        rampMesh.rotation.z = -Math.PI / 8;
        rampMesh.receiveShadow = true;
        group.add(rampMesh);
      }
      
      const signGeo = new THREE.PlaneGeometry(3, 1);
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 256;
      signCanvas.height = 64;
      const signCtx = signCanvas.getContext('2d')!;
      signCtx.fillStyle = '#00f5ff';
      signCtx.font = 'bold 36px Arial';
      signCtx.textAlign = 'center';
      signCtx.textBaseline = 'middle';
      signCtx.fillText(`B${floor + 1} 层`, 128, 32);
      
      const signTexture = new THREE.CanvasTexture(signCanvas);
      const signMat = new THREE.MeshBasicMaterial({ 
        map: signTexture, 
        transparent: true,
        side: THREE.DoubleSide
      });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 2.5, PARKING_LENGTH / 2 + 2.5);
      signMesh.rotation.y = Math.PI;
      group.add(signMesh);
      
      this.floorGroup.push(group);
      this.scene.add(group);
    }
    
    const entranceGeo = new THREE.BoxGeometry(8, 4, 0.5);
    const entranceMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00f5ff,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.5,
    });
    const entranceMesh = new THREE.Mesh(entranceGeo, entranceMat);
    entranceMesh.position.set(0, 2, PARKING_LENGTH / 2 + 5);
    this.scene.add(entranceMesh);
    
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 128;
    arrowCanvas.height = 128;
    const arrowCtx = arrowCanvas.getContext('2d')!;
    arrowCtx.fillStyle = '#00f5ff';
    arrowCtx.beginPath();
    arrowCtx.moveTo(64, 20);
    arrowCtx.lineTo(108, 80);
    arrowCtx.lineTo(80, 80);
    arrowCtx.lineTo(80, 108);
    arrowCtx.lineTo(48, 108);
    arrowCtx.lineTo(48, 80);
    arrowCtx.lineTo(20, 80);
    arrowCtx.closePath();
    arrowCtx.fill();
    
    const arrowTexture = new THREE.CanvasTexture(arrowCanvas);
    const arrowMat = new THREE.MeshBasicMaterial({
      map: arrowTexture,
      transparent: true,
    });
    const arrowGeo = new THREE.PlaneGeometry(2, 2);
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.rotation.x = -Math.PI / 2;
    arrowMesh.position.set(0, 0.02, PARKING_LENGTH / 2 + 5);
    this.scene.add(arrowMesh);
  }

  public updateParkingSpots(spots: ParkingSpot[]) {
    spots.forEach(spot => {
      if (!this.spotMeshes.has(spot.id)) {
        this.createSpotMesh(spot);
      }
      this.updateSpotMesh(spot);
    });
  }

  private createSpotMesh(spot: ParkingSpot) {
    const group = new THREE.Group();
    group.position.set(spot.position.x, spot.position.y, spot.position.z);
    
    const baseGeo = new THREE.PlaneGeometry(SPOT_WIDTH * 0.9, SPOT_LENGTH * 0.9);
    const baseMat = new THREE.MeshStandardMaterial({
      color: spot.isOccupied ? 0x2a1f1f : 0x1f2a25,
      transparent: true,
      opacity: 0.4,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.y = 0.02;
    baseMesh.name = 'base';
    group.add(baseMesh);
    
    const borderColor = spot.isOccupied ? 0xff4757 : 0x00ff88;
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SPOT_WIDTH * 0.9, 0.02, SPOT_LENGTH * 0.9));
    const borderMat = new THREE.LineBasicMaterial({ 
      color: borderColor, 
      transparent: true, 
      opacity: 0.7 
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.position.y = 0.03;
    border.name = 'border';
    group.add(border);
    
    this.spotMeshes.set(spot.id, group);
    this.scene.add(group);
  }

  private updateSpotMesh(spot: ParkingSpot) {
    const group = this.spotMeshes.get(spot.id);
    if (!group) return;
    
    group.position.set(spot.position.x, spot.position.y, spot.position.z);
    
    const base = group.getObjectByName('base') as THREE.Mesh;
    const border = group.getObjectByName('border') as THREE.LineSegments;
    
    if (base && base.material instanceof THREE.MeshStandardMaterial) {
      base.material.color.setHex(spot.isOccupied ? 0x2a1f1f : 0x1f2a25);
    }
    
    if (border && border.material instanceof THREE.LineBasicMaterial) {
      border.material.color.setHex(spot.isOccupied ? 0xff4757 : 0x00ff88);
    }
    
    if (spot.isOccupied && spot.vehicleType !== 'none') {
      if (!this.vehicleMeshes.has(spot.id)) {
        const vehicle = this.createVehicle(spot.vehicleType || 'car');
        vehicle.position.y = 0.1;
        group.add(vehicle);
        this.vehicleMeshes.set(spot.id, vehicle);
      }
    } else {
      const vehicle = this.vehicleMeshes.get(spot.id);
      if (vehicle) {
        group.remove(vehicle);
        this.disposeGroup(vehicle);
        this.vehicleMeshes.delete(spot.id);
      }
    }
  }

  private createVehicle(type: 'car' | 'suv'): THREE.Group {
    const group = new THREE.Group();
    
    const colors = [0x2d3748, 0x4a5568, 0x1a365d, 0x5d4e37, 0x4a1a1a];
    const bodyColor = colors[Math.floor(Math.random() * colors.length)];
    const bodyHeight = type === 'suv' ? 1.4 : 1.1;
    const bodyWidth = type === 'suv' ? 2.2 : 2;
    const bodyLength = type === 'suv' ? 4.8 : 4.5;
    
    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.5, bodyLength * 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.6,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodyHeight * 0.5;
    body.castShadow = true;
    group.add(body);
    
    const roofGeo = new THREE.BoxGeometry(bodyWidth * 0.85, bodyHeight * 0.5, bodyLength * 0.4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.6,
      roughness: 0.3,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = bodyHeight * 0.85;
    roof.position.z = -bodyLength * 0.05;
    roof.castShadow = true;
    group.add(roof);
    
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.4,
      metalness: 0.9,
      roughness: 0.1,
    });
    
    const frontWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(bodyWidth * 0.8, bodyHeight * 0.35),
      windowMat
    );
    frontWindow.position.set(0, bodyHeight * 0.8, bodyLength * 0.25);
    frontWindow.rotation.x = -0.3;
    group.add(frontWindow);
    
    const backWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(bodyWidth * 0.8, bodyHeight * 0.3),
      windowMat
    );
    backWindow.position.set(0, bodyHeight * 0.75, -bodyLength * 0.25);
    backWindow.rotation.x = Math.PI + 0.3;
    group.add(backWindow);
    
    const wheelRadius = type === 'suv' ? 0.4 : 0.35;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    
    const wheelPositions = [
      { x: -bodyWidth * 0.45, z: bodyLength * 0.2 },
      { x: bodyWidth * 0.45, z: bodyLength * 0.2 },
      { x: -bodyWidth * 0.45, z: -bodyLength * 0.2 },
      { x: bodyWidth * 0.45, z: -bodyLength * 0.2 },
    ];
    
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, wheelRadius, pos.z);
      wheel.castShadow = true;
      group.add(wheel);
    });
    
    const headlightGeo = new THREE.BoxGeometry(0.3, 0.15, 0.1);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
    leftHeadlight.position.set(-bodyWidth * 0.3, bodyHeight * 0.4, bodyLength * 0.3);
    group.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
    rightHeadlight.position.set(bodyWidth * 0.3, bodyHeight * 0.4, bodyLength * 0.3);
    group.add(rightHeadlight);
    
    const taillightGeo = new THREE.BoxGeometry(0.25, 0.12, 0.1);
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const leftTaillight = new THREE.Mesh(taillightGeo, taillightMat);
    leftTaillight.position.set(-bodyWidth * 0.3, bodyHeight * 0.35, -bodyLength * 0.3);
    group.add(leftTaillight);
    
    const rightTaillight = new THREE.Mesh(taillightGeo, taillightMat);
    rightTaillight.position.set(bodyWidth * 0.3, bodyHeight * 0.35, -bodyLength * 0.3);
    group.add(rightTaillight);
    
    return group;
  }

  public highlightSpot(spotId: string | null) {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
    
    if (!spotId) return;
    
    const spotGroup = this.spotMeshes.get(spotId);
    if (!spotGroup) return;
    
    const highlightGeo = new THREE.RingGeometry(SPOT_WIDTH * 0.45, SPOT_WIDTH * 0.55, 32);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    this.highlightMesh.rotation.x = -Math.PI / 2;
    this.highlightMesh.position.set(
      spotGroup.position.x,
      spotGroup.position.y + 0.05,
      spotGroup.position.z
    );
    this.scene.add(this.highlightMesh);
  }

  public startNavigation(spot: ParkingSpot) {
    this.targetSpot = spot;
    this.navigationState = {
      isActive: true,
      isPaused: false,
      progress: 0,
      targetSpotId: spot.id,
    };
    this.navigationProgress = 0;
    
    const pathPoints = generateNavigationPath(spot);
    const { curve, totalLength } = createSmoothPath(pathPoints);
    this.navigationCurve = curve;
    this.totalDistance = totalLength;
    
    this.createNavigationLine(curve);
    
    if (this.cameraMode === 'firstPerson') {
      this.camera.position.copy(ENTRANCE_POSITION);
      this.camera.position.y = 1.7;
    }
    
    this.onDistanceChange?.(totalLength);
    this.onProgressChange?.(0);
    this.onFloorChange?.(0);
  }

  private createNavigationLine(curve: THREE.CatmullRomCurve3) {
    if (this.navigationLine) {
      this.scene.remove(this.navigationLine);
      this.navigationLine.geometry.dispose();
      (this.navigationLine.material as THREE.Material).dispose();
      this.navigationLine = null;
    }
    
    const points = curve.getPoints(300);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.8,
    });
    
    this.navigationLine = new THREE.Line(geometry, lineMat);
    this.navigationLine.position.y += 0.1;
    this.scene.add(this.navigationLine);
  }

  public stopNavigation() {
    this.navigationState = {
      isActive: false,
      isPaused: false,
      progress: 0,
      targetSpotId: null,
    };
    this.navigationProgress = 0;
    this.targetSpot = null;
    this.navigationCurve = null;
    
    if (this.navigationLine) {
      this.scene.remove(this.navigationLine);
      this.navigationLine.geometry.dispose();
      (this.navigationLine.material as THREE.Material).dispose();
      this.navigationLine = null;
    }
    
    this.onNavigationEnd?.();
  }

  public pauseNavigation() {
    if (this.navigationState.isActive) {
      this.navigationState.isPaused = true;
    }
  }

  public resumeNavigation() {
    if (this.navigationState.isActive) {
      this.navigationState.isPaused = false;
    }
  }

  public togglePauseNavigation() {
    if (this.navigationState.isActive) {
      this.navigationState.isPaused = !this.navigationState.isPaused;
    }
  }

  public setNavigationProgress(progress: number) {
    if (!this.navigationState.isActive && this.navigationCurve) {
      this.navigationState.progress = Math.max(0, Math.min(1, progress));
      this.navigationProgress = this.navigationState.progress;
      this.updateCameraFromProgress();
    }
  }

  public stepNavigation(direction: 'forward' | 'backward', amount: number = 0.02) {
    if (!this.navigationState.isActive || !this.navigationCurve) return;
    
    const delta = direction === 'forward' ? amount : -amount;
    const newProgress = Math.max(0, Math.min(1, this.navigationState.progress + delta));
    this.navigationState.progress = newProgress;
    this.navigationProgress = newProgress;
    this.updateCameraFromProgress();
  }

  private updateCameraFromProgress() {
    if (!this.navigationCurve) return;
    
    const position = this.navigationCurve.getPoint(this.navigationProgress);
    
    this.camera.position.copy(position);
    this.camera.position.y = 1.7;
    
    const nextPoint = this.navigationCurve.getPoint(Math.min(this.navigationProgress + 0.01, 1));
    const direction = new THREE.Vector3().subVectors(nextPoint, position).normalize();
    this.camera.lookAt(position.clone().add(direction));
    
    const distanceRemaining = this.totalDistance * (1 - this.navigationProgress);
    const currentFloor = Math.round(position.y / FLOOR_HEIGHT);
    
    this.onDistanceChange?.(distanceRemaining);
    this.onProgressChange?.(this.navigationProgress);
    this.onFloorChange?.(Math.min(Math.max(currentFloor, 0), 2));
  }

  public getNavigationState(): NavigationState {
    return { ...this.navigationState };
  }

  public setCameraMode(mode: CameraMode) {
    const wasNavigating = this.navigationState.isActive && !this.navigationState.isPaused;
    
    if (mode === 'orbit') {
      if (this.cameraMode === 'firstPerson' && this.navigationState.isActive) {
        this.savedCameraState = {
          position: this.camera.position.clone(),
          target: new THREE.Vector3(0, 2, 0),
        };
      }
      
      this.orbitControls.enabled = true;
      this.isPointerLocked = false;
      document.exitPointerLock?.();
      
      if (this.navigationState.isActive && this.targetSpot) {
        this.camera.position.set(
          this.targetSpot.position.x + 15,
          this.targetSpot.position.y + 12,
          this.targetSpot.position.z + 15
        );
        this.orbitControls.target.set(
          this.targetSpot.position.x,
          this.targetSpot.position.y + 1,
          this.targetSpot.position.z
        );
      } else {
        this.camera.position.set(25, 20, 30);
        this.orbitControls.target.set(0, 2, 0);
      }
    } else {
      this.orbitControls.enabled = false;
      
      if (this.navigationState.isActive && this.navigationCurve) {
        const position = this.navigationCurve.getPoint(this.navigationProgress);
        this.camera.position.copy(position);
        this.camera.position.y = 1.7;
        
        const nextPoint = this.navigationCurve.getPoint(Math.min(this.navigationProgress + 0.01, 1));
        const direction = new THREE.Vector3().subVectors(nextPoint, position).normalize();
        this.camera.lookAt(position.clone().add(direction));
        
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.yaw = Math.atan2(dir.x, dir.z);
        this.pitch = Math.asin(dir.y);
      } else {
        this.camera.position.set(0, 1.7, PARKING_LENGTH / 2 + 5);
        this.yaw = Math.PI;
        this.pitch = 0;
        this.updateFirstPersonRotation();
      }
    }
    
    this.cameraMode = mode;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  public focusOnSpot(spot: ParkingSpot) {
    if (this.cameraMode === 'orbit') {
      this.orbitControls.target.set(spot.position.x, spot.position.y + 1, spot.position.z);
      this.camera.position.set(
        spot.position.x + 15,
        spot.position.y + 12,
        spot.position.z + 15
      );
    }
  }

  public focusOnFloor(floor: number) {
    if (this.cameraMode === 'orbit') {
      const targetY = floor * FLOOR_HEIGHT + 1;
      this.orbitControls.target.set(0, targetY, 0);
      this.camera.position.set(25, targetY + 15, 30);
    }
  }

  private followNavigationPath() {
    if (!this.navigationState.isActive || this.navigationState.isPaused || !this.navigationCurve || !this.targetSpot) return;
    
    this.navigationProgress = Math.min(this.navigationProgress + 0.003, 1);
    this.navigationState.progress = this.navigationProgress;
    
    const position = this.navigationCurve.getPoint(this.navigationProgress);
    
    if (this.cameraMode === 'firstPerson') {
      this.camera.position.copy(position);
      this.camera.position.y = 1.7;
      
      const nextPoint = this.navigationCurve.getPoint(Math.min(this.navigationProgress + 0.01, 1));
      const direction = new THREE.Vector3().subVectors(nextPoint, position).normalize();
      this.camera.lookAt(position.clone().add(direction));
    }
    
    const distanceRemaining = this.totalDistance * (1 - this.navigationProgress);
    const currentFloor = Math.round(position.y / FLOOR_HEIGHT);
    
    this.onDistanceChange?.(distanceRemaining);
    this.onProgressChange?.(this.navigationProgress);
    this.onFloorChange?.(Math.min(Math.max(currentFloor, 0), 2));
    
    if (this.navigationProgress >= 1) {
      this.navigationState.isPaused = true;
      this.onNavigationComplete?.();
    }
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  private onResize = () => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    
    if (this.navigationState.isActive) {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePauseNavigation();
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (e.shiftKey) {
          e.preventDefault();
          this.stepNavigation('forward', 0.01);
        }
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (e.shiftKey) {
          e.preventDefault();
          this.stepNavigation('backward', 0.01);
        }
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onCanvasClick = () => {
    if (this.cameraMode === 'firstPerson' && !this.isPointerLocked) {
      this.renderer.domElement.requestPointerLock();
    }
  };

  private onPointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.cameraMode === 'firstPerson' && this.isPointerLocked && !this.navigationState.isActive) {
      this.yaw -= e.movementX * 0.002;
      this.pitch -= e.movementY * 0.002;
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
      this.updateFirstPersonRotation();
    }
  };

  private updateFirstPersonRotation() {
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.setRotationFromEuler(euler);
  }

  private updateFirstPersonMovement(delta: number) {
    if (this.cameraMode !== 'firstPerson' || this.navigationState.isActive) return;
    
    const speed = 10 * delta;
    const direction = new THREE.Vector3();
    
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      this.camera.position.addScaledVector(direction, speed);
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      this.camera.position.addScaledVector(direction, -speed);
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      if (!this.keys.has('ShiftLeft')) {
        this.camera.position.addScaledVector(right, -speed);
      }
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      if (!this.keys.has('ShiftLeft')) {
        this.camera.position.addScaledVector(right, speed);
      }
    }
    
    const floor = Math.round(this.camera.position.y / FLOOR_HEIGHT);
    this.onFloorChange?.(Math.min(Math.max(floor, 0), 2));
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const delta = this.clock.getDelta();
    
    if (this.cameraMode === 'orbit') {
      this.orbitControls.update();
    } else {
      this.updateFirstPersonMovement(delta);
    }
    
    if (this.navigationState.isActive && !this.navigationState.isPaused) {
      this.followNavigationPath();
    }
    
    if (this.highlightMesh) {
      const time = Date.now() * 0.003;
      const scale = 1 + Math.sin(time) * 0.1;
      this.highlightMesh.scale.set(scale, scale, 1);
      (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(time) * 0.3;
    }
    
    if (this.navigationLine) {
      const time = Date.now() * 0.005;
      (this.navigationLine.material as THREE.LineBasicMaterial).opacity = 0.5 + Math.sin(time) * 0.3;
    }
    
    this.renderer.render(this.scene, this.camera);
  };

  private disposeGroup(group: THREE.Group) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  public dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    
    this.orbitControls.dispose();
    
    this.spotMeshes.forEach(group => {
      this.scene.remove(group);
      this.disposeGroup(group);
    });
    
    this.floorGroup.forEach(group => {
      this.scene.remove(group);
      this.disposeGroup(group);
    });
    
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
    }
    
    if (this.navigationLine) {
      this.scene.remove(this.navigationLine);
      this.navigationLine.geometry.dispose();
      (this.navigationLine.material as THREE.Material).dispose();
    }
    
    this.materialCache.forEach(mat => mat.dispose());
    
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
