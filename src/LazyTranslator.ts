import { InnerConfig } from './types';
import { isIntersectableNode } from './utils/isIntersectableNode';

type HandlerIntersectNode = (node: Node) => void;

/**
 * The class provides a way to translate only those elements that intersect the viewport
 */
export class LazyTranslator {
	private readonly handleNode: HandlerIntersectNode;

	private readonly itersectStorage = new WeakSet<Node>();

	private intersectionObserver: IntersectionObserver;

	private readonly config: InnerConfig;

	constructor(handleNode: HandlerIntersectNode, config: InnerConfig) {
		this.handleNode = handleNode;
		this.config = config;

		this.intersectionObserver = new IntersectionObserver(
			(entries, observer) => {
				entries.forEach((entry) => {
					const node = entry.target;

					if (!this.itersectStorage.has(node) || !entry.isIntersecting) return;

					this.itersectStorage.delete(node);
					observer.unobserve(node);

					this.handlerIntersectNode(node);
				});
			},
			{ root: null, rootMargin: '0px', threshold: 0 },
		);
	}

	private handlerIntersectNode(node: Node) {
		// Translate child text nodes and attributes of target node
		// WARNING: we shall not touch inner nodes, because its may still not intersected
		node.childNodes.forEach((node) => {
			if (node instanceof Element || !this.config.isTranslatableNode(node)) {
				return;
			}

			this.handleNode(node);
		});
	}

	public lazyTranslationHandler(node: Node) {
		// Lazy translate when own element intersect viewport
		// But translate at once if node have not parent (virtual node) or parent node is outside of body (utility tags like meta or title)

		if (this.config.lazyTranslate) {
			const isAttachedToDOM = node.getRootNode() !== node;
			const observableNode =
				node instanceof Attr ? node.ownerElement : node.parentElement;

			// Ignore lazy translation for not intersectable nodes and translate it immediately
			if (
				isAttachedToDOM &&
				observableNode !== null &&
				isIntersectableNode(observableNode)
			) {
				this.handleElementByIntersectViewport(observableNode);

				return;
			}
		}

		// Add to storage
		this.handleNode(node);
	}

	private handleElementByIntersectViewport(node: Element) {
		if (this.itersectStorage.has(node)) return;
		this.itersectStorage.add(node);

		this.intersectionObserver.observe(node);
	}

	public stopLazyTranslation(node: Element) {
		this.itersectStorage.delete(node);

		this.intersectionObserver.unobserve(node);
	}
}
