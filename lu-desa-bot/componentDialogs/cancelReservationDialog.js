const {WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');

const {ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt  } = require('botbuilder-dialogs');

const {DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const { CardFactory } = require('botbuilder');

const RestaurantCard = require('../resource/adaptiveCards/RestaurantCard');

const CARDS = [
    RestaurantCard
];

const CHOICE_PROMPT    = 'CHOICE_PROMPT';
const CONFIRM_PROMPT   = 'CONFIRM_PROMPT';
const TEXT_PROMPT      = 'TEXT_PROMPT';
const NUMBER_PROMPT    = 'NUMBER_PROMPT';
const DATETIME_PROMPT  = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class CancelReservationDialog extends ComponentDialog{
    
    constructor(conversationState, userState){
        super('cancelReservationDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),  // Ask confirmation if user wants to make reservation?
            this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to make reservation
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accesor){
        const dialogSet = new DialogSet(accesor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();

        if(results.status === DialogTurnStatus.empty){
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step){

        endDialog = false;
        await step.context.sendActivity({
            text: "Ingrese datos de reserva",
            attachments: [CardFactory.adaptiveCard(CARDS[0])]
        });

        return await step.prompt(TEXT_PROMPT, '');
    }

    async confirmStep(step){
        step.values.reservaNo = step.result

        var msg = `Has ingresado el sgte Numero de reserva: ${step.values.reservaNo}`;
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'Estan correctos los datos, Deseas anular?', ['Si', 'No']);
    }

    async summaryStep(step){
        if(step.result === true){

            endDialog = true;
            await step.context.sendActivity('Reserva realizada correctamente');
            return await step.endDialog();
        }
    }

    async isDialogComplete(){
        return endDialog;
    }
}

module.exports.CancelReservationDialog = CancelReservationDialog;


