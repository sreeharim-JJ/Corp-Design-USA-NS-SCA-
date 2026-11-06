/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
// /******************************************************************************
// ********
//  * Corp Design-USA-NS/SCA
//  *
//  * ${OTP10741}: ${DEV | OTP |HOLD sales orders (Credit limit automated notifications)}
//  *
//  *
//  ******************************************************************************
// ********
//  *
//  * Author: Jobin and Jismi IT Services
//  *
//  * Date Created : 05-November-2026
//  *
//  * Description : This script is for an automated notification system needs to be implemented for dealer accounts that either reach or exceed the credit limit during order placement, requiring a deposit and/or payment. Additionally, notifications should be sent when the accounts surpass their credit limit. These notifications should be directed to the email addresses of the CSR.
//  * Develop a script to automatically place sales orders on hold during creation, specifically when the customer's credit limit is exceeded. Additionally, send an email notification to the designated recipients when an order is put on hold. Add an "Approve SO" button that is exclusively visible to the intended approvers for approving ON-HOLD sales orders.
//  *
//  * REVISION HISTORY
//  *
//  * @version 2.1  Corp Design-USA-NS/SCA-1 : 05-Novemnber-2026 : Created the initial build by JJ0494
//  *
//  *
//  ******************************************************************************
// *********/

define(['N/search','N/email','N/runtime','N/log','N/ui/serverWidget'
], function (search, email, runtime, log, serverWidget) {

    function getCustomerData(customerId) {
        return search.lookupFields({
            type: search.Type.CUSTOMER,
            id: customerId,
            columns: [
                'creditlimit',
                'balance',
                'email'
            ]
        });
    }

    function beforeLoad(context) {

        const form = context.form;
        const rec = context.newRecord;

        try {
            const holdField = form.getField({
                id: 'custbody_jj_on_hold'
            });

            if (holdField) {
                holdField.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });
            }
        } catch (e) {
            log.error('beforeLoad Error', e);
        }

        if (context.type !== context.UserEventType.VIEW) {
            return;
        }

        const isOnHold = rec.getValue({
            fieldId: 'custbody_jj_on_hold'
        });

        if (!isOnHold) {
            return;
        }

        if (runtime.getCurrentUser().role == 3) {

            form.clientScriptModulePath =
                'SuiteScripts/_jj_cs_HOLD_salesorder.js';

            form.addButton({
                id: 'custpage_jj_approveso',
                label: 'Approve SO',
                functionName: 'approveSO'
            });
        }
    }

    function beforeSubmit(context) {

        if (
            context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT
        ) {
            return;
        }

        try {

            const rec = context.newRecord;

            const customerId = rec.getValue({
                fieldId: 'entity'
            });

            if (!customerId) {
                return;
            }

            const customer = getCustomerData(customerId);

            const creditLimit =
                parseFloat(customer.creditlimit) || 0;

            const balance =
                parseFloat(customer.balance) || 0;

            const orderTotal =
                parseFloat(rec.getValue({
                    fieldId: 'total'
                })) || 0;

            const exposure = balance + orderTotal;

            log.debug({
                title: 'Credit Check',
                details:
                    'Credit Limit=' + creditLimit +
                    ', Balance=' + balance +
                    ', Order Total=' + orderTotal +
                    ', Exposure=' + exposure
            });

            if (
                creditLimit > 0 &&
                exposure >= creditLimit
            ) {

                rec.setValue({
                    fieldId: 'custbody_jj_on_hold',
                    value: true
                });

                log.audit({
                    title: 'Order Put On Hold',
                    details:
                        'Credit Limit=' + creditLimit +
                        ', Exposure=' + exposure
                });

            } else {

                rec.setValue({
                    fieldId: 'custbody_jj_on_hold',
                    value: false
                });
            }

        } catch (e) {
            log.error({
                title: 'beforeSubmit Error',
                details: e
            });
        }
    }

    function afterSubmit(context) {

        if (context.type !== context.UserEventType.CREATE) {
            return;
        }

        try {

            const rec = context.newRecord;

            const isOnHold = rec.getValue({
                fieldId: 'custbody_jj_on_hold'
            });

            if (!isOnHold) {
                return;
            }

            const customerId = rec.getValue({
                fieldId: 'entity'
            });

            const tranId = rec.getValue({
                fieldId: 'tranid'
            });

            const customer = getCustomerData(customerId);

            if (!customer.email) {
                return;
            }

            email.send({
                author: -5,
                recipients: customer.email,
                subject: 'Sales Order On Hold',
                body:
                    'Dear Customer,\n\n' +
                    'Your Sales Order #' + tranId +
                    ' has been placed on HOLD because your credit limit has been reached or exceeded.\n\n' +
                    'Please make the required payment or contact Accounts.\n\n' +
                    'Thank You.'
            });

            log.audit({
                title: 'Hold Email Sent',
                details: customer.email
            });

        } catch (e) {
            log.error({
                title: 'afterSubmit Error',
                details: e
            });
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});