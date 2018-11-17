import './std-js/shims.js';
import './std-js/deprefixer.js';
import {
	$,
	ready,
	registerServiceWorker,
} from './std-js/functions.js';

import {
	login,
	loginWithCreds,
	getDrivers,
	setDrivers,
} from './functions.js';
import {confirm} from './std-js/asyncDialog.js';

if (
	navigator.onLine
	&& document.documentElement.dataset.hasOwnProperty('serviceWorker')
	&& ('serviceWorker' in navigator)
) {
	registerServiceWorker(document.documentElement.dataset.serviceWorker);
}

ready().then(async () => {
	const $doc = $(document.documentElement);
	const $login = $('form[name="login"]');
	$doc.replaceClass('no-js', 'js');
	$doc.toggleClass('offline', ! navigator.onLine);

	if (! navigator.onLine) {
		$('[data-click="login"], [data-click="ping"], [type="submit"]').disable();
		$('.offline-message').unhide();
	}

	$(window).on('offline', () => {
		$('[data-click="login"], [data-click="ping"], [type="submit"]').disable();
		$('.offline-message').unhide();
	});

	$(window).on('online', () => {
		$('[data-click="login"], [data-click="ping"], [type="submit"]').enable();
		$('.offline-message').hide();
	});

	$(document).on('login', async event => {
		if (event.detail !== null && event.detail.hasOwnProperty('resp') && event.detail.resp.hasOwnProperty('token')) {
			localStorage.setItem('token', event.detail.resp.token);
		}
		const drivers = await getDrivers();
		setDrivers(drivers);
		$('[data-click="login"]').hide();
		$('[data-click="logout"]').unhide();
	});

	$(document).on('logout', () => {
		localStorage.clear();
		$('[data-click="login"]').unhide();
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
			if (await confirm('Are you sure you want to logout?')) {
				document.dispatchEvent(new CustomEvent('logout'));
			}
			break;
		case 'reload':
			location.reload();
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
