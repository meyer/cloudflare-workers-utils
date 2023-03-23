import { getThingFromObjectOrThrow, invariant, isNotNullish, PublicMessageError } from '@workers-utils/common';
import * as D2Core from 'bungie-api-ts/core';
import * as D2 from 'bungie-api-ts/destiny2';
import { PlatformErrorCodes } from 'bungie-api-ts/destiny2';
import * as D2GroupV2 from 'bungie-api-ts/groupv2';
import * as D2User from 'bungie-api-ts/user';

import { bitwiseSplit } from './bitwiseSplit.js';
import { validateBungieName } from './validateBungieName.js';

const getVendorItemStatus = bitwiseSplit({
  [D2.VendorItemStatus.AlreadyOwned]: 'alreadyOwned',
  [D2.VendorItemStatus.AlreadySelling]: 'alreadySelling',
  [D2.VendorItemStatus.DisplayOnly]: 'displayOnly',
  [D2.VendorItemStatus.NoFunds]: 'noFunds',
  [D2.VendorItemStatus.NoInventorySpace]: 'noInventorySpace',
  [D2.VendorItemStatus.NoProgression]: 'noProgression',
  [D2.VendorItemStatus.NoQuantity]: 'noQuantity',
  [D2.VendorItemStatus.NotAvailable]: 'notAvailable',
  // for mods, NoUnlock === "already owned" https://github.com/Bungie-net/api/issues/1394
  [D2.VendorItemStatus.NoUnlock]: 'noUnlock',
  [D2.VendorItemStatus.OutsidePurchaseWindow]: 'outsidePurchaseWindow',
  [D2.VendorItemStatus.SellingInhibited]: 'sellingInhibited',
  [D2.VendorItemStatus.Success]: 'success',
  [D2.VendorItemStatus.UniquenessViolation]: 'uniquenessViolation',
  [D2.VendorItemStatus.UnknownError]: 'unknownError',
  [D2.VendorItemStatus.Unsellable]: 'unsellable',
});

const getCollectibleState = bitwiseSplit({
  [D2.DestinyCollectibleState.CannotAffordMaterialRequirements]: 'cannotAffordMaterialRequirements',
  [D2.DestinyCollectibleState.InventorySpaceUnavailable]: 'inventorySpaceUnavailable',
  [D2.DestinyCollectibleState.Invisible]: 'invisible',
  [D2.DestinyCollectibleState.NotAcquired]: 'notAcquired',
  [D2.DestinyCollectibleState.Obscured]: 'obscured',
  [D2.DestinyCollectibleState.PurchaseDisabled]: 'purchaseDisabled',
  [D2.DestinyCollectibleState.UniquenessViolation]: 'uniquenessViolation',
});

const interestingActivityModes: Partial<Record<D2.DestinyActivityModeType, 'pve' | 'pvp'>> = {
  [D2.DestinyActivityModeType.AllPvE]: 'pve',
  [D2.DestinyActivityModeType.AllPvP]: 'pvp',
};

const hasAtLeastOneItem = <T>(array: T[]): array is [T, ...T[]] => array.length >= 1;

type TableName = keyof D2.AllDestinyManifestComponents;

type EntityTypeToResponseTypeMap = {
  [K in TableName]: D2.AllDestinyManifestComponents[K][number];
};

const formatCollectibles = (collectibles: Record<number, D2.DestinyCollectibleComponent>) => {
  const collectiblesEntries = Object.entries(collectibles);

  return collectiblesEntries.map(([hash, collectible]) => ({
    ...getCollectibleState(collectible.state),
    hash,
  }));
};

export const enum CollectiblePresentationNodeHash {
  ArmorMods = 615947643,
  WeaponMods = 1627803277,
  CombatStyleArmorMods = 123185593,
}

interface BungieGetCollectibleNodeDetailsParams
  extends Omit<D2.GetCollectibleNodeDetailsParams, 'collectiblePresentationNodeHash'> {
  collectiblePresentationNodeHash: CollectiblePresentationNodeHash;
}

export const enum VendorHash {
  ada1 = 350061650,
  gunsmith = 672118013,
}

export interface BungieGetVendorParams extends Omit<D2.GetVendorParams, 'components' | 'vendorHash'> {
  vendorHash: VendorHash;
}

export class BungieApiError extends Error {
  constructor(
    public errorCode: D2.PlatformErrorCodes,
    public errorStatus: string,
    public apiResponse: D2.ServerResponse<unknown>
  ) {
    super(errorCode + ': ' + errorStatus);
  }
}

export const getNiceMessageFromBungieError = (error: BungieApiError) => {
  if (error.errorCode === PlatformErrorCodes.SystemDisabled) {
    return 'The Bungie API is currently disabled.';
  } else {
    return `${error.errorCode} ${error.errorStatus}`;
  }
};

export type BungieApiClient = ReturnType<typeof getBungieApiClient>;

interface BungieApiClientOptions {
  apiKey: string;
  apiOrigin: string;
  /** A KV store containing stringified definition objects from the Destiny manifest, with keys in the following format: `${tableName}/${hash}`. */
  definitions: KVNamespace;
}

export const getBungieApiClient = (options: BungieApiClientOptions, accessToken?: string) => {
  const apiKey = getThingFromObjectOrThrow(options, 'apiKey');
  const apiOrigin = getThingFromObjectOrThrow(options, 'apiOrigin');
  const definitions = getThingFromObjectOrThrow(options, 'definitions');

  const bungieHttpClient: D2.HttpClient = async (config) => {
    const headers: Record<string, string> = {
      'X-API-Key': apiKey,
      Origin: apiOrigin,
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const url = new URL(config.url);
    if (config.params) {
      for (const key in config.params) {
        url.searchParams.set(key, config.params[key]);
      }
    }

    console.log(config.method, url.toString());

    const result = await fetch(url.toString(), {
      method: config.method,
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    const jsonResponse = (await result.json()) as D2.ServerResponse<unknown>;

    if (
      typeof jsonResponse === 'object' &&
      'ErrorCode' in jsonResponse &&
      'ErrorStatus' in jsonResponse &&
      jsonResponse.ErrorCode === D2.PlatformErrorCodes.SystemDisabled
    ) {
      throw new BungieApiError(jsonResponse.ErrorCode, jsonResponse.ErrorStatus, jsonResponse);
    }

    return jsonResponse;
  };

  const getBungieNetUserById = async (id: string) => {
    return await D2User.getBungieNetUserById(bungieHttpClient, { id });
  };

  const getMembershipDataForCurrentUser = async () => {
    return D2User.getMembershipDataForCurrentUser(bungieHttpClient);
  };

  const bungieGetLinkedProfiles = async (
    membershipId: string,
    membershipType: D2.BungieMembershipType,
    getAllMemberships = false
  ): Promise<
    D2.ServerResponse<
      Omit<D2.DestinyLinkedProfilesResponse, 'bnetMembership'> & {
        bnetMembership?: D2.DestinyLinkedProfilesResponse['bnetMembership'];
      }
    >
  > => {
    return D2.getLinkedProfiles(bungieHttpClient, {
      membershipId,
      membershipType,
      getAllMemberships,
    });
  };

  const getCharacter = async (
    membershipType: D2.BungieMembershipType,
    destinyMembershipId: string,
    characterId: string
  ) => {
    return D2.getCharacter(bungieHttpClient, {
      characterId,
      components: [
        // equipped item instances
        D2.DestinyComponentType.CharacterEquipment,
        // stored item instances
        D2.DestinyComponentType.CharacterInventories,
        // character info
        D2.DestinyComponentType.Characters,
        D2.DestinyComponentType.ItemInstances,
        D2.DestinyComponentType.ItemPlugStates,
        D2.DestinyComponentType.ItemSockets,
        D2.DestinyComponentType.ItemPerks,
      ],
      destinyMembershipId,
      membershipType,
    });
  };

  const getProfileCollectibles = async (membershipType: D2.BungieMembershipType, destinyMembershipId: string) => {
    const character = await D2.getProfile(bungieHttpClient, {
      components: [D2.DestinyComponentType.Collectibles, D2.DestinyComponentType.PresentationNodes],
      destinyMembershipId,
      membershipType,
    });

    const collectiblesData = character.Response.profileCollectibles.data;
    invariant(collectiblesData, 'Missing required data');

    return formatCollectibles(collectiblesData.collectibles);
  };

  const getMembershipDataById = async (membershipType: D2.BungieMembershipType, membershipId: string) => {
    return D2User.getMembershipDataById(bungieHttpClient, {
      membershipId,
      membershipType,
    });
  };

  const getProfile = async (membershipType: D2.BungieMembershipType, destinyMembershipId: string) => {
    return D2.getProfile(bungieHttpClient, {
      components: [D2.DestinyComponentType.Characters, D2.DestinyComponentType.Profiles],
      destinyMembershipId,
      membershipType,
    });
  };

  /** Get clan information */
  const getGroupsForMember = async (membershipId: string) => {
    return D2GroupV2.getGroupsForMember(bungieHttpClient, {
      filter: D2GroupV2.GroupsForMemberFilter.All,
      groupType: D2GroupV2.GroupType.Clan,
      membershipId,
      membershipType: D2.BungieMembershipType.BungieNext,
    });
  };

  /** Get the definition of an item */
  const getDestinyEntityDefinition = async <T extends TableName>(
    tableName: T,
    hash: number
  ): Promise<EntityTypeToResponseTypeMap[T]> => {
    const key = tableName + '/' + hash;
    return (await definitions.get(key, 'json')) as any;
  };

  /** Get the specific instance of an item */
  const getItem = (
    components: D2.DestinyComponentType[],
    membershipType: D2.BungieMembershipType,
    destinyMembershipId: string,
    itemInstanceId: string
  ) => {
    return D2.getItem(bungieHttpClient, {
      components,
      membershipType,
      destinyMembershipId,
      itemInstanceId,
    });
  };

  const getCollectibleNodeDetails = (params: BungieGetCollectibleNodeDetailsParams) =>
    D2.getCollectibleNodeDetails(bungieHttpClient, params);

  const getCollectiblesByCategory = async (
    hash: CollectiblePresentationNodeHash,
    characterId: string,
    destinyMembershipId: string,
    membershipType: D2.BungieMembershipType
  ) => {
    const details = await D2.getCollectibleNodeDetails(bungieHttpClient, {
      collectiblePresentationNodeHash: hash,
      characterId,
      destinyMembershipId,
      membershipType,
      components: [D2.DestinyComponentType.Collectibles, D2.DestinyComponentType.PresentationNodes],
    });
    const collectiblesData = details.Response.collectibles.data;
    invariant(collectiblesData, 'No collectibles data for hash %s', hash);

    return formatCollectibles(collectiblesData.collectibles);
  };

  const bungieGetVendor = (params: BungieGetVendorParams) =>
    D2.getVendor(bungieHttpClient, {
      ...params,
      components: [D2.DestinyComponentType.VendorCategories, D2.DestinyComponentType.VendorSales],
    });

  const getVendorItems = async (params: BungieGetVendorParams) => {
    const vendorResponse = await bungieGetVendor(params);
    const categoriesData = vendorResponse.Response.categories.data;
    const salesData = vendorResponse.Response.sales.data;
    invariant(categoriesData && salesData, 'Vendor %s is missing required data', params.vendorHash);

    const categoryPromises = categoriesData.categories.map((category) => {
      return category.itemIndexes.map(async (index) => {
        const itemComponent = salesData[index + ''];
        invariant(itemComponent, 'salesData does not contain index %s', index);
        const def = await getDestinyEntityDefinition('DestinyInventoryItemDefinition', itemComponent.itemHash);
        return {
          ...def,
          failureIndexes: itemComponent.failureIndexes,
          saleStatus: getVendorItemStatus(itemComponent.saleStatus),
        };
      });
    });

    return Promise.all(categoryPromises.flat());
  };

  const bungieSearchDestinyPlayerByBungieName = async (searchRequest: D2User.ExactSearchRequest) => {
    return await D2.searchDestinyPlayerByBungieName(
      bungieHttpClient,
      { membershipType: D2.BungieMembershipType.All },
      searchRequest
    );
  };

  const bungieSearchByGlobalNamePost = async (displayNamePrefix: string) => {
    return await D2User.searchByGlobalNamePost(bungieHttpClient, { page: 0 }, { displayNamePrefix });
  };

  const getBnetProfileForBungieName = async (
    bungieName: string
  ): Promise<{
    bnetProfile: D2User.UserInfoCard | null;
    allProfiles: D2User.UserInfoCard[];
  }> => {
    const { displayName, displayNameCode } = validateBungieName(bungieName.toLowerCase());
    try {
      const searchResult = await bungieSearchDestinyPlayerByBungieName({
        displayName,
        displayNameCode,
      });

      const allProfiles = searchResult.Response;
      const firstProfile = allProfiles[0];

      let bnetProfile: D2User.UserInfoCard | null = null;
      if (firstProfile) {
        const profile = await bungieGetLinkedProfiles(firstProfile.membershipId, firstProfile.membershipType, true);
        bnetProfile = profile.Response.bnetMembership || null;
      }

      return { bnetProfile, allProfiles };
    } catch (error) {
      console.error('A funky error occurred', error);
    }

    const searchResult = await bungieSearchByGlobalNamePost(displayName);
    const matchingResult = searchResult.Response.searchResults.find(
      (item) =>
        item.bungieGlobalDisplayName.toLowerCase() === displayName &&
        item.bungieGlobalDisplayNameCode === displayNameCode
    );

    const firstProfile = matchingResult?.destinyMemberships[0];
    if (firstProfile) {
      const profile = await bungieGetLinkedProfiles(firstProfile.membershipId, firstProfile.membershipType, true);
      const bnetProfile = profile.Response.bnetMembership || null;
      return {
        bnetProfile,
        allProfiles: matchingResult.destinyMemberships,
      };
    }

    throw new PublicMessageError('Could not find a user for Bungie name `%s`', bungieName);
  };

  const getActivityHistory = async (params: D2.GetActivityHistoryParams) =>
    await D2.getActivityHistory(bungieHttpClient, params);

  const getLatestActivityForCharacter = async (character: D2.DestinyCharacterComponent) => {
    try {
      const activityHistory = await getActivityHistory({
        characterId: character.characterId,
        destinyMembershipId: character.membershipId,
        membershipType: character.membershipType,
        page: 0,
        count: 1,
        mode: D2.DestinyActivityModeType.None,
      });

      const latestActivity = activityHistory.Response.activities[0];

      if (latestActivity) {
        const activityHash = latestActivity.activityDetails.referenceId;
        const latestActivityDefinition = await getDestinyEntityDefinition('DestinyActivityDefinition', activityHash);

        const activityType = latestActivity.activityDetails.modes
          .map((thing) => interestingActivityModes[thing])
          .filter(isNotNullish)[0];

        return {
          activity: latestActivityDefinition.displayProperties.name,
          activityDate: latestActivity.period,
          activityType,
          activityHash,
          activityModes: latestActivity.activityDetails.modes,
          activityPeriod: latestActivity.period,
        };
      }
    } catch {
      console.error('Could not fetch latest activity for character %s', character.characterId);
    }

    return null;
  };

  const getLinkedProfilesAndValidate = async (membershipId: string) => {
    const linkedProfiles = await bungieGetLinkedProfiles(membershipId, D2.BungieMembershipType.All, true);
    const { bnetMembership, profiles, profilesWithErrors } = linkedProfiles.Response;

    if (!hasAtLeastOneItem(profiles)) {
      if (profilesWithErrors.length > 0) {
        throw new PublicMessageError(
          'No valid Destiny profiles could be found for this user. %s invalid profile%s returned with the following error code%s: %s',
          profilesWithErrors.length,
          profilesWithErrors.length === 1 ? ' was' : 's were',
          profilesWithErrors.length === 1 ? '' : 's',
          profilesWithErrors.map((profile) => '`' + profile.errorCode + '`')
        );
      } else {
        throw new PublicMessageError('No valid Destiny profiles could be found for this user.');
      }
    }

    return { bnetMembership, profiles, profilesWithErrors };
  };

  const getCommonSettings = async () => {
    return await D2Core.getCommonSettings(bungieHttpClient);
  };

  const getDestinyManifest = async () => {
    return await D2.getDestinyManifest(bungieHttpClient);
  };

  const getDestinyManifestComponent = async <T extends D2.DestinyManifestComponentName>(
    params: D2.GetDestinyManifestComponentParams<T>
  ) => {
    return await D2.getDestinyManifestComponent(bungieHttpClient, params);
  };

  return {
    getActivityHistory,
    getBnetProfileForBungieName,
    getBungieNetUserById,
    getCharacter,
    getCollectibleNodeDetails,
    getCollectiblesByCategory,
    getCommonSettings,
    getDestinyEntityDefinition,
    getDestinyManifest,
    getDestinyManifestComponent,
    getGroupsForMember,
    getItem,
    getLatestActivityForCharacter,
    getLinkedProfiles: getLinkedProfilesAndValidate,
    getMembershipDataById,
    getMembershipDataForCurrentUser,
    getProfile,
    getProfileCollectibles,
    getVendorItems,
  };
};
