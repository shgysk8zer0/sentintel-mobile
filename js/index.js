import './std-js/shims.js';
import './std-js/deprefixer.js';
import {$, ready, registerServiceWorker} from './std-js/functions.js';
import {API} from './consts.js';
import {alert} from './std-js/asyncDialog.js';

export async function getOwnerInfo({userid, token}) {
	const url = new URL(`owners/${userid}/${token}`, API);
	const resp = await fetch(url);
	const data = await resp.json();
	return data[0];
}

async function loginWithCreds() {
	if ('credentials' in navigator && window.PasswordCredential instanceof Function) {
		const creds = await navigator.credentials.get({
			password: true,
			mediation: 'required',
		});
		if (creds instanceof PasswordCredential) {
			return login({
				userid: creds.id,
				password: creds.password,
				store: false,
			});
		} else {
			return false;
		}
	} else {
		return false;
	}
}

async function login({userid, password, store = true}) {
	const headers = new Headers();
	const url = new URL('logins', API);
	const body = JSON.stringify([{userid, password}]);
	headers.set('Content-Type', 'application/json');
	headers.set('Accept', 'application/json');
	const resp = await fetch(url, {
		mode: 'cors',
		method: 'POST',
		headers,
		body,
	});
	if (resp.ok) {
		const json = await resp.json();
		if ('error' in json) {
			throw new Error(`"${json.message}" [${json.error}]`);
		}

		const {token, userid} = json;
		const ownerInfo = await getOwnerInfo({userid, token});

		document.dispatchEvent(new CustomEvent('login', {
			detail: {
				resp: json,
				ownerInfo,
			}
		}));
		if (store && window.PasswordCredential instanceof Function) {
			const creds = new PasswordCredential({
				id: userid,
				name: ownerInfo.name,
				password: password,
				iconURL: new URL('/img/adwaita-icons/status/avatar-default.svg', document.baseURI),
			});
			await navigator.credentials.store(creds);
		}
		return true;
	} else {
		return false;
	}
}

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

if (document.documentElement.dataset.hasOwnProperty('serviceWorker') && ('serviceWorker' in navigator)) {
	registerServiceWorker(document.documentElement.dataset.serviceWorker);
}

ready().then(async () => {
	const $doc = $(document.documentElement);
	const $login = $('form[name="login"]');
	$doc.replaceClass('no-js', 'js');
	$doc.toggleClass('offline', ! navigator.onLine);

	$(document).on('login', async event => {
		if (event.detail !== null && event.detail.hasOwnProperty('resp') && event.detail.resp.hasOwnProperty('token')) {
			localStorage.setItem('token', event.detail.resp.token);
		}
		const drivers = await getDrivers();
		console.table(drivers);
		setDrivers(drivers);
		$('[data-show-modal="#login-dialog"], [data-click="login"]').hide();
		$('[data-click="logout"]').unhide();
	});

	$(document).on('logout', () => {
		localStorage.clear();
		$('[data-show-modal="#login-dialog"], [data-click="login"]').unhide();
		$('[data-click="logout"]').hide();
		$('.driver').remove();
	});

	$('[data-show-modal]').click(event => {
		$(event.target.closest('[data-show-modal]').dataset.showModal).showModal();
	});

	$('[data-close]').click(event => {
		$(event.target.closest('[data-close]').dataset.close).close();
	});

	$('[data-click]').click(async event => {
		const target = event.target.closest('[data-click]');
		switch(target.dataset.click) {
		case 'login':
			if (! await loginWithCreds()) {
				$('#login-dialog').showModal();
			}
			break;
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
			const {userid, password} = Object.fromEntries(form.entries());

			if (await login({userid, password, store: true})) {
				await $(event.target.closest('dialog[open]')).fadeOut({fill: 'none'});
				event.target.reset();
				event.target.closest('dialog[open]').close();
			} else {
				$(event.target.closest('dialog[open]')).shake();
				event.target.querySelector('input').focus();
			}
		} catch(err) {
			console.error(err);
		}
	});

	if (localStorage.hasOwnProperty('token')) {
		document.dispatchEvent(new CustomEvent('login'));
	}
});
