import * as Promise from 'bluebird';
import { IAddress, IIdentity, IMessage, Message, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import { IDialogTestStep } from './IDialogTestStep';
import { addressIsComposedOfOther, convertStringToMessage, convertStringArrayToMessageArray, convertStringArrayTo2DMessageArray, convert2DStringArrayTo2DMessageArray, is2DArray, compareMessageWtihExpectedMessages} from './utils';
const expect = chai.expect;

export function SendMessageToBotDialogStepClassCreator(
    sendMessageToBot: (message: IMessage | string, address?: IAddress) => any,
    setBotToUserMessageChecker: (newMessageChecker: (msg: IMessage | IMessage[]) => any) => any,
    defaultAddress?: IAddress) {
    return class SendMessageToBotDialogStep implements IDialogTestStep {
        private message: IMessage;
        private expectedResponses: IMessage[][];

        // for now, let the response only be in the form of a string. It can be abstracted later
        constructor(
            msg: IMessage | string,
            expectedResponses?: string | string[] | string[][] | IMessage | IMessage[] | IMessage[][],
            address?: IAddress
        ) {
            address = address || defaultAddress;

            if (typeof(msg) === 'string' && !defaultAddress && !address) {
                throw new Error('if message is a string, an address must be provided');
            }

            this.message = typeof(msg) === 'string' ? convertStringToMessage(msg, address) : msg as IMessage;

            if (typeof(expectedResponses) === 'string') {
                expectedResponses = [[expectedResponses]];
            } else if (expectedResponses instanceof Array) {
                if (expectedResponses.length > 0 && typeof(expectedResponses) === 'string') {
                    expectedResponses = [expectedResponses];
                }
            }

            // allow undef if it is not provided
            // expectedResponses && expectedResponses as string[][];
            this.expectedResponses = this.convertExpectedResponsesParameterTo2DIMessageArray(expectedResponses, address);
        }

        public execute(): Promise<any> {
            return new Promise((res: () => void, rej: (error: Error) => void) => {
                setBotToUserMessageChecker((messages: IMessage | IMessage[]) => {
                    if (!this.expectedResponses || !this.expectedResponses.length) {
                        return res();
                    }

                    if (!(messages instanceof Array)) {
                        messages = [messages];
                    }

                    messages.forEach((msg: IMessage) => {
                        if (msg.type === 'save') {
                            return res();
                        }

                        const currentExpectedResponseCollection = this.expectedResponses.shift();

                        /*
                        const expectedAddress = currentExpectedResponseCollection[0].address;
                        const expctedResponseStrings = currentExpectedResponseCollection.map((r: IMessage) => r.text);

                        try {
                            const errorStringExpectedResponseText =
                                expctedResponseStrings.length > 1 ? `one of ${expctedResponseStrings}` : expctedResponseStrings[0];
                            const errorString =
                                `Bot should have responded with '${errorStringExpectedResponseText}', but was '${msg.text}`;

                            expect(expctedResponseStrings, errorString).to.include(msg.text);*/
                        try {
                            compareMessageWtihExpectedMessages(msg, currentExpectedResponseCollection);
                        } catch (e) {
                            return rej(e);
                        }

                    });

                    if (!this.expectedResponses.length) {
                        res();
                    }
                });

                sendMessageToBot(this.message);
            });
        }

        // if the insepcted address does not have a field defined, it ignores it on the next object
        // private addressIsComposedOfOther(inspectedAddress: IAddress, otherAddress: IAddress): boolean {
            // const identityIsComposedofOther = (id: IIdentity, otherId: IIdentity) => {
            //     return (!id.id || id.id === otherId.id) && (!id.name || id.name === otherId.name);
            // };

        //     // if field is undef, do not check other for equivalencty
        //     const botMatches = !inspectedAddress.bot || identityIsComposedofOther(inspectedAddress.bot, otherAddress.bot);
        //     const channelIdMatches = !inspectedAddress.channelId || inspectedAddress.channelId === otherAddress.channelId;
        //     const userMatches = !inspectedAddress.user || identityIsComposedofOther(inspectedAddress.user, otherAddress.user);
        //     const convoMatches = !inspectedAddress.conversation ||
        //         identityIsComposedofOther(inspectedAddress.conversation, otherAddress.conversation);

        //     return botMatches && channelIdMatches && userMatches && convoMatches;
        // }

        private convertExpectedResponsesParameterTo2DIMessageArray(
            expectedResponses: string | string[] | string[][] | IMessage | IMessage[] | IMessage[][], address: IAddress) : IMessage[][] {

            expectedResponses = expectedResponses || [] as IMessage[][];

            if (is2DArray(expectedResponses)) {
                const responses = (expectedResponses as Array<Array<any>>);
                if (typeof(responses[0][0]) === 'string') {
                    expectedResponses = convert2DStringArrayTo2DMessageArray(expectedResponses as string[][], address);
                }

            } else if (expectedResponses instanceof Array && expectedResponses.length && typeof(expectedResponses[0]) === 'string') {
                expectedResponses = convertStringArrayTo2DMessageArray(expectedResponses as string[], address);
            }

            return expectedResponses as IMessage[][];
        }
    };
}
