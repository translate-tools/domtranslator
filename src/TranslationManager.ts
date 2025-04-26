import { DOMTranslator } from './DOMTranslator';
import { LazyDOMTranslator } from './LazyDOMTranslator';
import { InnerConfig } from './NodesTranslator';
import { handleTree } from './utils/handleTree';
import { isIntersectingNode } from './utils/isIntersectingNode';

type TranslationManagerConfig = {
	config: InnerConfig;
	domNodeTranslator: DOMTranslator;
	lazyTranslator: LazyDOMTranslator;
};

/**
 * Class coordinates the processing of DOM nodes for translation. Choose translation strategy: lazy or immediate.
 */
export class TranslationManager {
	private readonly config: InnerConfig;
	private readonly domNodeTranslator: DOMTranslator;
	private readonly lazyTranslator: LazyDOMTranslator;

	constructor({ config, domNodeTranslator, lazyTranslator }: TranslationManagerConfig) {
		this.config = config;
		this.domNodeTranslator = domNodeTranslator;
		this.lazyTranslator = lazyTranslator;
	}

	public getNodeData(node: Node) {
		return this.domNodeTranslator.getOriginalNodeText(node);
	}

	public updateNode(node: Node) {
		this.domNodeTranslator.updateNode(node);
	}

	public isNodeStorageHas(node: Node) {
		return this.domNodeTranslator.hasNode(node);
	}

	public addNode(node: Node) {
		// handle all nodes contained within the element (text nodes and attributes of the current and nested elements)
		if (node instanceof Element) {
			handleTree(node, (node) => {
				if (node instanceof Element) return;

				if (this.config.isTranslatableNode(node)) {
					this.addNode(node);
				}
			});
			return;
		}

		// translate later or immediately
		if (this.config.lazyTranslate && this.tryLazyTranslate(node)) {
			return;
		}

		this.domNodeTranslator.translateNode(node);
	}

	public deleteNode(node: Node) {
		this.domNodeTranslator.restoreNode(node);

		if (node instanceof Element) {
			this.lazyTranslator.detach(node);
		}
	}

	private tryLazyTranslate(node: Node) {
		// Lazy translate when own element intersect viewport
		// But translate at once if node have not parent (virtual node) or parent node is outside of body (utility tags like meta or title)
		const isAttachedToDOM = node.getRootNode() !== node;
		const observableNode =
			node instanceof Attr ? node.ownerElement : node.parentElement;

		// Ignore lazy translation for non-intersecting nodes and translate it immediately
		if (
			isAttachedToDOM &&
			observableNode !== null &&
			isIntersectingNode(observableNode)
		) {
			this.lazyTranslator.attach(observableNode);
			return true;
		}
		return false;
	}
}
