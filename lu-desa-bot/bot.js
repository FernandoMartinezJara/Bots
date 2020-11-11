// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { MakeReservationDialog } = require('./componentDialogs/makeReservationDialog');

const { CancelReservationDialog } = require('./componentDialogs/cancelReservationDialog');

const { LuisRecognizer, QnAMaker} = require('botbuilder-ai');

class EchoBot extends ActivityHandler {

    constructor(conversationState, userState) {
    
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty("dialogState");

        this.makeReservationDialog = new MakeReservationDialog(this.conversationState, this.userState);
        this.cancelReservationDialog = new CancelReservationDialog(this.conversationState, this.userState);

        this.previousIntent = this.conversationState.createProperty("previousIntent");
        this.conversationData = this.conversationState.createProperty("conservationData");
        
        const luisRecognizer = new LuisRecognizer({
            applicationId : process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint : process.env.LuisEnpoint
        },
        {
            includeAllIntents: true
        },
        true);

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAknowledgebaseId,
            endpointKey: process.env.QnaEnpointKey,
            host: process.env.QnAEndpointHostName

        });

        this.qnaMaker = qnaMaker;

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {

            const luisResult = await luisRecognizer.recognize(context);
            const topIntent = LuisRecognizer.topIntent(luisResult);
            const entities = luisResult.entities;
            await this.dispatchToIntentAsync(context, topIntent, entities);
            await next();
        });

        this.onDialog(async (context, next) =>{
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
           await this.sendWelcomeMessage(context);
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async sendWelcomeMessage(turnContext) {

        const { activity } = turnContext;

        for(const idx in activity.membersAdded){
            if(activity.membersAdded[idx].id !== activity.recipient.id)
            {
                const userName = activity.membersAdded[idx].name;
                const welcomeMessage = `Bienvenido al Bot ${userName}`;
                await turnContext.sendActivity(welcomeMessage);
                await this.sendSuggestedAction(turnContext);
            }
        }
    }

    async sendSuggestedAction(turnContext){
        var actions = ['Hacer una reserva', 'Cancelar reserva'];
        var _suggestedActions = MessageFactory.suggestedActions(actions, 'Elige una opción');
        await turnContext.sendActivity(_suggestedActions);
    }

    async dispatchToIntentAsync(context, intent, entities){
        
        var currentIntent = '';
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        if(previousIntent.intentName && conversationData.endDialog === false){
            currentIntent = previousIntent.intentName;
        }
        else if(previousIntent.intentName && conversationData.endDialog === true){
            currentIntent = intent;
        }
        else if(intent == "None" && !previousIntent.intentName){
            var result = await this.qnaMaker.getAnswers(context);
            await context.sendActivity(`${result[0].answer}`);
            await this.sendSuggestedAction(context);
        }
        else{
            currentIntent = intent;
            await this.previousIntent.set(context, { intentName: intent });
        }

        switch (currentIntent) {

            case 'Crear_Reserva':
                await this.conversationData.set(context, { endDialog:false });
                await this.makeReservationDialog.run(context, this.dialogState, entities);
                conversationData.endDialog = await this.makeReservationDialog.isDialogComplete();

                if(conversationData.endDialog)
                {
                    await this.previousIntent.set(context, { intentName: null });
                    await this.sendSuggestedAction(context);
                }

            break;

            case 'Cancelar_Reserva':
                await this.conversationData.set(context, { endDialog:false });
                await this.cancelReservationDialog.run(context, this.dialogState);
                conversationData.endDialog = await this.cancelReservationDialog.isDialogComplete();

                if(conversationData.endDialog)
                {
                    await this.previousIntent.set(context, { intentName: null });
                    await this.sendSuggestedAction(context);
                }

            break;
        
            default:
                
                break;
        }


    }


}

module.exports.EchoBot = EchoBot;
