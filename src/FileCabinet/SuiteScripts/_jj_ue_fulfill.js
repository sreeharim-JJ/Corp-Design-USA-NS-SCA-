/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/error', 'N/log'],

function(search, error, log) {

    function beforeSubmit(context) {

        if (context.type !== context.UserEventType.CREATE) {
            return;
        }

        var fulfillmentRec = context.newRecord;

        var soId = fulfillmentRec.getValue({
            fieldId: 'createdfrom'
        });

        if (!soId) {
            return;
        }

        var soInfo = search.lookupFields({
            type: search.Type.SALES_ORDER,
            id: soId,
            columns: [
                'custbody_jj_on_hold',
                'tranid'
            ]
        });

        if (soInfo.custbody_jj_on_hold) {

            throw error.create({
                name: 'SO_ON_HOLD',
                message:
                    'This Sales Order is currently ON HOLD and cannot be fulfilled until approved.',
                notifyOff: false
            });
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };

});