import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { VoiceAgentState } from '../types/voice';

type Hsl = [number, number, number];
type Rgb = [number, number, number];
type MarbleColorOption = {
	hsl: Hsl;
	backgroundStart: Rgb;
	backgroundEnd: Rgb;
};
type CompiledShader = {
	uniforms: Record<string, THREE.IUniform>;
	vertexShader: string;
	fragmentShader: string;
};

const colorOptions: MarbleColorOption[] = [
	{ hsl: [0, 100, 50], backgroundStart: [217, 38, 38], backgroundEnd: [36, 15, 15] },
	{ hsl: [60, 100, 50], backgroundStart: [217, 217, 38], backgroundEnd: [36, 36, 15] },
	{ hsl: [150, 100, 50], backgroundStart: [38, 217, 128], backgroundEnd: [15, 36, 26] },
	{ hsl: [240, 70, 60], backgroundStart: [103, 103, 203], backgroundEnd: [22, 22, 39] },
	{ hsl: [0, 0, 80], backgroundStart: [204, 204, 204], backgroundEnd: [41, 41, 41] }
];

type Spring = { current: number; target: number; velocity: number };
type SpringArray = { current: Hsl; target: Hsl; velocity: Hsl };
type RgbSpringArray = { current: Rgb; target: Rgb; velocity: Rgb };

export class MarbleRenderer {
	private readonly scene = new THREE.Scene();
	private readonly camera: THREE.PerspectiveCamera;
	private readonly renderer: THREE.WebGLRenderer;
	private readonly controls: OrbitControls;
	private readonly clock = new THREE.Clock();
	private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	private marble?: THREE.Mesh;
	private halo?: THREE.Mesh;
	private uniforms?: Record<string, THREE.IUniform>;
	private haloUniforms?: Record<string, THREE.IUniform>;
	private frame = 0;
	private lastTime = 0;
	private state: VoiceAgentState = 'idle';
	private audioLevel = 0;
	private baseHaloStrength = 0.36;
	private tapHandler?: () => void;
	private currentStep = 0;
	private hover = false;
	private tap = false;

	private readonly scaleSpring: Spring = { current: 1, target: 1, velocity: 0 };
	private readonly marbleSpring: { hsl: SpringArray; timeOffset: Spring } = {
		hsl: { current: [0, 100, 50], target: [0, 100, 50], velocity: [0, 0, 0] },
		timeOffset: { current: 0, target: 0, velocity: 0 }
	};
	private readonly backgroundSpring: { start: RgbSpringArray; end: RgbSpringArray } = {
		start: { current: [217, 38, 38], target: [217, 38, 38], velocity: [0, 0, 0] },
		end: { current: [36, 15, 15], target: [36, 15, 15], velocity: [0, 0, 0] }
	};

	constructor(private readonly container: HTMLElement) {
		this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
		this.camera.position.set(0, 0, 2);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.setSize(this.width, this.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setClearColor(0x000000, 0);
		this.container.appendChild(this.renderer.domElement);
		this.container.tabIndex = 0;
		this.container.setAttribute('role', 'button');
		this.container.setAttribute('aria-label', 'Start voice agent');

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.autoRotate = true;
		this.controls.enableRotate = false;
		this.controls.enablePan = false;
		this.controls.enableZoom = false;

		this.initSprings();
		this.createMarble();
		this.createEnvironment();
		this.addEvents();
		this.animate();
	}

	onTap(handler: () => void): void {
		this.tapHandler = handler;
	}

	setState(state: VoiceAgentState): void {
		this.state = state;
		this.container.dataset.state = state;
		this.applyStateTargets();
	}

	setAudioLevel(level: number): void {
		this.audioLevel = Math.min(Math.max(level, 0), 0.35) / 0.35;
	}

	async playAudioBlob(blob: Blob): Promise<void> {
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);
		const context = new AudioContext();
		if (context.state === 'suspended') {
			await context.resume();
		}
		const source = context.createMediaElementSource(audio);
		const analyser = context.createAnalyser();

		analyser.fftSize = 512;
		const data = new Uint8Array(analyser.fftSize);
		source.connect(analyser);
		analyser.connect(context.destination);

		let running = true;
		const tick = () => {
			if (!running) return;
			analyser.getByteTimeDomainData(data);
			let sum = 0;
			for (const value of data) {
				const centered = (value - 128) / 128;
				sum += centered * centered;
			}
			this.setAudioLevel(Math.sqrt(sum / data.length));
			requestAnimationFrame(tick);
		};

		await audio.play();
		tick();

		await new Promise<void>((resolve, reject) => {
			audio.onended = () => resolve();
			audio.onerror = () => reject(new Error('Audio playback failed.'));
		});

		running = false;
		this.setAudioLevel(0);
		URL.revokeObjectURL(url);
		await context.close();
	}

	private get width(): number {
		return this.container.clientWidth || window.innerWidth;
	}

	private get height(): number {
		return this.container.clientHeight || window.innerHeight;
	}

	private initSprings(): void {
		const initialColor = colorOptions[this.currentStep % colorOptions.length];
		this.marbleSpring.hsl.target = [...initialColor.hsl] as Hsl;
		this.marbleSpring.hsl.current = [...initialColor.hsl] as Hsl;
		this.backgroundSpring.start.target = [...initialColor.backgroundStart] as Rgb;
		this.backgroundSpring.start.current = [...initialColor.backgroundStart] as Rgb;
		this.backgroundSpring.end.target = [...initialColor.backgroundEnd] as Rgb;
		this.backgroundSpring.end.current = [...initialColor.backgroundEnd] as Rgb;
		this.updateBackgroundColor();
	}

	private createMarble(): void {
		const geometry = new THREE.SphereGeometry(1, 64, 32);
		this.marble = new THREE.Mesh(geometry, this.createMagicMarbleMaterial());
		this.scene.add(this.marble);

		this.halo = new THREE.Mesh(geometry.clone(), this.createHaloMaterial());
		this.halo.scale.setScalar(1.08);
		this.scene.add(this.halo);
	}

	private createMagicMarbleMaterial(): THREE.Material {
		const textureLoader = new THREE.TextureLoader();
		const heightMap = textureLoader.load('/assets/textures/noise.jpg');
		const displacementMap = textureLoader.load('/assets/textures/noise3D.jpg');

		heightMap.minFilter = THREE.NearestFilter;
		displacementMap.minFilter = THREE.NearestFilter;
		displacementMap.wrapS = displacementMap.wrapT = THREE.RepeatWrapping;

		this.uniforms = {
			time: { value: 0 },
			colorA: { value: new THREE.Color(0.18, 0.18, 0.2) },
			colorB: { value: new THREE.Color(1, 0, 0) },
			heightMap: { value: heightMap },
			displacementMap: { value: displacementMap },
			iterations: { value: 48 },
			depth: { value: 0.6 },
			smoothing: { value: 0.2 },
			displacement: { value: 0.1 }
		};

		this.updateMarbleColor();

		const material = new THREE.MeshStandardMaterial({
			roughness: 0.04,
			metalness: 0.02
		});

		material.onBeforeCompile = (shader: CompiledShader) => {
			shader.uniforms = { ...shader.uniforms, ...this.uniforms };
			shader.vertexShader = `
				varying vec3 v_pos;
				varying vec3 v_dir;
			${shader.vertexShader}`;
			shader.vertexShader = shader.vertexShader.replace(
				/void main\(\) {/,
				(match: string) => `${match}
					v_dir = position - cameraPosition;
					v_pos = position;
				`
			);
			shader.fragmentShader = `
				#define FLIP vec2(1., -1.)
				uniform vec3 colorA;
				uniform vec3 colorB;
				uniform sampler2D heightMap;
				uniform sampler2D displacementMap;
				uniform int iterations;
				uniform float depth;
				uniform float smoothing;
				uniform float displacement;
				uniform float time;
				varying vec3 v_pos;
				varying vec3 v_dir;
			${shader.fragmentShader}`;
			shader.fragmentShader = shader.fragmentShader.replace(
				/void main\(\) {/,
				(match: string) => `
					vec3 displacePoint(vec3 p, float strength) {
						vec2 uv = equirectUv(normalize(p));
						vec2 scroll = vec2(time, 0.);
						vec3 displacementA = texture(displacementMap, uv + scroll).rgb;
						vec3 displacementB = texture(displacementMap, uv * FLIP - scroll).rgb;
						displacementA -= 0.5;
						displacementB -= 0.5;
						return p + strength * (displacementA + displacementB);
					}

					vec3 marchMarble(vec3 rayOrigin, vec3 rayDir) {
						float perIteration = 1. / float(iterations);
						vec3 deltaRay = rayDir * perIteration * depth;
						vec3 p = rayOrigin;
						float totalVolume = 0.;

						for (int i=0; i<iterations; ++i) {
							vec3 displaced = displacePoint(p, displacement);
							vec2 uv = equirectUv(normalize(displaced));
							float heightMapVal = texture(heightMap, uv).r;
							float cutoff = 1. - float(i) * perIteration;
							float slice = smoothstep(cutoff, cutoff + smoothing, heightMapVal);
							totalVolume += slice * perIteration;
							p += deltaRay;
						}
						return mix(colorA, colorB, totalVolume);
					}
				${match}`
			);
			shader.fragmentShader = shader.fragmentShader.replace(
				/vec4 diffuseColor.*;/,
				`
					vec3 rayDir = normalize(v_dir);
					vec3 rayOrigin = v_pos;
					vec3 rgb = marchMarble(rayOrigin, rayDir);
					vec4 diffuseColor = vec4(rgb, 1.);
				`
			);
		};

		return material;
	}

	private createHaloMaterial(): THREE.Material {
		this.haloUniforms = {
			haloColor: { value: new THREE.Color(1, 0.16, 0.12) },
			haloStrength: { value: 0.018 },
			haloPower: { value: 4.4 }
		};
		this.updateMarbleColor();

		return new THREE.ShaderMaterial({
			uniforms: this.haloUniforms,
			transparent: true,
			depthWrite: false,
			blending: THREE.NormalBlending,
			side: THREE.BackSide,
			vertexShader: `
				varying vec3 vWorldNormal;
				varying vec3 vWorldPosition;
				void main() {
					vWorldNormal = normalize(mat3(modelMatrix) * normal);
					vec4 worldPosition = modelMatrix * vec4(position, 1.0);
					vWorldPosition = worldPosition.xyz;
					gl_Position = projectionMatrix * viewMatrix * worldPosition;
				}
			`,
			fragmentShader: `
				uniform vec3 haloColor;
				uniform float haloStrength;
				uniform float haloPower;
				varying vec3 vWorldNormal;
				varying vec3 vWorldPosition;
				void main() {
					vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
					float fresnel = 1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0);
					float glassEdge = pow(fresnel, haloPower);
					float softFill = pow(fresnel, 2.2) * 0.0015;
					float innerBand = smoothstep(0.52, 0.82, fresnel);
					float outerFade = 1.0 - smoothstep(0.84, 1.0, fresnel);
					float highlight = innerBand * outerFade * 0.012;
					float alpha = clamp((glassEdge * haloStrength + softFill + highlight) * outerFade, 0.0, 0.022);
					vec3 glassColor = mix(vec3(1.0), haloColor, 0.045);
					vec3 rimColor = mix(glassColor, vec3(1.0), highlight * 10.0);
					gl_FragColor = vec4(rimColor, alpha);
				}
			`
		});
	}

	private createEnvironment(): void {
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x15151f, 0.42));
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
		directionalLight.position.set(1, 1, 1);
		this.scene.add(directionalLight);
		const fillLight = new THREE.PointLight(0xffffff, 0.65, 6);
		fillLight.position.set(-1.4, 0.8, 2.2);
		this.scene.add(fillLight);
	}

	private addEvents(): void {
		const canvas = this.renderer.domElement;
		canvas.addEventListener('mouseenter', () => {
			this.hover = true;
			this.updateScaleTarget();
		});
		canvas.addEventListener('mouseleave', () => {
			this.hover = false;
			this.updateScaleTarget();
		});
		canvas.addEventListener('mousedown', () => {
			this.tap = true;
			this.updateScaleTarget();
		});
		canvas.addEventListener('mouseup', () => {
			this.tap = false;
			this.updateScaleTarget();
		});
		canvas.addEventListener('click', () => {
			this.cycleColor();
			this.tapHandler?.();
		});
		canvas.addEventListener('touchstart', (event: TouchEvent) => {
			event.preventDefault();
			this.tap = true;
			this.updateScaleTarget();
		}, { passive: false });
		canvas.addEventListener('touchend', (event: TouchEvent) => {
			event.preventDefault();
			this.tap = false;
			this.updateScaleTarget();
			this.cycleColor();
			this.tapHandler?.();
		}, { passive: false });
		this.container.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				this.cycleColor();
				this.tapHandler?.();
			}
		});
		window.addEventListener('resize', () => this.resize());
	}

	private cycleColor(): void {
		this.currentStep = (this.currentStep + 1) % colorOptions.length;
		const newColor = colorOptions[this.currentStep % colorOptions.length];
		this.marbleSpring.hsl.target = [...newColor.hsl] as Hsl;
		this.backgroundSpring.start.target = [...newColor.backgroundStart] as Rgb;
		this.backgroundSpring.end.target = [...newColor.backgroundEnd] as Rgb;
		this.marbleSpring.timeOffset.target = this.currentStep * 0.2;
	}

	private updateScaleTarget(): void {
		this.scaleSpring.target = this.tap && this.hover ? 0.95 : 1;
	}

	private applyStateTargets(): void {
		const intense = this.state === 'listening' || this.state === 'speaking';
		const haloStrength = this.haloUniforms?.haloStrength;
		const haloPower = this.haloUniforms?.haloPower;

		if (haloStrength) {
			this.baseHaloStrength = this.reducedMotion ? 0.012 : stateHaloStrength(this.state);
			haloStrength.value = this.baseHaloStrength;
		}
		if (haloPower) {
			haloPower.value = intense ? 4.1 : 4.4;
		}
	}

	private updateMarbleColor(): void {
		if (!this.uniforms?.colorB) return;
		const [h, s, l] = clampHsl(this.marbleSpring.hsl.current);
		(this.uniforms.colorB.value as THREE.Color).setHSL(h / 360, s / 100, l / 100);
		if (this.haloUniforms?.haloColor) {
			(this.haloUniforms.haloColor.value as THREE.Color).setHSL(h / 360, clamp(s * 0.8, 0, 100) / 100, clamp(l + 12, 0, 100) / 100);
		}
	}

	private updateBackgroundColor(): void {
		this.container.style.setProperty('--marble-bg-start', rgbString(this.backgroundSpring.start.current));
		this.container.style.setProperty('--marble-bg-end', rgbString(this.backgroundSpring.end.current));
	}

	private animate = (currentTime = 0): void => {
		this.frame = requestAnimationFrame(this.animate);
		const targetFps = this.reducedMotion ? 30 : 60;
		const frameInterval = 1000 / targetFps;
		if (currentTime - this.lastTime < frameInterval) return;

		const deltaSeconds = Math.min((currentTime - this.lastTime) / 1000 || 1 / targetFps, 1 / 30);
		this.lastTime = currentTime;
		this.updateSprings(deltaSeconds);
		this.updateStateAnimation(deltaSeconds);

		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	};

	private updateSprings(deltaSeconds: number): void {
		const scaleChanged = updateSpring(this.scaleSpring, { friction: 15, tension: 300 }, deltaSeconds);
		const marbleHslChanged = updateSpringArray(this.marbleSpring.hsl, { friction: 15, tension: 50 }, deltaSeconds);
		const backgroundStartChanged = updateRgbSpringArray(this.backgroundSpring.start, { friction: 15, tension: 50 }, deltaSeconds);
		const backgroundEndChanged = updateRgbSpringArray(this.backgroundSpring.end, { friction: 15, tension: 50 }, deltaSeconds);
		updateSpring(this.marbleSpring.timeOffset, { friction: 15, tension: 50 }, deltaSeconds);

		if (scaleChanged && this.marble) {
			this.marble.scale.setScalar(this.scaleSpring.current);
			this.halo?.scale.setScalar(this.scaleSpring.current * 1.08);
		}
		if (marbleHslChanged) this.updateMarbleColor();
		if (backgroundStartChanged || backgroundEndChanged) this.updateBackgroundColor();
	}

	private updateStateAnimation(deltaSeconds: number): void {
		if (!this.uniforms || !this.marble || !this.halo) return;
		const elapsed = this.clock.elapsedTime;
		const stateIntensity = this.reducedMotion ? 0.35 : 1;
		const level = this.audioLevel * stateIntensity;
		const speed = stateSpeed(this.state);
		const pulse = Math.sin(elapsed * statePulseSpeed(this.state)) * statePulseAmount(this.state) * stateIntensity;
		const rimPulse = (Math.sin(elapsed * statePulseSpeed(this.state) * 0.72) * 0.5 + 0.5) * stateRimPulse(this.state) * stateIntensity;
		const targetScale = 1 + pulse + level * stateAudioScale(this.state);
		const targetHaloScale = targetScale * (1.08 + stateHaloBloom(this.state) + level * 0.012 + rimPulse * 0.008);

		this.marble.scale.setScalar(lerp(this.marble.scale.x, targetScale, 8 * deltaSeconds));
		this.halo.scale.setScalar(lerp(this.halo.scale.x, targetHaloScale, 8 * deltaSeconds));
		this.controls.autoRotateSpeed = speed * stateIntensity;
		this.uniforms.time.value = this.marbleSpring.timeOffset.current + elapsed * (0.05 + speed * 0.035 + level * 0.05);

		if (this.haloUniforms?.haloStrength) {
			const targetHaloStrength = this.baseHaloStrength + rimPulse + level * stateAudioHalo(this.state);
			this.haloUniforms.haloStrength.value = lerp(this.haloUniforms.haloStrength.value as number, targetHaloStrength, 6 * deltaSeconds);
		}
		if (this.haloUniforms?.haloPower) {
			const targetHaloPower = stateHaloPower(this.state) - level * 0.025;
			this.haloUniforms.haloPower.value = lerp(this.haloUniforms.haloPower.value as number, targetHaloPower, 5 * deltaSeconds);
		}

		const displacement = this.uniforms.displacement;
		if (displacement) {
			displacement.value = 0.1 + stateDisplacement(this.state) * stateIntensity + level * 0.015;
		}
	}

	private resize(): void {
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(this.width, this.height);
	}
}

function stateHaloStrength(state: VoiceAgentState): number {
	switch (state) {
		case 'permission-request': return 0.018;
		case 'listening': return 0.022;
		case 'processing-audio': return 0.015;
		case 'thinking': return 0.016;
		case 'generating': return 0.024;
		case 'speaking': return 0.024;
		case 'error': return 0.026;
		default: return 0.012;
	}
}

function stateSpeed(state: VoiceAgentState): number {
	switch (state) {
		case 'thinking': return 1.15;
		case 'generating': return 1.9;
		case 'speaking': return 1.45;
		case 'listening': return 0.95;
		default: return 0.45;
	}
}

function statePulseSpeed(state: VoiceAgentState): number {
	switch (state) {
		case 'listening': return 6.4;
		case 'speaking': return 8.5;
		case 'generating': return 7.2;
		case 'error': return 12;
		default: return 2.2;
	}
}

function statePulseAmount(state: VoiceAgentState): number {
	switch (state) {
		case 'permission-request': return 0.025;
		case 'listening': return 0.052;
		case 'speaking': return 0.065;
		case 'generating': return 0.045;
		case 'error': return 0.06;
		default: return 0.015;
	}
}

function stateAudioScale(state: VoiceAgentState): number {
	return state === 'listening' || state === 'speaking' ? 0.22 : 0.02;
}

function stateAudioHalo(state: VoiceAgentState): number {
	return state === 'listening' || state === 'speaking' ? 0.004 : 0.0015;
}

function stateHaloBloom(state: VoiceAgentState): number {
	switch (state) {
		case 'listening': return 0.006;
		case 'thinking': return 0.003;
		case 'generating': return 0.008;
		case 'speaking': return 0.007;
		default: return 0;
	}
}

function stateHaloPower(state: VoiceAgentState): number {
	switch (state) {
		case 'listening':
		case 'speaking':
			return 4.1;
		case 'thinking':
		case 'generating':
			return 4.25;
		default:
			return 4.4;
	}
}

function stateRimPulse(state: VoiceAgentState): number {
	switch (state) {
		case 'permission-request': return 0.003;
		case 'listening': return 0.004;
		case 'thinking': return 0.0025;
		case 'generating': return 0.005;
		case 'speaking': return 0.005;
		default: return 0.0015;
	}
}

function stateDisplacement(state: VoiceAgentState): number {
	switch (state) {
		case 'thinking': return 0.025;
		case 'generating': return 0.04;
		case 'speaking': return 0.02;
		default: return 0;
	}
}

function updateSpring(spring: Spring, config: { friction: number; tension: number }, deltaSeconds: number): boolean {
	const diff = spring.target - spring.current;
	const force = diff * config.tension * deltaSeconds;
	spring.velocity += force;
	spring.velocity *= Math.exp(-config.friction * deltaSeconds);
	spring.current += spring.velocity * deltaSeconds;
	if (Math.abs(diff) < 0.001 && Math.abs(spring.velocity) < 0.001) {
		spring.current = spring.target;
		spring.velocity = 0;
		return false;
	}
	return true;
}

function updateSpringArray(spring: SpringArray, config: { friction: number; tension: number }, deltaSeconds: number): boolean {
	let changed = false;
	for (let index = 0; index < 3; index += 1) {
		const diff = spring.target[index] - spring.current[index];
		const force = diff * config.tension * deltaSeconds;
		spring.velocity[index] += force;
		spring.velocity[index] *= Math.exp(-config.friction * deltaSeconds);
		spring.current[index] += spring.velocity[index] * deltaSeconds;
		if (Math.abs(diff) < 0.001 && Math.abs(spring.velocity[index]) < 0.001) {
			spring.current[index] = spring.target[index];
			spring.velocity[index] = 0;
		} else {
			changed = true;
		}
	}
	return changed;
}

function updateRgbSpringArray(spring: RgbSpringArray, config: { friction: number; tension: number }, deltaSeconds: number): boolean {
	let changed = false;
	for (let index = 0; index < 3; index += 1) {
		const diff = spring.target[index] - spring.current[index];
		const force = diff * config.tension * deltaSeconds;
		spring.velocity[index] += force;
		spring.velocity[index] *= Math.exp(-config.friction * deltaSeconds);
		spring.current[index] += spring.velocity[index] * deltaSeconds;
		if (Math.abs(diff) < 0.001 && Math.abs(spring.velocity[index]) < 0.001) {
			spring.current[index] = spring.target[index];
			spring.velocity[index] = 0;
		} else {
			changed = true;
		}
	}
	return changed;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function clampHsl(hsl: Hsl): Hsl {
	return [
		((hsl[0] % 360) + 360) % 360,
		clamp(hsl[1], 0, 100),
		clamp(hsl[2], 0, 100)
	];
}

function rgbString(rgb: Rgb): string {
	return `rgb(${Math.round(clamp(rgb[0], 0, 255))}, ${Math.round(clamp(rgb[1], 0, 255))}, ${Math.round(clamp(rgb[2], 0, 255))})`;
}

function lerp(a: number, b: number, amount: number): number {
	return a + (b - a) * Math.min(Math.max(amount, 0), 1);
}
