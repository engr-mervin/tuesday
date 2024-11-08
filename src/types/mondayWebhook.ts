export interface MondayWebHook {
  event: {
    userId: number;
    originalTriggerUuid: null;
    boardId: number;
    pulseId: number;
    pulseName: string;
    groupId: string;
    groupName: string;
    groupColor: string;
    isTopGroup: boolean;
    columnValues: Record<string, any>;
    app: "monday";
    type: string;
    triggerTime: DateString;
    subscriptionId: number;
    triggerUuid: string;
  };
}

type DateString = string;
