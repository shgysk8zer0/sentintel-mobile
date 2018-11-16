const config = {
	version: '1.0.0',
	caches: [
		'./',
		// JS
		'./js/index.js',
		'./js/std-js/deprefixer.js',
		'./js/std-js/shims.js',
		'./js/std-js/functions.js',
		'./js/std-js/Notification.js',
		'./js/consts.js',
		'./js/std-js/esQuery.js',
		'./js/functions.js',
		'./js/std-js/asyncDialog.js',
		// CSS
		'./css/styles/index.css',
		'./css/core-css/viewport.css',
		'./css/normalize/normalize.css',
		'./css/styles/vars.css',
		'./css/core-css/rem.css',
		'./css/core-css/element.css',
		'./css/core-css/class-rules.css',
		'./css/animate.css/animate.css',
		'./css/core-css/animations.css',
		'./css/core-css/fonts.css',
		'./css/styles/layout.css',
		'./css/core-css/utility.css',
		'./css/styles/header.css',
		'./css/styles/nav.css',
		'./css/styles/sidebar.css',
		'./css/styles/main.css',
		'./css/styles/footer.css',
		// Images
		'./img/icons.svg',
		'./img/favicon.svg',
		// Fonts
		'./fonts/roboto.woff2',
		// Custom Elements
		'./components/login-form/login-form.js',
		'./components/login-button.js',
		'./components/logout-button.js',
		'./components/current-year.js',
		'./components/offline-message.js',
		'./components/unsupported-browser.js',
		'./components/vehicle-list/vehicle-list.js',
		'./components/vehicle-element/vehicle-element.js',
		'./components/driver-list/driver-list.js',
		'./components/driver-element/driver-element.js',
		// Templates
		'./components/login-form/login-form.html',
		'./components/vehicle-element/vehicle-element.html',
		'./components/vehicle-list/vehicle-list.html',
		'./components/driver-list/driver-list.html',
		'./components/driver-element/driver-element.html',
	].map(path => new URL(path, this.registration.scope)),
	ignored: [
		'./manifest.json',
		'./service-worker.js',
	].map(path => new URL(path, this.registration.scope)),
	origins: [
		location.origin,
		//'https://i.imgur.com',
	],
};

async function deleteOldCaches() {
	const keys = await caches.keys();
	const filtered = keys.filter(v => v !== config.version);
	await Promise.all(filtered.map(v => caches.delete(v)));
}

function isValid(request) {
	const reqUrl = new URL(request.url);
	return request.method === 'GET'
		&& config.origins.includes(reqUrl.origin)
		&& ! config.ignored.some(url => {
			return reqUrl.href === url.href;
		});
}

self.addEventListener('install', async () => {
	if (! await caches.has(config.version)) {
		const cache = await caches.open(config.version);
		await deleteOldCaches();
		await cache.addAll(config.caches);
		skipWaiting();
	}
});

self.addEventListener('activate', event => {
	event.waitUntil(async function() {
		clients.claim();
	}());
});

self.addEventListener('fetch', event => {
	if (isValid(event.request)) {
		event.respondWith(async function() {
			const cache = await caches.open(config.version);
			const cached = await cache.match(event.request);

			if (cached instanceof Response) {
				if (navigator.onLine) {
					cache.add(event.request);
				}
				return cached;
			} else if (navigator.onLine) {
				event.waitUntil(cache.add(event.request));
				return fetch(event.request);
			}
		}());
	}
});
