import { configureTranslatableNodePredicate } from './nodes';

beforeEach(() => {
	document.body.textContent = '';
	vi.clearAllMocks();
});

test('invalid selectors are skipped', () => {
	const container = document.createElement('div');
	container.classList.add('container');

	const card = document.createElement('div');
	card.classList.add('card');

	const img = document.createElement('img');

	container.appendChild(card);
	card.appendChild(img);

	const filter = configureTranslatableNodePredicate({
		ignoredSelectors: [';', '!', '3', '<'],
	});

	expect(() => filter(img)).not.toThrow();
	expect(filter(img)).toBe(true);
});
