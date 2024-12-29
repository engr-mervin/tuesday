export const CAMPAIGN_NAME_REGEX = /[^a-zA-Z0-9 .(),:;!&*#+–\-\_\[\]]/g;
export const PARAM_REGEX = /(\n|\r|\|)/g;

export const BANNER_REGEX = {
  GUID: /^-1$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  HOUR: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
};

export const HOLOGRAM_REGEX = /^[a-zA-Z0-9-]*$/;
