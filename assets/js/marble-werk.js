/* Marble portfolio — port van components/marble/src/voice/animation/MarbleRenderer.ts
   Zelfde shaders, springs, halo en kleurencyclus; klik toont telkens het volgende project. */
(function () {
	'use strict';

	var HEIGHT_MAP_URL = 'img/textures/noise.jpg';
	var DISPLACEMENT_MAP_URL = 'img/textures/noise3D.jpg';

	var PROJECTS = [
		{
			num: '01',
			cat: 'AI-visualisatie · B2B',
			title: 'MRSVision',
			url: 'https://mrsvision.nl',
			img: 'img/mrsvision-after.jpg',
			desc: 'Interactieve, AI-gestuurde B2B-visualisatietool voor maatwerk raambekleding. Consumenten zien vooraf hoe jaloezieën in hun eigen ruimte staan en worden visueel geholpen bij het juist inmeten.'
		},
		{
			num: '02',
			cat: 'AI Platform',
			title: 'FAINL',
			url: 'https://fainl.com',
			img: 'img/fainl-preview.jpg',
			desc: 'Zeven AI-modellen debatteren en leveren één gefundeerde conclusie. FAINL is een consensus-orkestratielaag: je vraag wordt gelijktijdig door meerdere AI-modellen verwerkt en er wordt één gezaghebbend antwoord gesynthetiseerd.'
		},
		{
			num: '03',
			cat: 'AI Visualisatie',
			title: 'Windofy',
			url: 'https://windofy.com',
			img: 'img/windofy-preview.jpg',
			desc: 'Slimme raamdecoratievisualisatie: klanten bekijken raamdecoratie direct in hun eigen interieur. Foto-upload, productconfiguratie en realistische visualisatie maken de keuze eenvoudiger, persoonlijker en overtuigender.'
		},
		{
			num: '04',
			cat: 'E-commerce',
			title: 'De Notenman',
			url: 'https://denotenman.com',
			img: 'img/denotenman-preview.jpg',
			desc: 'Geen standaard webshop, maar een volledig maatwerk e-commerceplatform waarin productbeleving, bestelgemak, SEO, AI-indexering, marketing automation en backendbeheer samenkomen.'
		},
		{
			num: '05',
			cat: 'Maatschappelijk · Podcastplatform',
			title: 'Stuk Verdriet',
			url: 'https://stukverdriet.com/start',
			img: 'img/stukverdriet-preview.jpg',
			desc: 'Een platform dat mensen verbindt op momenten waarop woorden tekortschieten — verhalen, herkenning en steun rond verlies, rouw en afscheid. Volledig belangeloos ontwikkeld.'
		},
		{
			num: '06',
			cat: 'Studio',
			title: 'MNRV',
			url: 'https://mnrv.nl',
			img: 'img/mnrv-preview.jpg',
			desc: 'Onze eigen digitale identiteit — gebouwd op dezelfde principes waarmee we klanten bedienen: strak, snel, met karakter en vol intentie.'
		}
	];

	var colorOptions = [
		{ hsl: [0, 100, 50], backgroundStart: [217, 38, 38], backgroundEnd: [36, 15, 15] },
		{ hsl: [60, 100, 50], backgroundStart: [217, 217, 38], backgroundEnd: [36, 36, 15] },
		{ hsl: [150, 100, 50], backgroundStart: [38, 217, 128], backgroundEnd: [15, 36, 26] },
		{ hsl: [240, 70, 60], backgroundStart: [103, 103, 203], backgroundEnd: [22, 22, 39] },
		{ hsl: [0, 0, 80], backgroundStart: [204, 204, 204], backgroundEnd: [41, 41, 41] }
	];

	class MarbleRenderer {
		constructor(container) {
			this.container = container;
			this.scene = new THREE.Scene();
			this.clock = new THREE.Clock();
			this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			this.frame = 0;
			this.lastTime = 0;
			this.state = 'idle';
			this.audioLevel = 0;
			this.baseHaloStrength = 0.36;
			this.tapHandler = undefined;
			this.currentStep = 0;
			this.hover = false;
			this.tap = false;
			this.running = false;

			this.scaleSpring = { current: 1, target: 1, velocity: 0 };
			this.marbleSpring = {
				hsl: { current: [0, 100, 50], target: [0, 100, 50], velocity: [0, 0, 0] },
				timeOffset: { current: 0, target: 0, velocity: 0 }
			};
			this.backgroundSpring = {
				start: { current: [217, 38, 38], target: [217, 38, 38], velocity: [0, 0, 0] },
				end: { current: [36, 15, 15], target: [36, 15, 15], velocity: [0, 0, 0] }
			};

			this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
			/* iets verder terug dan het origineel (2): de bol vult zo ~54% i.p.v. 75% van de
			   sectiehoogte, waardoor de volledige aura binnen de sectie past */
			this.camera.position.set(0, 0, 2.6);

			this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
			this.renderer.setSize(this.width, this.height);
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			this.renderer.setClearColor(0x000000, 0);
			this.container.appendChild(this.renderer.domElement);
			this.container.tabIndex = 0;
			this.container.setAttribute('role', 'button');
			this.container.setAttribute('aria-label', 'Bekijk een project uit ons portfolio');

			this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
			this.controls.autoRotate = true;
			this.controls.enableRotate = false;
			this.controls.enablePan = false;
			this.controls.enableZoom = false;

			this.initSprings();
			this.createMarble();
			this.createEnvironment();
			this.addEvents();
			this.start();
		}

		onTap(handler) {
			this.tapHandler = handler;
		}

		start() {
			if (this.running) return;
			this.running = true;
			this.lastTime = 0;
			this.animate();
		}

		stop() {
			this.running = false;
			cancelAnimationFrame(this.frame);
		}

		get width() {
			return this.container.clientWidth || window.innerWidth;
		}

		get height() {
			return this.container.clientHeight || window.innerHeight;
		}

		initSprings() {
			var initialColor = colorOptions[this.currentStep % colorOptions.length];
			this.marbleSpring.hsl.target = initialColor.hsl.slice();
			this.marbleSpring.hsl.current = initialColor.hsl.slice();
			this.backgroundSpring.start.target = initialColor.backgroundStart.slice();
			this.backgroundSpring.start.current = initialColor.backgroundStart.slice();
			this.backgroundSpring.end.target = initialColor.backgroundEnd.slice();
			this.backgroundSpring.end.current = initialColor.backgroundEnd.slice();
			this.updateBackgroundColor();
		}

		createMarble() {
			var geometry = new THREE.SphereGeometry(1, 64, 32);
			this.marble = new THREE.Mesh(geometry, this.createMagicMarbleMaterial());
			this.scene.add(this.marble);

			this.halo = new THREE.Mesh(geometry.clone(), this.createHaloMaterial());
			this.halo.scale.setScalar(1.08);
			this.scene.add(this.halo);
		}

		createMagicMarbleMaterial() {
			var self = this;
			var textureLoader = new THREE.TextureLoader();
			var heightMap = textureLoader.load(HEIGHT_MAP_URL);
			var displacementMap = textureLoader.load(DISPLACEMENT_MAP_URL);

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

			var material = new THREE.MeshStandardMaterial({
				roughness: 0.04,
				metalness: 0.02
			});

			material.onBeforeCompile = function (shader) {
				Object.assign(shader.uniforms, self.uniforms);
				shader.vertexShader = '\n\t\t\t\t\tvarying vec3 v_pos;\n\t\t\t\t\tvarying vec3 v_dir;\n\t\t\t\t' + shader.vertexShader;
				shader.vertexShader = shader.vertexShader.replace(
					/void main\(\) {/,
					function (match) {
						return match + '\n\t\t\t\t\t\tv_dir = position - cameraPosition;\n\t\t\t\t\t\tv_pos = position;\n\t\t\t\t\t';
					}
				);
				shader.fragmentShader = [
					'#define FLIP vec2(1., -1.)',
					'uniform vec3 colorA;',
					'uniform vec3 colorB;',
					'uniform sampler2D heightMap;',
					'uniform sampler2D displacementMap;',
					'uniform int iterations;',
					'uniform float depth;',
					'uniform float smoothing;',
					'uniform float displacement;',
					'uniform float time;',
					'varying vec3 v_pos;',
					'varying vec3 v_dir;'
				].join('\n') + '\n' + shader.fragmentShader;
				shader.fragmentShader = shader.fragmentShader.replace(
					/void main\(\) {/,
					function (match) {
						return [
							'vec3 displacePoint(vec3 p, float strength) {',
							'	vec2 uv = equirectUv(normalize(p));',
							'	vec2 scroll = vec2(time, 0.);',
							'	vec3 displacementA = texture(displacementMap, uv + scroll).rgb;',
							'	vec3 displacementB = texture(displacementMap, uv * FLIP - scroll).rgb;',
							'	displacementA -= 0.5;',
							'	displacementB -= 0.5;',
							'	return p + strength * (displacementA + displacementB);',
							'}',
							'',
							'vec3 marchMarble(vec3 rayOrigin, vec3 rayDir) {',
							'	float perIteration = 1. / float(iterations);',
							'	vec3 deltaRay = rayDir * perIteration * depth;',
							'	vec3 p = rayOrigin;',
							'	float totalVolume = 0.;',
							'',
							'	for (int i=0; i<iterations; ++i) {',
							'		vec3 displaced = displacePoint(p, displacement);',
							'		vec2 uv = equirectUv(normalize(displaced));',
							'		float heightMapVal = texture(heightMap, uv).r;',
							'		float cutoff = 1. - float(i) * perIteration;',
							'		float slice = smoothstep(cutoff, cutoff + smoothing, heightMapVal);',
							'		totalVolume += slice * perIteration;',
							'		p += deltaRay;',
							'	}',
							'	return mix(colorA, colorB, totalVolume);',
							'}'
						].join('\n') + '\n' + match;
					}
				);
				shader.fragmentShader = shader.fragmentShader.replace(
					/vec4 diffuseColor.*;/,
					[
						'vec3 rayDir = normalize(v_dir);',
						'vec3 rayOrigin = v_pos;',
						'vec3 rgb = marchMarble(rayOrigin, rayDir);',
						'vec4 diffuseColor = vec4(rgb, 1.);'
					].join('\n\t\t\t\t\t')
				);
			};

			return material;
		}

		createHaloMaterial() {
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
				vertexShader: [
					'varying vec3 vWorldNormal;',
					'varying vec3 vWorldPosition;',
					'void main() {',
					'	vWorldNormal = normalize(mat3(modelMatrix) * normal);',
					'	vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
					'	vWorldPosition = worldPosition.xyz;',
					'	gl_Position = projectionMatrix * viewMatrix * worldPosition;',
					'}'
				].join('\n'),
				fragmentShader: [
					'uniform vec3 haloColor;',
					'uniform float haloStrength;',
					'uniform float haloPower;',
					'varying vec3 vWorldNormal;',
					'varying vec3 vWorldPosition;',
					'void main() {',
					'	vec3 viewDirection = normalize(cameraPosition - vWorldPosition);',
					'	float fresnel = 1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0);',
					'	float glassEdge = pow(fresnel, haloPower);',
					'	float softFill = pow(fresnel, 2.2) * 0.0015;',
					'	float innerBand = smoothstep(0.52, 0.82, fresnel);',
					'	float outerFade = 1.0 - smoothstep(0.84, 1.0, fresnel);',
					'	float highlight = innerBand * outerFade * 0.012;',
					'	float alpha = clamp((glassEdge * haloStrength + softFill + highlight) * outerFade, 0.0, 0.022);',
					'	vec3 glassColor = mix(vec3(1.0), haloColor, 0.045);',
					'	vec3 rimColor = mix(glassColor, vec3(1.0), highlight * 10.0);',
					'	gl_FragColor = vec4(rimColor, alpha);',
					'}'
				].join('\n')
			});
		}

		createEnvironment() {
			this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
			this.scene.add(new THREE.HemisphereLight(0xffffff, 0x15151f, 0.42));
			var directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
			directionalLight.position.set(1, 1, 1);
			this.scene.add(directionalLight);
			var fillLight = new THREE.PointLight(0xffffff, 0.65, 6);
			fillLight.position.set(-1.4, 0.8, 2.2);
			this.scene.add(fillLight);
		}

		addEvents() {
			var self = this;
			var canvas = this.renderer.domElement;
			canvas.addEventListener('mouseenter', function () {
				self.hover = true;
				self.updateScaleTarget();
			});
			canvas.addEventListener('mouseleave', function () {
				self.hover = false;
				self.updateScaleTarget();
			});
			canvas.addEventListener('mousedown', function () {
				self.tap = true;
				self.updateScaleTarget();
			});
			canvas.addEventListener('mouseup', function () {
				self.tap = false;
				self.updateScaleTarget();
			});
			canvas.addEventListener('click', function () {
				self.cycleColor();
				if (self.tapHandler) self.tapHandler();
			});
			/* Geen preventDefault: pagina moet gewoon verticaal kunnen scrollen vanaf de canvas.
			   De browser-synthetische click na een tap triggert de click-listener hierboven. */
			canvas.addEventListener('touchstart', function () {
				self.tap = true;
				self.updateScaleTarget();
			}, { passive: true });
			canvas.addEventListener('touchend', function () {
				self.tap = false;
				self.updateScaleTarget();
			}, { passive: true });
			this.container.addEventListener('keydown', function (event) {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					self.cycleColor();
					if (self.tapHandler) self.tapHandler();
				}
			});
			window.addEventListener('resize', function () { self.resize(); });
		}

		cycleColor() {
			this.currentStep = (this.currentStep + 1) % colorOptions.length;
			var newColor = colorOptions[this.currentStep % colorOptions.length];
			this.marbleSpring.hsl.target = newColor.hsl.slice();
			this.backgroundSpring.start.target = newColor.backgroundStart.slice();
			this.backgroundSpring.end.target = newColor.backgroundEnd.slice();
			this.marbleSpring.timeOffset.target = this.currentStep * 0.2;
		}

		updateScaleTarget() {
			this.scaleSpring.target = this.tap && this.hover ? 0.95 : 1;
		}

		updateMarbleColor() {
			if (!this.uniforms || !this.uniforms.colorB) return;
			var hsl = clampHsl(this.marbleSpring.hsl.current);
			this.uniforms.colorB.value.setHSL(hsl[0] / 360, hsl[1] / 100, hsl[2] / 100);
			if (this.haloUniforms && this.haloUniforms.haloColor) {
				this.haloUniforms.haloColor.value.setHSL(hsl[0] / 360, clamp(hsl[1] * 0.8, 0, 100) / 100, clamp(hsl[2] + 12, 0, 100) / 100);
			}
		}

		updateBackgroundColor() {
			this.container.style.setProperty('--marble-bg-start', rgbString(this.backgroundSpring.start.current));
			this.container.style.setProperty('--marble-bg-end', rgbString(this.backgroundSpring.end.current));
		}

		animate(currentTime) {
			if (currentTime === undefined) currentTime = 0;
			if (!this.running) return;
			this.frame = requestAnimationFrame(this.animate.bind(this));
			var targetFps = this.reducedMotion ? 30 : 60;
			var frameInterval = 1000 / targetFps;
			if (currentTime - this.lastTime < frameInterval) return;

			var deltaSeconds = Math.min((currentTime - this.lastTime) / 1000 || 1 / targetFps, 1 / 30);
			this.lastTime = currentTime;
			this.updateSprings(deltaSeconds);
			this.updateStateAnimation(deltaSeconds);

			this.controls.update();
			this.renderer.render(this.scene, this.camera);
		}

		updateSprings(deltaSeconds) {
			var scaleChanged = updateSpring(this.scaleSpring, { friction: 15, tension: 300 }, deltaSeconds);
			var marbleHslChanged = updateSpringArray(this.marbleSpring.hsl, { friction: 15, tension: 50 }, deltaSeconds);
			var backgroundStartChanged = updateSpringArray(this.backgroundSpring.start, { friction: 15, tension: 50 }, deltaSeconds);
			var backgroundEndChanged = updateSpringArray(this.backgroundSpring.end, { friction: 15, tension: 50 }, deltaSeconds);
			updateSpring(this.marbleSpring.timeOffset, { friction: 15, tension: 50 }, deltaSeconds);

			if (scaleChanged && this.marble) {
				this.marble.scale.setScalar(this.scaleSpring.current);
				if (this.halo) this.halo.scale.setScalar(this.scaleSpring.current * 1.08);
			}
			if (marbleHslChanged) this.updateMarbleColor();
			if (backgroundStartChanged || backgroundEndChanged) this.updateBackgroundColor();
		}

		updateStateAnimation(deltaSeconds) {
			if (!this.uniforms || !this.marble || !this.halo) return;
			var elapsed = this.clock.elapsedTime;
			var stateIntensity = this.reducedMotion ? 0.35 : 1;
			var level = this.audioLevel * stateIntensity;
			var speed = stateSpeed(this.state);
			var pulse = Math.sin(elapsed * statePulseSpeed(this.state)) * statePulseAmount(this.state) * stateIntensity;
			var rimPulse = (Math.sin(elapsed * statePulseSpeed(this.state) * 0.72) * 0.5 + 0.5) * stateRimPulse(this.state) * stateIntensity;
			var targetScale = 1 + pulse + level * stateAudioScale(this.state);
			var targetHaloScale = targetScale * (1.08 + stateHaloBloom(this.state) + level * 0.012 + rimPulse * 0.008);

			this.marble.scale.setScalar(lerp(this.marble.scale.x, targetScale, 8 * deltaSeconds));
			this.halo.scale.setScalar(lerp(this.halo.scale.x, targetHaloScale, 8 * deltaSeconds));
			this.controls.autoRotateSpeed = speed * stateIntensity;
			this.uniforms.time.value = this.marbleSpring.timeOffset.current + elapsed * (0.05 + speed * 0.035 + level * 0.05);

			if (this.haloUniforms && this.haloUniforms.haloStrength) {
				var targetHaloStrength = this.baseHaloStrength + rimPulse + level * stateAudioHalo(this.state);
				this.haloUniforms.haloStrength.value = lerp(this.haloUniforms.haloStrength.value, targetHaloStrength, 6 * deltaSeconds);
			}
			if (this.haloUniforms && this.haloUniforms.haloPower) {
				var targetHaloPower = stateHaloPower(this.state) - level * 0.025;
				this.haloUniforms.haloPower.value = lerp(this.haloUniforms.haloPower.value, targetHaloPower, 5 * deltaSeconds);
			}

			var displacement = this.uniforms.displacement;
			if (displacement) {
				displacement.value = 0.1 + stateDisplacement(this.state) * stateIntensity + level * 0.015;
			}
		}

		resize() {
			this.camera.aspect = this.width / this.height;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(this.width, this.height);
		}
	}

	function stateSpeed(state) {
		switch (state) {
			case 'thinking': return 1.15;
			case 'generating': return 1.9;
			case 'speaking': return 1.45;
			case 'listening': return 0.95;
			default: return 0.45;
		}
	}

	function statePulseSpeed(state) {
		switch (state) {
			case 'listening': return 6.4;
			case 'speaking': return 8.5;
			case 'generating': return 7.2;
			case 'error': return 12;
			default: return 2.2;
		}
	}

	function statePulseAmount(state) {
		switch (state) {
			case 'permission-request': return 0.025;
			case 'listening': return 0.052;
			case 'speaking': return 0.065;
			case 'generating': return 0.045;
			case 'error': return 0.06;
			default: return 0.015;
		}
	}

	function stateAudioScale(state) {
		return state === 'listening' || state === 'speaking' ? 0.22 : 0.02;
	}

	function stateAudioHalo(state) {
		return state === 'listening' || state === 'speaking' ? 0.004 : 0.0015;
	}

	function stateHaloBloom(state) {
		switch (state) {
			case 'listening': return 0.006;
			case 'thinking': return 0.003;
			case 'generating': return 0.008;
			case 'speaking': return 0.007;
			default: return 0;
		}
	}

	function stateHaloPower(state) {
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

	function stateRimPulse(state) {
		switch (state) {
			case 'permission-request': return 0.003;
			case 'listening': return 0.004;
			case 'thinking': return 0.0025;
			case 'generating': return 0.005;
			case 'speaking': return 0.005;
			default: return 0.0015;
		}
	}

	function stateDisplacement(state) {
		switch (state) {
			case 'thinking': return 0.025;
			case 'generating': return 0.04;
			case 'speaking': return 0.02;
			default: return 0;
		}
	}

	function updateSpring(spring, config, deltaSeconds) {
		var diff = spring.target - spring.current;
		var force = diff * config.tension * deltaSeconds;
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

	function updateSpringArray(spring, config, deltaSeconds) {
		var changed = false;
		for (var index = 0; index < 3; index += 1) {
			var diff = spring.target[index] - spring.current[index];
			var force = diff * config.tension * deltaSeconds;
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

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function clampHsl(hsl) {
		return [
			((hsl[0] % 360) + 360) % 360,
			clamp(hsl[1], 0, 100),
			clamp(hsl[2], 0, 100)
		];
	}

	function rgbString(rgb) {
		return 'rgb(' + Math.round(clamp(rgb[0], 0, 255)) + ', ' + Math.round(clamp(rgb[1], 0, 255)) + ', ' + Math.round(clamp(rgb[2], 0, 255)) + ')';
	}

	function lerp(a, b, amount) {
		return a + (b - a) * Math.min(Math.max(amount, 0), 1);
	}

	/* ---------- Project-popout ---------- */

	function createPopoutController(root, stage, options) {
		var projectIndex = -1;
		var keyListener = null;
		var lockTimer = null;
		var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		function sheetMode() {
			return window.innerWidth < 1100;
		}

		/* Sheet-modus: scroll de pagina zó dat de marble zichtbaar blijft boven de kaart */
		function ensureMarbleVisible() {
			if (!sheetMode()) return 0;
			var rect = stage.getBoundingClientRect();
			var vh = window.innerHeight;
			var sheetH = Math.min(vh * 0.52, 560);
			var target = (vh - sheetH) / 2;
			var delta = (rect.top + rect.height / 2) - target;
			if (Math.abs(delta) < 8) return 0;
			window.scrollBy({ top: delta, behavior: reducedMotion ? 'auto' : 'smooth' });
			return reducedMotion ? 0 : 380;
		}

		function close() {
			root.replaceChildren();
			if (lockTimer) {
				clearTimeout(lockTimer);
				lockTimer = null;
			}
			document.body.style.overflow = '';
			if (keyListener) {
				document.removeEventListener('keydown', keyListener);
				keyListener = null;
			}
			if (stage) stage.focus();
		}

		function next() {
			projectIndex = (projectIndex + 1) % PROJECTS.length;
			show(PROJECTS[projectIndex]);
		}

		/* Volgend project via de kaart of de backdrop: laat de marble ook van kleur wisselen */
		function advance() {
			if (options && options.onCycle) options.onCycle();
			next();
		}

		function show(project) {
			root.replaceChildren();
			var lockDelay = ensureMarbleVisible();
			if (lockTimer) clearTimeout(lockTimer);
			lockTimer = setTimeout(function () {
				document.body.style.overflow = 'hidden';
			}, lockDelay);

			var backdrop = document.createElement('div');
			backdrop.className = 'marble-popout';
			backdrop.setAttribute('role', 'dialog');
			backdrop.setAttribute('aria-modal', 'true');
			backdrop.setAttribute('aria-label', project.title);
			backdrop.addEventListener('click', function (event) {
				if (event.target !== backdrop) return;
				/* klik op de (zichtbare) marble bladert door; klik daarbuiten sluit */
				var r = stage.getBoundingClientRect();
				var opStage = event.clientX >= r.left && event.clientX <= r.right &&
					event.clientY >= r.top && event.clientY <= r.bottom;
				if (opStage) advance();
				else close();
			});

			var panel = document.createElement('article');
			panel.className = 'marble-popout__panel';

			var closeButton = document.createElement('button');
			closeButton.className = 'marble-popout__close';
			closeButton.type = 'button';
			closeButton.setAttribute('aria-label', 'Sluiten');
			closeButton.innerHTML = '&times;';
			closeButton.addEventListener('click', close);

			var figure = document.createElement('figure');
			figure.className = 'marble-popout__media';
			var image = document.createElement('img');
			image.src = project.img;
			image.alt = 'Preview van ' + project.title;
			image.loading = 'lazy';
			figure.appendChild(image);

			var content = document.createElement('div');
			content.className = 'marble-popout__content';

			var meta = document.createElement('p');
			meta.className = 'marble-popout__meta';
			meta.textContent = project.num + ' — ' + project.cat;

			var title = document.createElement('h3');
			title.className = 'marble-popout__title';
			title.textContent = project.title;

			var desc = document.createElement('p');
			desc.className = 'marble-popout__desc';
			desc.textContent = project.desc;

			var actions = document.createElement('div');
			actions.className = 'marble-popout__actions';

			var visit = document.createElement('a');
			visit.className = 'marble-popout__button marble-popout__button--primary';
			visit.href = project.url;
			visit.target = '_blank';
			visit.rel = 'noopener noreferrer';
			visit.textContent = 'Open site ↗';

			var nextButton = document.createElement('button');
			nextButton.className = 'marble-popout__button';
			nextButton.type = 'button';
			nextButton.textContent = 'Volgend project →';
			nextButton.addEventListener('click', advance);

			actions.append(visit, nextButton);
			content.append(meta, title, desc, actions);
			panel.append(closeButton, figure, content);
			backdrop.append(panel);
			root.append(backdrop);

			if (!keyListener) {
				keyListener = function (event) {
					if (event.key === 'Escape') {
						close();
						return;
					}
					if (event.key !== 'Tab') return;
					var focusables = panel.querySelectorAll('button, a[href]');
					if (!focusables.length) return;
					var first = focusables[0];
					var last = focusables[focusables.length - 1];
					if (event.shiftKey && document.activeElement === first) {
						event.preventDefault();
						last.focus();
					} else if (!event.shiftKey && document.activeElement === last) {
						event.preventDefault();
						first.focus();
					}
				};
				document.addEventListener('keydown', keyListener);
			}

			closeButton.focus();
		}

		return { next: next };
	}

	/* ---------- Init ---------- */

	function init() {
		var stage = document.getElementById('marble-stage');
		var popoutRoot = document.getElementById('marble-popout-root');
		if (!stage || !popoutRoot || typeof THREE === 'undefined' || !THREE.OrbitControls) return;

		var renderer;
		try {
			renderer = new MarbleRenderer(stage);
		} catch (error) {
			/* WebGL niet beschikbaar: sectie verbergen zodat er geen leeg vlak achterblijft */
			var section = stage.closest('.marble-werk');
			if (section) section.style.display = 'none';
			return;
		}

		var popout = createPopoutController(popoutRoot, stage, {
			onCycle: function () { renderer.cycleColor(); }
		});
		renderer.onTap(function () { popout.next(); });

		if ('IntersectionObserver' in window) {
			var observer = new IntersectionObserver(function (entries) {
				for (var i = 0; i < entries.length; i += 1) {
					if (entries[i].isIntersecting) renderer.start();
					else renderer.stop();
				}
			}, { rootMargin: '120px 0px' });
			observer.observe(stage);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
