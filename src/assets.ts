import * as MRE from '@microsoft/mixed-reality-extension-sdk';

/** Function that populates the provided asset container with a built asset. */
type AssetBuilder = (ac: MRE.AssetContainer) => Promise<void>;

/** Strings are glTF paths, functions generate the asset directly. */
const assetMap: { [name: string]: string | AssetBuilder } = {
	'd4': './dice.glb',
	'd6': './dice.glb',
	'd8': './dice.glb',
	'd10': './dice.glb',
	'd12': './dice.glb',
	'd20': './dice.glb',
};

type SessionAssets = { [name: string]: MRE.AssetContainer };

/** Maps session IDs to asset containers */
const containers = new Map<string, SessionAssets>();

/** Lazy load an asset by name. */
export async function getAsset(context: MRE.Context, name: string): Promise<MRE.Asset> {
	// make sure we know how to load/build the named asset
	if (!assetMap[name]) {
		throw new Error(`No loader/builder for asset "${name}"`);
	}

	// initialize asset storage
	if (!containers.has(context.sessionId)) {
		containers.set(context.sessionId, {});
	}
	const sa = containers.get(context.sessionId);
	const mapId = typeof assetMap[name] === 'string' ? assetMap[name] as string : name;
	if (!sa[mapId]) {
		sa[mapId] = new MRE.AssetContainer(context);
	}
	
	// see if asset is ready
	const ac = sa[mapId];
	let asset = ac.assets.find(a => a.name === name);

	// if not, load/build
	try {
		if (!asset && typeof assetMap[name] === 'string') {
			await ac.loadGltf(assetMap[name] as string);
		} else if (!asset) {
			await (assetMap[name] as AssetBuilder)(ac);
		}
	}
	catch {
		throw new Error(`Error while loading/building asset "${name}"`);
	}

	// fail if the load/build didn't create the needed asset
	asset = ac.assets.find(a => a.name === name)
	if (!asset) {
		throw new Error(`Cannot find asset "${name}" after load/build!`);
	}

	return asset;
}
