import {API} from './consts.js';
import {$, notify} from './std-js/functions.js';
import {alert} from './std-js/asyncDialog.js';

async function whenOnline() {
	if (! navigator.onLine) {
		await new Promise(resolve => {
			window.addEventListener('online', () => resolve(), {once: true});
		});
	}
}

export async function getOwnerInfo({userid, token}) {
	const url = new URL(`owners/${userid}/${token}`, API);
	const resp = await fetch(url);
	const data = await resp.json();
	return data[0];
}

export async function ping({token, imei}) {
	const url = new URL(`messages/${imei}/${token}`, API);
	const headers = new Headers();
	await whenOnline();
	const resp = await fetch(url, {
		headers,
		method: 'GET',
		mode: 'cors',
	});

	if (resp.ok) {
		return await resp.json();
	} else {
		throw new Error(`<${resp.url}> [${resp.status} ${resp.statusText}]`);
	}
}

export async function loginWithCreds() {
	if ('credentials' in navigator && window.PasswordCredential instanceof Function) {
		const creds = await navigator.credentials.get({
			password: true,
			mediation: 'required',
		});
		if (creds instanceof PasswordCredential) {
			return await login({
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

export async function login({userid, password, store = true}) {
	const headers = new Headers();
	const url = new URL('logins', API);
	const body = JSON.stringify([{userid, password}]);
	headers.set('Content-Type', 'application/json');
	headers.set('Accept', 'application/json');
	await whenOnline();
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

export async function getDrivers(token = localStorage.getItem('token')) {
	const url = new URL([
		'msgdriver',
		token,
	].join('/'), API);
	const headers = new Headers();
	headers.set('Accept', 'application/json');

	await whenOnline();
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

export async function setDrivers(drivers) {
	const template = document.getElementById('driver-template').content;
	const els = drivers.map(driver => {
		const content = template.cloneNode(true);
		$('[data-imei]', content).data({driverId: driver.imei});
		$('[data-field]', content).each(field => {
			if (driver.hasOwnProperty(field.dataset.field)) {
				field.textContent = driver[field.dataset.field];
			} else {
				field.remove();
			}
		});

		$('[data-click="ping"]', content).click(async event => {
			const btn = event.target.closest('[data-click="ping"]');
			btn.disabled = true;
			try {
				await whenOnline();
				const resp = await ping({
					imei: driver.imei,
					token: localStorage.getItem('token'),
				});

				if (resp.status === '200' && typeof resp.message === 'string') {
					notify(resp.message, {
						icon: new URL('img/octicons/alert.svg', document.baseURI),
					}).catch(() => alert(resp.message));
				} else if (typeof resp.message === 'string') {
					throw new Error(resp.message);
				} else {
					throw new Error('An error occured');
				}
			} catch(err) {
				console.error(err);
				alert(err.message);
			} finally {
				btn.disabled = false;
			}
		});
		return content;
	});
	document.querySelector('main').append(...els);
}
