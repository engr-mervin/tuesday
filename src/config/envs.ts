export const infraBoardId = Number(process.env.INFRA_BOARD);

export const ENV = {
    INFRA: {
        BOARD_ID: Number(process.env.INFRA_BOARD),
        ROOT_CIDS: {
            CAMPAIGN_BOARD_ID: String(process.env.INFRA_CAMPAIGN_BOARD_ID_CID),
            THEME_BOARD_ID: String(process.env.INFRA_THEME_BOARD_ID_CID),
            CONFIG_BOARD_ID: String(process.env.INFRA_CONFIG_BOARD_ID_CID),
            OFFER_BOARD_ID: String(process.env.INFRA_OFFER_BOARD_ID_CID),
        },
        CIDS: {
            COLUMN_GROUP: String(process.env.INFRA_COLUMN_GROUP_CID),
            PARAMETER_LEVEL: String(process.env.INFRA_PARAMETER_LEVEL_CID),
            FFN: String(process.env.INFRA_FFN_CID),
            COLUMN_ID: String(process.env.INFRA_COLUMN_ID_CID),
        }
    }
}

export const __DEV__ = ['DEV', 'DEVELOPMENT', 'dev', 'development'].includes(process.env.NODE_ENV as string);
