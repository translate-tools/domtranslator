import { TranslatableNodePredicate } from '.';

type Translator = (node: Node) => void;

type IntersectionConfig = {
	root?: null | Element;
	rootMargin?: string;
	threshold?: number;
};

function isIntersectingNode(node: Element) {
	// return true for all element not <options>
	if (node.nodeName === 'OPTION') return false;

	return document.body.contains(node);
}

/**
 * The class provides a way to translate only those elements that intersect with an ancestor element,
 * by default, the top-level document's viewport.
 */
export class LazyTranslator {
	private readonly intersectStorage = new WeakSet<Node>();

	private intersectionObserver: IntersectionObserver;

	constructor(
		private readonly isTranslatableNode: TranslatableNodePredicate,
		private translator: Translator,
		intersectionConfig: IntersectionConfig = {
			root: null,
			rootMargin: '0px',
			threshold: 0,
		},
	) {
		this.intersectionObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				const node = entry.target;

				if (!this.intersectStorage.has(node) || !entry.isIntersecting) return;

				this.intersectStorage.delete(node);
				observer.unobserve(node);

				this.handlerIntersectNode(node);
			});
		}, intersectionConfig);
	}

	public isLazilyTranslatable(node: Node) {
		// Lazy translate when own element intersect viewport
		// But translate at once if node have not parent (virtual node) or parent node is outside of body (utility tags like meta or title)

		const isAttachedToDOM = node.getRootNode() !== node;
		const observableNode =
			node instanceof Attr ? node.ownerElement : node.parentElement;

		// Ignore lazy translation for not introspectable nodes and translate it immediately
		if (
			isAttachedToDOM &&
			observableNode !== null &&
			isIntersectingNode(observableNode)
		) {
			this.handleElementByIntersectViewport(observableNode);

			return true;
		}
		return false;
	}

	public disableLazyTranslation(node: Element) {
		this.intersectStorage.delete(node);

		this.intersectionObserver.unobserve(node);
	}

	private handlerIntersectNode(node: Node) {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.isTranslatableNode(node)) {
				return;
			}
			this.translator(node);
		});
	}

	private handleElementByIntersectViewport(node: Element) {
		if (this.intersectStorage.has(node)) return;
		this.intersectStorage.add(node);
		this.intersectionObserver.observe(node);
	}
}
