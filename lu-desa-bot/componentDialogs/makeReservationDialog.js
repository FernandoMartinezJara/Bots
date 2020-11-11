const {WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');

const {ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt  } = require('botbuilder-dialogs');

const {DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const CHOICE_PROMPT    = 'CHOICE_PROMPT';
const CONFIRM_PROMPT   = 'CONFIRM_PROMPT';
const TEXT_PROMPT      = 'TEXT_PROMPT';
const NUMBER_PROMPT    = 'NUMBER_PROMPT';
const DATETIME_PROMPT  = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class MakeReservationDialog extends ComponentDialog{
    
    constructor(conversationState, userState){
        super('makeReservationDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.noOfParticipantsValidatot));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),  // Ask confirmation if user wants to make reservation?
            this.getName.bind(this),    // Get name from user
            this.getNumberOfParticipants.bind(this),  // Number of participants for reservation
            this.getDate.bind(this), // Date of reservation
            this.getTime.bind(this),  // Time of reservation
            this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to make reservation
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accesor, entities){
        const dialogSet = new DialogSet(accesor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();

        if(results.status === DialogTurnStatus.empty){
            await dialogContext.beginDialog(this.id, entities);
        }
    }

    async firstStep(step){
        if(step._info.options.noPersonas)
            step.values.noOfParticipants = step._info.options.noPersonas[0];
            
        endDialog = false;
        return await step.prompt(CONFIRM_PROMPT, 'Estas seguro de hacer una reserva?');
    }

    async getName(step){
        if(step.result === true){
            return await step.prompt(TEXT_PROMPT, 'Ingrese nombre de la reserva');
        }
        if(step.result === false){
            await step.context.sendActivity('has decidido no avanzar con la reserva');
            endDialog = true;
            return await step.endDialog();
        }
    }

    async getNumberOfParticipants(step){
        step.values.name = step.result

        if(!step.values.noOfParticipants)
            return await step.prompt(NUMBER_PROMPT, 'Cuantos comenzales (1 - 15)');
        else
            return await step.continueDialog();
    }

    async getDate(step){
        if(!step.values.noOfParticipants)
        step.values.noOfParticipants = step.result

        return await step.prompt(DATETIME_PROMPT, 'Ingrese la fecha de reserva: ')
    }

    async getTime(step){
        step.values.date = step.result

        return await step.prompt(DATETIME_PROMPT,'a que hr?');
    }

    async confirmStep(step){
        step.values.time = step.result

        var msg = `Has agregado los sgtes valores Nombre: ${step.values.name} \n Participantes: ${step.values.noOfParticipants}\n Fecha: ${JSON.stringify(step.values.date)}\n Hora: ${JSON.stringify(step.values.time)}`;
        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, 'Estan correctos los datos y confirmas la reserva?', ['Si', 'No']);
    }

    async summaryStep(step){
        if(step.result === true){

            endDialog = true;
            await step.context.sendActivity('Reserva realizada correctamente');
            return await step.endDialog();
        }
    }

    async noOfParticipantsValidator(promptContext){

        return promptContext.recognized.succeded && promptContext.recognized.value > 1 && promptContext.recognized.value < 150;

    }

    async isDialogComplete(){
        return endDialog;
    }


}

module.exports.MakeReservationDialog = MakeReservationDialog;


