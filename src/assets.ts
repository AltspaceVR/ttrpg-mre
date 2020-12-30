import * as MRE from '@microsoft/mixed-reality-extension-sdk';

/** Function that populates the provided asset container with a built asset. */
type AssetBuilder = {
	container?: string;
	builder: (ac: MRE.AssetContainer) => Promise<void>;
};

/** Strings are glTF paths, functions generate the asset directly. */
const assetMap: { [name: string]: string | AssetBuilder } = {
	'd1': './dice.glb',
	'd4': './dice.glb',
	'd6': './dice.glb',
	'd8': './dice.glb',
	'd10': './dice.glb',
	'd12': './dice.glb',
	'd20': './dice.glb',
	'Dicebag': {
		container: './dicebag.glb',
		builder: ac => ac.loadGltf('./dicebag.glb', 'box').then()
	},
	'leftHandle': {
		container: './dropHandles.glb',
		builder: ac => ac.loadGltf('./dropHandles.glb', 'box').then()
	},
	'rightHandle': {
		container: './dropHandles.glb',
		builder: ac => ac.loadGltf('./dropHandles.glb', 'box').then()
	},
	'grabHandle': {
		builder: ac => { ac.createCylinderMesh('grabHandle', 0.1, 0.01, 'y'); return Promise.resolve(); }
	}
};

type SessionAssets = { [name: string]: MRE.AssetContainer };

/** Maps session IDs to asset containers */
const sessions = new Map<string, SessionAssets>();

/** Lazy load an asset by name. */
export async function getAsset(context: MRE.Context, name: string): Promise<MRE.Asset> {
	// make sure we know how to load/build the named asset
	if (!assetMap[name]) {
		throw new Error(`No loader/builder for asset "${name}"`);
	}

	// initialize asset storage
	if (!sessions.has(context.sessionId)) {
		sessions.set(context.sessionId, {});
	}
	const sa = sessions.get(context.sessionId);

	let ac: MRE.AssetContainer;
	let asset: MRE.Asset;

	// gltf loading
	if (typeof assetMap[name] === 'string') {
		const assetPath = assetMap[name] as string;
		if (!sa[assetPath]) {
			sa[assetPath] = new MRE.AssetContainer(context);
		}
		ac = sa[assetPath];

		// see if asset is ready
		asset = ac.assets.find(a => a.name === name);

		// if not, load
		if (!asset) {
			try {
				await ac.loadGltf(assetMap[name] as string);
			}
			catch {
				throw new Error(`Error while loading asset "${name}"`);
			}
		}

	// manual construction
	} else {
		const assetBuilder = assetMap[name] as AssetBuilder;
		const saId = assetBuilder.container ?? name;
		if (!sa[saId]) {
			sa[saId] = new MRE.AssetContainer(context);
		}
		ac = sa[saId];

		// see if asset is ready
		asset = ac.assets.find(a => a.name === name);

		// if not, load/build
		if (!asset) {
			try {
				await assetBuilder.builder(ac);
			}
			catch {
				throw new Error(`Error while building asset "${name}"`);
			}
		}
	}

	// fail if the load/build didn't create the needed asset
	if (!asset) {
		asset = ac.assets.find(a => a.name === name)
		if (!asset) {
			throw new Error(`Cannot find asset "${name}" after load/build!`);
		}
	}

	return asset;
}

/** Get multiple assets in parallel. */
export function getAssets(context: MRE.Context, ...assetNames: string[]): Promise<MRE.Asset[]> {
	return Promise.all(assetNames.map(name => getAsset(context, name)));
}

export function cleanUpSession(context: MRE.Context) {
	for (const ac of Object.values(sessions.get(context.sessionId))) {
		ac.unload();
	}
	sessions.delete(context.sessionId);
}
