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

    function getCustomerData(customerId, columns) {
        return search.lookupFields({
            type: search.Type.CUSTOMER,
            id: customerId,
            columns: columns
        });
    }

    function calculateExposure(balance, orderTotal) {
        return (Number(balance) || 0) + (Number(orderTotal) || 0);
    }

    function isCreditLimitExceeded(customerId, orderTotal) {

        const customer = getCustomerData(customerId, [
            'creditlimit',
            'balance'
        ]);

        const creditLimit = Number(customer.creditlimit) || 0;
        const balance = Number(customer.balance) || 0;
        const exposure = calculateExposure(balance, orderTotal);

        return {
            exceeded: creditLimit > 0 && exposure >= creditLimit,
            creditLimit: creditLimit,
            balance: balance,
            exposure: exposure
        };
    }

    function sendHoldEmail(customerId, tranId) {

        const customer = getCustomerData(customerId, [
            'email'
        ]);

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
                'Please contact our accounts team.\n\n' +
                'Thank You.'
        });
    }

    function beforeLoad(context) {

        const form = context.form;
        const rec = context.newRecord;

        const holdField = form.getField({
            id: 'custbody_jj_on_hold'
        });

        if (holdField) {
            holdField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
        }

        if (context.type !== context.UserEventType.VIEW) {
            return;
        }

        if (!rec.getValue('custbody_jj_on_hold')) {
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

        if (context.type !== context.UserEventType.CREATE) {
            return;
        }

        const rec = context.newRecord;

        if (rec.getValue('terms')) {
            return;
        }

        const customerId = rec.getValue('entity');

        if (!customerId) {
            return;
        }

        const result = isCreditLimitExceeded(
            customerId,
            rec.getValue('total')
        );

        if (result.exceeded) {

            rec.setValue({
                fieldId: 'custbody_jj_on_hold',
                value: true
            });

            log.audit({
                title: 'SO On Hold',
                details:
                    'Exposure: ' + result.exposure +
                    ', Credit Limit: ' + result.creditLimit
            });
        }
    }

    function afterSubmit(context) {

        if (context.type !== context.UserEventType.CREATE) {
            return;
        }

        const rec = context.newRecord;

        if (!rec.getValue('custbody_jj_on_hold')) {
            return;
        }

        sendHoldEmail(
            rec.getValue('entity'),
            rec.getValue('tranid')
        );
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});