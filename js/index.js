import './std-js/shims.js';
import './std-js/deprefixer.js';
import {$, ready} from './std-js/functions.js';
import {API} from './consts.js';
import {alert} from './std-js/asyncDialog.js';

async function getDrivers(token = localStorage.getItem('token')) {
	const url = new URL([
		'alldrivers',
		token,
	].join('/'), API);

	const headers = new Headers();
	headers.set('Accept', 'application/json');
	const resp = await fetch(url, {
		headers,
		method: 'GET',
		mode: 'cors'
	});

	if (resp.ok) {
		const json = await resp.json();
		if ('error' in json) {
			throw new Error(`${json.message} [${json.error}]`);
		} else {
			return json;
		}
	} else {
		throw new Error(`<${resp.url}> [${resp.status} ${resp.statusText}]`);
	}
}

async function setDrivers(drivers) {
	const template = document.getElementById('driver-template').content;
	const els = drivers.map(driver => {
		const content = template.cloneNode(true);
		$('[data-driver-id]', content).data({driverId: driver.driverid});
		$('[data-field]', content).each(field => {
			if (driver.hasOwnProperty(field.dataset.field)) {
				field.textContent = driver[field.dataset.field];
			} else {
				field.remove();
			}
		});
		$('button', content).click(() => {
			alert(`Would alert ${driver.drivername} [${driver.driverid}] to pull over`);
		});
		return content;
	});
	document.querySelector('main').append(...els);
}

ready().then(async () => {
	const $doc = $(document.documentElement);
	const $login = $('form[name="login"]');
	$doc.replaceClass('no-js', 'js');
	$doc.toggleClass('offline', ! navigator.onLine);

	$(document).on('login', async event => {
		if (event.detail !== null && event.detail.hasOwnProperty('token')) {
			localStorage.setItem('token', event.detail.token);
		}
		const drivers = await getDrivers();
		console.table(drivers);
		setDrivers(drivers);
		$('[data-show-modal="#login-dialog"]').hide();
		$('[data-click="logout"]').unhide();
	});

	$(document).on('logout', () => {
		localStorage.clear();
		$('[data-show-modal="#login-dialog"]').unhide();
		$('[data-click="logout"]').hide();
		$('.driver').remove();
	});

	$('[data-show-modal]').click(event => {
		$(event.target.closest('[data-show-modal]').dataset.showModal).showModal();
	});

	$('[data-close]').click(event => {
		$(event.target.closest('[data-close]').dataset.close).close();
	});

	$('[data-click]').click(event => {
		const target = event.target.closest('[data-click]');
		switch(target.dataset.click) {
		case 'logout':
			document.dispatchEvent(new CustomEvent('logout'));
			break;
		default:
			throw new Error(`No data-click handler for "${target.dataset.click}"`);
		}
	});

	$login.submit(async event => {
		event.preventDefault();
		try {
			const form = new FormData(event.target);
			const data = Object.fromEntries(form.entries());
			const headers = new Headers();
			const url = new URL('logins', API);
			headers.set('Content-Type', 'application/json');
			headers.set('Accept', 'application/json');
			const resp = await fetch(url, {
				headers,
				method: 'POST',
				mode: 'cors',
				body: JSON.stringify([data]),
			});

			if (resp.ok) {
				const json = await resp.json();
				if ('error' in json) {
					throw new Error(`${json.message} [${json.error}]`);
				} else {
					document.dispatchEvent(new CustomEvent('login', {detail: json}));
					await $(event.target.closest('dialog')).fadeOut({fill: 'none'});
					event.target.reset();
					event.target.closest('dialog[open]').close();
				}
			} else {
				throw new Error(`<${resp.url}> [${resp.status} ${resp.statusText}]`);
			}
		} catch(err) {
			console.error(err);
			$(event.target.closest('dialog')).shake();
		}
	});

	if (localStorage.hasOwnProperty('token')) {
		document.dispatchEvent(new CustomEvent('login'));
	}
});
