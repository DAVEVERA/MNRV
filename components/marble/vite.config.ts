import { defineConfig } from 'vite';

export default defineConfig({
	publicDir: 'public',
	server: {
		host: '127.0.0.1',
		port: 8080,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8787',
				changeOrigin: true
			}
		}
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true
	}
});
